import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { ObservabilityEnvironment } from '@project-name/config/server';

export interface NodeTelemetryRuntime {
  readonly exportEnabled: boolean;
  shutdown(): Promise<void>;
}

const headerNamePattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export function parseOtlpHeaders(candidate?: string): Readonly<Record<string, string>> {
  if (candidate === undefined) return {};
  const entries = candidate.split(',').map((entry) => entry.trim());
  const headers: Record<string, string> = {};
  for (const entry of entries) {
    const separator = entry.indexOf('=');
    if (separator < 1) throw new TypeError('OTLP header configuration is invalid.');
    const name = entry.slice(0, separator).trim();
    const encodedValue = entry.slice(separator + 1).trim();
    if (!headerNamePattern.test(name) || encodedValue.length === 0) {
      throw new TypeError('OTLP header configuration is invalid.');
    }
    let value: string;
    try {
      value = decodeURIComponent(encodedValue);
    } catch {
      throw new TypeError('OTLP header configuration is invalid.');
    }
    if (/\r|\n/.test(value)) throw new TypeError('OTLP header configuration is invalid.');
    headers[name] = value;
  }
  return headers;
}

export function otlpSignalEndpoint(baseEndpoint: string, signal: 'metrics' | 'traces'): string {
  const normalized = baseEndpoint.endsWith('/') ? baseEndpoint : `${baseEndpoint}/`;
  return new URL(`v1/${signal}`, normalized).toString();
}

export function initializeNodeTelemetry(
  environment: ObservabilityEnvironment,
  serviceName: string,
): NodeTelemetryRuntime {
  if (environment.OTEL_EXPORTER_OTLP_ENDPOINT === undefined) {
    return { exportEnabled: false, shutdown: () => Promise.resolve() };
  }
  const headers = parseOtlpHeaders(environment.OTEL_EXPORTER_OTLP_HEADERS);
  const metricReader = new PeriodicExportingMetricReader({
    cardinalityLimits: { default: 128 },
    exportIntervalMillis: 60_000,
    exportTimeoutMillis: 10_000,
    exporter: new OTLPMetricExporter({
      headers,
      url: otlpSignalEndpoint(environment.OTEL_EXPORTER_OTLP_ENDPOINT, 'metrics'),
    }),
  });
  const sdk = new NodeSDK({
    autoDetectResources: false,
    metricReaders: [metricReader],
    serviceName,
    traceExporter: new OTLPTraceExporter({
      headers,
      url: otlpSignalEndpoint(environment.OTEL_EXPORTER_OTLP_ENDPOINT, 'traces'),
    }),
  });
  sdk.start();
  return { exportEnabled: true, shutdown: () => sdk.shutdown() };
}
