// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { ExportTraceServiceRequest } from '../collector/types/opentelemetry/proto/collector/trace/v1/trace_service';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import { Span } from '../collector/types/opentelemetry/proto/trace/v1/trace';
import { Expectation, findMatchingSpans, findMatchingSpansInFileDump } from './findMatchingSpans';

export function expectMatchingSpan(
  traceDataItems: ExportTraceServiceRequest[],
  resourceExpectations: Expectation<Resource>[],
  spanExpectations: Expectation<Span>[],
): Span {
  const { matchingSpans, lastError } = findMatchingSpans(traceDataItems, resourceExpectations, spanExpectations);
  return processFindSpanResult(matchingSpans, lastError);
}

export function expectMatchingSpanInFileDump(
  spans: any[],
  resourceAttributeExpectations: Expectation<any>[],
  spanExpectations: Expectation<any>[],
  spanAttributeExpectations: Expectation<any>[],
): Span {
  const { matchingSpans, lastError } = findMatchingSpansInFileDump(
    spans,
    resourceAttributeExpectations,
    spanExpectations,
    spanAttributeExpectations,
  );
  return processFindSpanResult(matchingSpans, lastError);
}

function processFindSpanResult(matchingSpans: Span[], lastError: Error | undefined): Span {
  if (matchingSpans.length === 1) {
    return matchingSpans[0];
  } else if (matchingSpans.length === 0) {
    if (lastError) {
      throw new Error(`No matching span found. Most recent failing expectation: ${lastError}`);
    } else {
      throw new Error('No matching span found.');
    }
  } else if (matchingSpans.length > 1) {
    throw new Error(
      `Expected exactly one matching span, found ${matchingSpans.length}.\nMatches:\n${JSON.stringify(matchingSpans, null, 2)} `,
    );
  } else {
    throw new Error('Unexpected error while processing matching spans.');
  }
}
