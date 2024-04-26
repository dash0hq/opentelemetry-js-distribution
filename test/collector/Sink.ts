// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { ExportLogsServiceRequest } from './types/opentelemetry/proto/collector/logs/v1/logs_service';
import { ExportMetricsServiceRequest } from './types/opentelemetry/proto/collector/metrics/v1/metrics_service';
import { ExportTraceServiceRequest } from './types/opentelemetry/proto/collector/trace/v1/trace_service';

export interface OpenTelemetryData {
  traces: ExportTraceServiceRequest[];
  metrics: ExportMetricsServiceRequest[];
  logs: ExportLogsServiceRequest[];
}

export interface Stats {
  traces: number;
  metrics: number;
  logs: number;
}

export default class Sink {
  telemetry: OpenTelemetryData;

  static MAX_ITEMS = 3000;

  constructor() {
    this.telemetry = {
      traces: [],
      metrics: [],
      logs: [],
    };
  }

  addTraces(traces: ExportTraceServiceRequest) {
    if (this.telemetry.traces.length > Sink.MAX_ITEMS) {
      throw new Error('Too many traces, please clear the mock collector between test runs.');
    }
    this.telemetry.traces.push(traces);
  }

  addMetrics(metrics: ExportMetricsServiceRequest) {
    if (this.telemetry.metrics.length > Sink.MAX_ITEMS) {
      throw new Error('Too many traces, please clear the mock collector between test runs.');
    }

    this.telemetry.metrics.push(metrics);
  }

  addLogs(logs: ExportLogsServiceRequest) {
    if (this.telemetry.logs.length > Sink.MAX_ITEMS) {
      throw new Error('Too many traces, please clear the mock collector between test runs.');
    }
    this.telemetry.logs.push(logs);
  }

  stats(): Stats {
    return {
      traces: this.telemetry.traces.length,
      metrics: this.telemetry.metrics.length,
      logs: this.telemetry.logs.length,
    };
  }

  getTelemetry(): OpenTelemetryData {
    return this.telemetry;
  }

  printStats() {
    console.log(JSON.stringify(this.stats(), null, 2));
  }

  printDetails() {
    console.log(JSON.stringify(this.telemetry, null, 2));
  }
}
