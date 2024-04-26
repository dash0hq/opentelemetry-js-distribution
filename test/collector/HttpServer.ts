// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import http, { IncomingMessage, ServerResponse } from 'node:http';
import { promisify } from 'node:util';
import { Reader } from 'protobufjs/minimal';

import AbstractServer from './AbstractServer';
import Sink from './Sink';
import { ExportLogsServiceRequest } from './types/opentelemetry/proto/collector/logs/v1/logs_service';
import { ExportMetricsServiceRequest } from './types/opentelemetry/proto/collector/metrics/v1/metrics_service';
import { ExportTraceServiceRequest } from './types/opentelemetry/proto/collector/trace/v1/trace_service';
import { readPort } from './util';

const port = readPort('OTEL_OTLP_HTTP_PORT', 4318);

export default class HttpServer extends AbstractServer {
  constructor(bindAddress: string, sink: Sink) {
    super(bindAddress, sink);
  }

  async start() {
    const server = http.createServer(this.handleHttpRequest.bind(this));
    const serverListen = <(port?: number, hostname?: string) => Promise<void>>promisify(server.listen).bind(server);
    await serverListen(port, this.bindAddress);
    console.log(`listening for HTTP traffic on http://${this.bindAddress}:${port}`);
  }

  handleHttpRequest(req: IncomingMessage, res: ServerResponse) {
    const pathname = new URL(req.url ?? '', `http://${req.headers.host}`).pathname;
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end();
      return;
    }

    switch (pathname) {
      case '/v1/traces':
        this.handleTraceRequest(req, res);
        return;
      case '/v1/metrics':
        this.handleMetrics(req, res);
        return;
      case '/v1/logs':
        this.handleLogs(req, res);
        return;
    }

    res.statusCode = 404;
    res.end();
  }

  handleTraceRequest(req: IncomingMessage, res: ServerResponse) {
    this.handleOtlpRequest(
      req,
      res,
      ExportTraceServiceRequest.decode,
      this.sink.addTraces.bind(this.sink),
      'rejectedSpans',
    );
  }

  handleMetrics(req: IncomingMessage, res: ServerResponse) {
    this.handleOtlpRequest(
      req,
      res,
      ExportMetricsServiceRequest.decode,
      this.sink.addMetrics.bind(this.sink),

      'rejectedMetrics',
    );
  }

  handleLogs(req: IncomingMessage, res: ServerResponse) {
    this.handleOtlpRequest(
      req,
      res,
      ExportLogsServiceRequest.decode,
      this.sink.addLogs.bind(this.sink),

      'rejectedLogs',
    );
  }

  handleOtlpRequest(
    req: IncomingMessage,
    res: ServerResponse,
    decodeFunction: (reader: Reader | Uint8Array, length?: number) => any,
    addToSink: (data: any) => void,
    responseProperty: string,
  ) {
    const chunks: Buffer[] = [];
    req
      .on('data', chunk => {
        chunks.push(chunk);
      })
      .on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'];
        if (contentType?.toLowerCase().startsWith('application/x-protobuf')) {
          this.handleHttpProtobuf(buffer, res, decodeFunction, addToSink, responseProperty);
        } else if (contentType?.toLowerCase().startsWith('application/json')) {
          this.handleHttpJson(res);
        } else {
          if (!contentType) {
            console.warn('request had no content type, assuming http/protobuf');
          } else {
            console.warn(`request had unexpected content type (${contentType}), assuming http/protobuf`);
          }
          this.handleHttpProtobuf(buffer, res, decodeFunction, addToSink, responseProperty);
        }
      });
  }

  handleHttpProtobuf(
    buffer: Buffer,
    res: ServerResponse,
    decodeFunction: (reader: Reader | Uint8Array, length?: number) => any,
    addToSink: (data: any) => void,
    responseProperty: string,
  ): void {
    const reader = new Reader(buffer);
    const decoded = decodeFunction(reader);
    addToSink(decoded);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    // respond with {rejectedSpans: 0} or similar, depending on signal type
    res.end(JSON.stringify({ [responseProperty]: 0 }));
  }

  handleHttpJson(res: ServerResponse) {
    res.statusCode = 501;
    res.setHeader('Content-Type', 'text/plain');
    res.end('http/json is not supported (yet), only grpc and http/protobuf\n');
  }
}
