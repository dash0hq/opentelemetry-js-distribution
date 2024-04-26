// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { loadPackageDefinition, sendUnaryData, Server, ServerCredentials, ServerUnaryCall } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { promisify } from 'node:util';

import AbstractServer from './AbstractServer';
import Sink from './Sink';
import {
  ExportLogsServiceRequest,
  ExportLogsServiceResponse,
} from './types/opentelemetry/proto/collector/logs/v1/logs_service';
import {
  ExportMetricsServiceRequest,
  ExportMetricsServiceResponse,
} from './types/opentelemetry/proto/collector/metrics/v1/metrics_service';
import {
  ExportTraceServiceRequest,
  ExportTraceServiceResponse,
} from './types/opentelemetry/proto/collector/trace/v1/trace_service';
import { readPort } from './util';

const port = readPort('OTEL_OTLP_GRCP_PORT', 4317);

const PROTO_DIR = path.join(__dirname, '/opentelemetry-proto');
const TRACE_PROTO_PATH = 'opentelemetry/proto/collector/trace/v1/trace_service.proto';
const METRICS_PROTO_PATH = 'opentelemetry/proto/collector/metrics/v1/metrics_service.proto';
const LOGS_PROTO_PATH = 'opentelemetry/proto/collector/logs/v1/logs_service.proto';

const traceServicePackage = loadServicePackage(TRACE_PROTO_PATH, 'trace');
const metricsServicePackage = loadServicePackage(METRICS_PROTO_PATH, 'metrics');
const logsServicePackage = loadServicePackage(LOGS_PROTO_PATH, 'logs');

function loadServicePackage(serviceProtoPath: string, packageName: string): any {
  const packageDefinition = protoLoader.loadSync(serviceProtoPath, {
    defaults: true,
    includeDirs: [PROTO_DIR],
    keepCase: true,
    longs: String,
    oneofs: true,
  });
  const protoDescriptor = loadPackageDefinition(packageDefinition);
  // @ts-expect-error the package definition is not correctly typed
  return protoDescriptor.opentelemetry.proto.collector[packageName].v1;
}

export default class GrpcServer extends AbstractServer {
  constructor(bindAddress: string, sink: Sink) {
    super(bindAddress, sink);
  }

  async start() {
    const server = new Server();
    server.addService(traceServicePackage.TraceService.service, {
      Export: this.receiveTraces.bind(this),
    });
    server.addService(metricsServicePackage.MetricsService.service, {
      Export: this.receiveMetrics.bind(this),
    });
    server.addService(logsServicePackage.LogsService.service, {
      Export: this.receiveLogs.bind(this),
    });

    const addressWithPort = `${this.bindAddress}:${port}`;
    const serverBindAsync = <(s: string, c: ServerCredentials) => Promise<number>>(
      promisify(server.bindAsync).bind(server)
    );
    await serverBindAsync(addressWithPort, ServerCredentials.createInsecure());
    console.log(`listening for gRPC traffic on ${addressWithPort}`);
  }

  receiveTraces(
    call: ServerUnaryCall<ExportTraceServiceRequest, ExportTraceServiceResponse>,
    callback: sendUnaryData<ExportTraceServiceResponse>,
  ) {
    const traces: ExportTraceServiceRequest = call.request;
    this.sink.addTraces(traces);
    callback(
      null,
      ExportTraceServiceResponse.fromJSON({
        partialSuccess: {
          rejectedSpans: 0,
        },
      }),
    );
  }

  receiveMetrics(
    call: ServerUnaryCall<ExportMetricsServiceRequest, ExportMetricsServiceResponse>,
    callback: sendUnaryData<ExportMetricsServiceResponse>,
  ) {
    const metrics: ExportMetricsServiceRequest = call.request;
    this.sink.addMetrics(metrics);
    callback(
      null,
      ExportMetricsServiceResponse.fromJSON({
        partialSuccess: {
          rejectedMetrics: 0,
        },
      }),
    );
  }

  receiveLogs(
    call: ServerUnaryCall<ExportLogsServiceRequest, ExportLogsServiceResponse>,
    callback: sendUnaryData<ExportLogsServiceResponse>,
  ) {
    const logs: ExportLogsServiceRequest = call.request;
    this.sink.addLogs(logs);
    callback(
      null,
      ExportLogsServiceResponse.fromJSON({
        partialSuccess: {
          rejectedLogs: 0,
        },
      }),
    );
  }
}
