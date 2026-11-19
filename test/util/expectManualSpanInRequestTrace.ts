// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind } from '@opentelemetry/api';
import { expect } from 'chai';

import { ExportTraceServiceRequest } from '../collector/types/opentelemetry/proto/collector/trace/v1/trace_service';
import { expectSpanAttribute } from './expectAttribute';
import { expectMatchingSpan } from './expectMatchingSpan';

/**
 * Asserts that the traces contain the server span for GET /ohai and a span named manual-span with a parent in the same
 * trace.
 */
export function expectManualSpanInRequestTrace(traces: ExportTraceServiceRequest[]) {
  const serverSpan = expectMatchingSpan(
    traces,
    [],
    [
      span => expect(span.kind).to.equal(SpanKind.SERVER, 'span kind should be server'),
      span => expectSpanAttribute(span, 'http.route', '/ohai'),
    ],
  );
  expectMatchingSpan(
    traces,
    [],
    [
      span => expect(span.name).to.equal('manual-span'),
      span => expect(hex(span.trace_id)).to.equal(hex(serverSpan.trace_id), 'trace id should match'),
      span => expect(span.parent_span_id).to.not.be.empty,
    ],
  );
}

function hex(id: Uint8Array) {
  return Buffer.from(id).toString('hex');
}
