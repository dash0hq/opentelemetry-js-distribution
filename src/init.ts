// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind, trace } from '@opentelemetry/api';
import { getNodeAutoInstrumentations, getResourceDetectors } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { containerDetector } from '@opentelemetry/resource-detector-container';
import { Detector, DetectorSync, envDetector, hostDetector, processDetector, Resource } from '@opentelemetry/resources';
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

if (process.env.DASH0_DEBUG) {
  console.log('Dash0 OpenTelemetry distribution for Node.js: NodeSDK started.');
}
