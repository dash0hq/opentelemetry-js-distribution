// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind, trace } from '@opentelemetry/api';
import { getNodeAutoInstrumentations, getResourceDetectors } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { containerDetector } from '@opentelemetry/resource-detector-container';
import { Detector, DetectorSync, envDetector, hostDetector, processDetector, Resource } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';

import { version } from '../package.json';

import PodUidDetector from './detectors/node/opentelemetry-resource-detector-kubernetes-pod';
import ServiceNameFallbackDetector from './detectors/node/opentelemetry-resource-detector-service-name-fallback';
import { FileSpanExporter } from './util/FileSpanExporter';

if (process.env.DASH0_DEBUG) {
  console.log('Dash0 OpenTelemetry distribution for Node.js: Starting NodeSDK.');
}

let sdkShutdownHasBeenCalled = false;

let baseUrl = 'http://dash0-operator-opentelemetry-collector.dash0-operator-system.svc.cluster.local:4318';
if (process.env.DASH0_OTEL_COLLECTOR_BASE_URL) {
  baseUrl = process.env.DASH0_OTEL_COLLECTOR_BASE_URL;
}

const instrumentationConfig: any = {};
if (
  !process.env.DASH0_ENABLE_FS_INSTRUMENTATION ||
  process.env.DASH0_ENABLE_FS_INSTRUMENTATION.trim().toLowerCase() !== 'true'
) {
  instrumentationConfig['@opentelemetry/instrumentation-fs'] = {
    enabled: false,
  };
}

const spanProcessors: SpanProcessor[] = [
  new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: `${baseUrl}/v1/traces`,
    }),
  ),
];

const logRecordProcessor = new BatchLogRecordProcessor(
  new OTLPLogExporter({
    url: `${baseUrl}/v1/logs`,
  }),
);

if (process.env.DASH0_DEBUG_PRINT_SPANS != null) {
  if (process.env.DASH0_DEBUG_PRINT_SPANS.toLocaleLowerCase() === 'true') {
    spanProcessors.push(new BatchSpanProcessor(new ConsoleSpanExporter()));
  } else {
    spanProcessors.push(new BatchSpanProcessor(new FileSpanExporter(process.env.DASH0_DEBUG_PRINT_SPANS)));
  }
}

const configuration: Partial<NodeSDKConfiguration> = {
  spanProcessors: spanProcessors,

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${baseUrl}/v1/metrics`,
    }),
  }),

  logRecordProcessor,

  instrumentations: [getNodeAutoInstrumentations(instrumentationConfig)],

  resource: new Resource({
    'telemetry.distro.name': 'dash0-nodejs',
    'telemetry.distro.version': version,
  }),
};

// Copy the behavior of the NodeSDK constructor with regard to resource detectors, but add the pod uid detector.
// https://github.com/open-telemetry/opentelemetry-js/blob/73fddf9b5e7a93bd4cf21c2dbf444cee31d26c88/experimental/packages/opentelemetry-sdk-node/src/sdk.ts#L126-L132
let detectors: (Detector | DetectorSync)[];
if (process.env.OTEL_NODE_RESOURCE_DETECTORS != null) {
  detectors = getResourceDetectors();
} else {
  detectors = [envDetector, processDetector, containerDetector, hostDetector];
}
detectors.push(new PodUidDetector());
detectors.push(new ServiceNameFallbackDetector());
configuration.resourceDetectors = detectors;

const sdk = new NodeSDK(configuration);

sdk.start();

if (process.env.DASH0_BOOTSTRAP_SPAN != null) {
  const tracer = trace.getTracer('dash0-nodejs-distribution');
  tracer //
    .startSpan(process.env.DASH0_BOOTSTRAP_SPAN, {
      root: true,
      kind: SpanKind.INTERNAL,
    })
    .end();
}

if (process.env.DASH0_FLUSH_ON_SIGTERM_SIGINT && process.env.DASH0_FLUSH_ON_SIGTERM_SIGINT.toLowerCase() === 'true') {
  ['SIGTERM', 'SIGINT'].forEach(signal => {
    process.once(signal, onProcessExit.bind(null, true));
  });
}

if (
  !process.env.DASH0_FLUSH_ON_EMPTY_EVENT_LOOP ||
  process.env.DASH0_FLUSH_ON_EMPTY_EVENT_LOOP.toLowerCase() !== 'false'
) {
  process.once('beforeExit', onProcessExit.bind(null, false));
}

if (process.env.DASH0_DEBUG) {
  console.log('Dash0 OpenTelemetry distribution for Node.js: NodeSDK started.');
}

async function onProcessExit(callProcessExit: boolean) {
  await executePromiseWithTimeout(gracefulSdkShutdown(callProcessExit), 500, callProcessExit);
}

async function gracefulSdkShutdown(callProcessExit: boolean) {
  try {
    if (sdkShutdownHasBeenCalled) {
      if (callProcessExit) {
        process.exit(0);
      }
      return;
    }

    sdkShutdownHasBeenCalled = true;
    await sdk.shutdown();

    if (process.env.DASH0_DEBUG) {
      console.log('Dash0 OpenTelemetry distribution for Node.js: OpenTelemetry SDK has been shut down successfully.');
    }
  } catch (err) {
    console.error('Dash0 OpenTelemetry distribution for Node.js: Error shutting down the OpenTelemetry SDK:', err);
  } finally {
    if (callProcessExit) {
      process.exit(0);
    }
  }
}

function executePromiseWithTimeout(promise: Promise<any>, timeoutMillis: number, callProcessExit: boolean) {
  let setTimeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise(resolve => {
    setTimeoutId = setTimeout(() => {
      resolve(null);
    }, timeoutMillis);
  });

  return Promise.race([
    //
    promise,
    timeoutPromise,
  ]).finally(() => {
    if (setTimeoutId) {
      clearTimeout(setTimeoutId);
    }
    if (callProcessExit) {
      process.exit(0);
    }
  });
}
