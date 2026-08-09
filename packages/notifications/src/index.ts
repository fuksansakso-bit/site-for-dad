import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createConnection, type Socket } from 'node:net';
import { z } from 'zod';

const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email()
  .refine((value) => !/[\r\n]/.test(value));

export interface EmailMessage {
  readonly recipient: string;
  readonly subject: string;
  readonly text: string;
}

export interface EmailDeliveryPort {
  checkReadiness(): Promise<'ok' | 'unavailable'>;
  send(message: EmailMessage): Promise<void>;
}

export interface SmtpEmailDeliveryConfig {
  readonly fromAddress: string;
  readonly fromName: string;
  readonly host: '127.0.0.1' | '::1';
  readonly port: number;
  readonly timeoutMs: number;
}

export class EmailDeliveryError extends Error {
  readonly code: 'EMAIL_DELIVERY_INVALID' | 'EMAIL_DELIVERY_UNAVAILABLE';

  constructor(code: EmailDeliveryError['code']) {
    super(code);
    this.name = 'EmailDeliveryError';
    this.code = code;
  }
}

function encryptionKey(secret: string): Buffer {
  if (secret.length < 32) throw new EmailDeliveryError('EMAIL_DELIVERY_INVALID');
  return createHash('sha256').update('project-name:phase1f:delivery:').update(secret).digest();
}

export function sealEmailMessage(message: EmailMessage, secret: string): string {
  const normalized: EmailMessage = {
    recipient: emailAddressSchema.parse(message.recipient),
    subject: z.string().trim().min(1).max(160).parse(message.subject),
    text: z.string().min(1).max(8_000).parse(message.text),
  };
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(normalized), 'utf8'),
    cipher.final(),
  ]);
  return `em1.${nonce.toString('base64url')}.${ciphertext.toString('base64url')}.${cipher
    .getAuthTag()
    .toString('base64url')}`;
}

export function openEmailMessage(sealed: string, secret: string): EmailMessage {
  const match = /^em1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(sealed);
  if (match === null) throw new EmailDeliveryError('EMAIL_DELIVERY_INVALID');
  try {
    const nonce = Buffer.from(match[1] ?? '', 'base64url');
    const ciphertext = Buffer.from(match[2] ?? '', 'base64url');
    const tag = Buffer.from(match[3] ?? '', 'base64url');
    if (nonce.length !== 12 || tag.length !== 16) {
      throw new EmailDeliveryError('EMAIL_DELIVERY_INVALID');
    }
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), nonce);
    decipher.setAuthTag(tag);
    const candidate = JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'),
    ) as unknown;
    const parsed = z
      .object({
        recipient: emailAddressSchema,
        subject: z.string().trim().min(1).max(160),
        text: z.string().min(1).max(8_000),
      })
      .strict()
      .parse(candidate);
    return parsed;
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    throw new EmailDeliveryError('EMAIL_DELIVERY_INVALID');
  }
}

function readSmtpResponse(socket: Socket, timeoutMs: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timeout = setTimeout(() => finish(new Error('SMTP timeout')), timeoutMs);
    timeout.unref();
    function finish(error?: Error, code?: number): void {
      clearTimeout(timeout);
      socket.off('data', onData);
      socket.off('error', onError);
      if (error !== undefined) reject(error);
      else resolve(code ?? 0);
    }
    function onError(error: Error): void {
      finish(error);
    }
    function onData(chunk: Buffer): void {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1);
      const match = /^(\d{3}) /.exec(last ?? '');
      if (match !== null) finish(undefined, Number(match[1]));
    }
    socket.on('data', onData);
    socket.on('error', onError);
  });
}

async function expectCode(socket: Socket, timeoutMs: number, expected: number): Promise<void> {
  const code = await readSmtpResponse(socket, timeoutMs);
  if (code !== expected) throw new Error(`SMTP ${code}`);
}

function writeCommand(socket: Socket, value: string): void {
  socket.write(`${value}\r\n`);
}

export function createSmtpEmailDeliveryPort(config: SmtpEmailDeliveryConfig): EmailDeliveryPort {
  const fromAddress = emailAddressSchema.parse(config.fromAddress);
  const fromName = z.string().trim().min(1).max(80).parse(config.fromName);
  if (!Number.isSafeInteger(config.port) || config.port < 1 || config.port > 65_535) {
    throw new EmailDeliveryError('EMAIL_DELIVERY_INVALID');
  }

  async function withSocket(operation: (socket: Socket) => Promise<void>): Promise<void> {
    const socket = createConnection({ host: config.host, port: config.port });
    socket.setTimeout(config.timeoutMs);
    try {
      await operation(socket);
    } catch {
      throw new EmailDeliveryError('EMAIL_DELIVERY_UNAVAILABLE');
    } finally {
      socket.destroy();
    }
  }

  return {
    async checkReadiness() {
      try {
        await withSocket(async (socket) => {
          await expectCode(socket, config.timeoutMs, 220);
          writeCommand(socket, 'QUIT');
        });
        return 'ok';
      } catch {
        return 'unavailable';
      }
    },
    async send(message) {
      const recipient = emailAddressSchema.parse(message.recipient);
      const subject = z.string().trim().min(1).max(160).parse(message.subject);
      const body = z.string().min(1).max(8_000).parse(message.text);
      await withSocket(async (socket) => {
        await expectCode(socket, config.timeoutMs, 220);
        writeCommand(socket, 'EHLO project-name.local');
        await expectCode(socket, config.timeoutMs, 250);
        writeCommand(socket, `MAIL FROM:<${fromAddress}>`);
        await expectCode(socket, config.timeoutMs, 250);
        writeCommand(socket, `RCPT TO:<${recipient}>`);
        await expectCode(socket, config.timeoutMs, 250);
        writeCommand(socket, 'DATA');
        await expectCode(socket, config.timeoutMs, 354);
        const safeBody = body.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
        socket.write(
          [
            `From: ${fromName} <${fromAddress}>`,
            `To: <${recipient}>`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=utf-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            safeBody,
            '.',
            '',
          ].join('\r\n'),
        );
        await expectCode(socket, config.timeoutMs, 250);
        writeCommand(socket, 'QUIT');
      });
    },
  };
}

export function normalizeEmailAddress(value: string): string {
  return emailAddressSchema.parse(value);
}
