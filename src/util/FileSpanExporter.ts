// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { FileHandle, open } from 'node:fs/promises';
import { EOL } from 'os';

import { ExportResult, ExportResultCode, hrTimeToMicroseconds } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

/**
 * This is implementation of {@link SpanExporter} that prints spans to a file.
 */
export class FileSpanExporter implements SpanExporter {
  private file: Promise<FileHandle>;

  constructor(filename: string) {
    this.file = open(filename, 'a');
    this.tryOpen(filename);
  }

  async tryOpen(filename: string) {
    try {
      await this.file;
    } catch (e: any) {
      console.error(
        `Opening the file ${filename} (set via DASH0_DEBUG_PRINT_SPANS) for writing/appending failed. No spans will be written to that file.`,
        e,
      );
    }
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    this.printAndReportResult(spans, resultCallback);
  }

  shutdown(): Promise<void> {
    this.printAndReportResult([]);
    return this.forceFlush();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  // mimics ConsoleSpanExporter._exportInfo
  private serialize(span: ReadableSpan) {
    return JSON.stringify({
      resource: {
        attributes: span.resource.attributes,
      },
      traceId: span.spanContext().traceId,
      parentId: span.parentSpanId,
      traceState: span.spanContext().traceState?.serialize(),
      name: span.name,
      id: span.spanContext().spanId,
      kind: span.kind,
      timestamp: hrTimeToMicroseconds(span.startTime),
      duration: hrTimeToMicroseconds(span.duration),
      attributes: span.attributes,
      status: span.status,
      events: span.events,
      links: span.links,
    });
  }

  private async printAndReportResult(spans: ReadableSpan[], done?: (result: ExportResult) => void): Promise<void> {
    // This is only asynchronous the first time it is called (and that only if it is called before the open call
    // happening in the constructor has finished), after that, this.file is a resolved promise.
    let fileHandle;
    try {
      fileHandle = await this.file;
    } catch (e) {
      if (done) {
        done({ code: ExportResultCode.FAILED });
      }
      return;
    }

    for (const span of spans) {
      await fileHandle.appendFile(this.serialize(span));
      await fileHandle.appendFile(EOL);
    }
    if (done) {
      done({ code: ExportResultCode.SUCCESS });
    }
  }
}
