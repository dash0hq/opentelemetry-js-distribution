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

import PodUidDetector from './detectors/node/opentelemetry-resource-detector-kubernetes-pod';
import ServiceNameFallbackDetector from './detectors/node/opentelemetry-resource-detector-service-name-fallback';
import { FileSpanExporter } from './util/FileSpanExporter';
import { hasOptedIn, hasOptedOut, parseNumericEnvironmentVariableWithDefault } from './util/environment';

const logPrefix = 'Dash0 OpenTelemetry distribution for Node.js:';
const debugOutput = hasOptedIn('DASH0_DEBUG');

let packageJson;
let version: string;
try {
  // In the published package, the transpiled JS files are in dist/src/init.js, therefore the relative path to
  // package.json is two levels above the directory of init.js.
  packageJson = require('../../package.json');
} catch (e1) {
  try {
    // In development, the directory is just src, therefore the relative path to package.json is only one level above.
    packageJson = require('../package.json');
  } catch (e2) {
    printDebugStderr(
      'Unable to find our own package.json file, will not transmit telemetry.distro.version. This warning can be safely ignored.',
      e1,
      e1,
    );
  }
}
// Since we read the package.json from two possible relative paths, we are extra-careful to make sure we actually are
// reading from our own package.json file, hence the name check.
if (packageJson && packageJson.name === '@dash0hq/opentelemetry') {
  version = packageJson.version;
} else {
  printDebugStderr(
    `Unexpected package name in our own package.json: ${packageJson.name}, will not transmit telemetry.distro.version. This warning can be safely ignored.`,
  );
}

printDebugStdout('Starting NodeSDK.');

let sdkShutdownHasBeenCalled = false;

let baseUrl = 'http://dash0-operator-opentelemetry-collector.dash0-operator-system.svc.cluster.local:4318';
if (process.env.DASH0_OTEL_COLLECTOR_BASE_URL) {
  baseUrl = process.env.DASH0_OTEL_COLLECTOR_BASE_URL;
}

const configuration: Partial<NodeSDKConfiguration> = {
  spanProcessors: spanProcessors(),
  metricReader: metricsReader(),
  logRecordProcessor: logRecordProcessor(),
  instrumentations: [getNodeAutoInstrumentations(createInstrumentationConfig())],
  resource: resource(),
  resourceDetectors: resourceDetectors(),
};

const sdk = new NodeSDK(configuration);

sdk.start();

createBootstrapSpanIfRequested();
installProcessExitHandlers();

printDebugStdout('NodeSDK started.');

function spanProcessors(): SpanProcessor[] {
  const spanProcessors: SpanProcessor[] = [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: `${baseUrl}/v1/traces`,
      }),
    ),
  ];

  if (process.env.DASH0_DEBUG_PRINT_SPANS != null) {
    if (process.env.DASH0_DEBUG_PRINT_SPANS.toLowerCase() === 'true') {
      spanProcessors.push(new BatchSpanProcessor(new ConsoleSpanExporter()));
    } else {
      spanProcessors.push(new BatchSpanProcessor(new FileSpanExporter(process.env.DASH0_DEBUG_PRINT_SPANS)));
    }
  }
  return spanProcessors;
}

function metricsReader(): PeriodicExportingMetricReader {
  // Implement support for config of metric export timeout/interval via environment variables here in the distribution
  // until https://github.com/open-telemetry/opentelemetry-js/issues/4655 has been implemented.
  // The default values are taken from
  // https://github.com/open-telemetry/opentelemetry-js/blob/812c774998fb60a0c666404ae71b1d508e0568f4/packages/sdk-metrics/src/export/PeriodicExportingMetricReader.ts#L97-L98
  const exportIntervalMillis = parseNumericEnvironmentVariableWithDefault('OTEL_METRIC_EXPORT_INTERVAL', 60000);
  const exportTimeoutMillis = parseNumericEnvironmentVariableWithDefault('OTEL_METRIC_EXPORT_TIMEOUT', 30000);

  return new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${baseUrl}/v1/metrics`,
    }),
    exportIntervalMillis,
    exportTimeoutMillis,
  });
}

function logRecordProcessor() {
  return new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: `${baseUrl}/v1/logs`,
    }),
  );
}

function createInstrumentationConfig(): any {
  const instrumentationConfig: any = {};
  if (!hasOptedIn('DASH0_ENABLE_FS_INSTRUMENTATION')) {
    instrumentationConfig['@opentelemetry/instrumentation-fs'] = {
      enabled: false,
    };
  }
  return instrumentationConfig;
}

function resource() {
  const distroResourceAttributes: any = {
    'telemetry.distro.name': 'dash0-nodejs',
  };
  if (version) {
    distroResourceAttributes['telemetry.distro.version'] = version;
  }
  return new Resource(distroResourceAttributes);
}

function resourceDetectors(): (Detector | DetectorSync)[] {
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
  return detectors;
}

function createBootstrapSpanIfRequested() {
  if (process.env.DASH0_BOOTSTRAP_SPAN != null) {
    const tracer = trace.getTracer('dash0-nodejs-distribution');
    tracer //
      .startSpan(process.env.DASH0_BOOTSTRAP_SPAN, {
        root: true,
        kind: SpanKind.INTERNAL,
      })
      .end();
  }
}

function installProcessExitHandlers() {
  if (hasOptedIn('DASH0_FLUSH_ON_SIGTERM_SIGINT')) {
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.once(signal, onProcessExit.bind(null, true));
    });
  }

  if (!hasOptedOut('DASH0_FLUSH_ON_EMPTY_EVENT_LOOP')) {
    process.once('beforeExit', onProcessExit.bind(null, false));
  }
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

    printDebugStdout('OpenTelemetry SDK has been shut down successfully.');
  } catch (err) {
    console.error(logPrefix, 'Error shutting down the OpenTelemetry SDK:', err);
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

function printDebugStdout(message: string, ...additional: any[]) {
  if (debugOutput) {
    console.log(logPrefix, message, ...additional);
  }
}

function printDebugStderr(message: string, ...additional: any[]) {
  if (debugOutput) {
    console.error(logPrefix, message, ...additional);
  }
}
