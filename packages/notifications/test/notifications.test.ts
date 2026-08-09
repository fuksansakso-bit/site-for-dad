import { describe, expect, it } from 'vitest';

import { openEmailMessage, sealEmailMessage } from '../src/index.js';

const secret = 'phase1f-test-signing-key-with-at-least-32-bytes';

describe('sealed email delivery payloads', () => {
  it('round-trips a message without storing the code or recipient in plaintext', () => {
    const message = {
      recipient: 'staff@example.test',
      subject: 'Код входа',
      text: 'Одноразовый код: 123456',
    };
    const sealed = sealEmailMessage(message, secret);

    expect(sealed).not.toContain(message.recipient);
    expect(sealed).not.toContain('123456');
    expect(openEmailMessage(sealed, secret)).toEqual(message);
  });

  it('rejects tampering and header-injection addresses', () => {
    const sealed = sealEmailMessage(
      { recipient: 'staff@example.test', subject: 'Приглашение', text: 'Безопасный текст' },
      secret,
    );
    expect(() => openEmailMessage(`${sealed.slice(0, -1)}x`, secret)).toThrow();
    expect(() =>
      sealEmailMessage(
        {
          recipient: 'staff@example.test\r\nBcc: attacker@example.test',
          subject: 'Код',
          text: 'Текст',
        },
        secret,
      ),
    ).toThrow();
  });
});
