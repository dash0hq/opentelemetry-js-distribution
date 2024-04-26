// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { ExportTraceServiceRequest } from '../collector/types/opentelemetry/proto/collector/trace/v1/trace_service';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import { Span } from '../collector/types/opentelemetry/proto/trace/v1/trace';
import findMatchingSpans, { Expectation } from './findMatchingSpans';

export function expectMatchingSpan(
  traceDataItems: ExportTraceServiceRequest[],
  resourceExpectations: Expectation<Resource>[],
  spanExpectations: Expectation<Span>[],
) {
  const { matchingSpans, lastError } = findMatchingSpans(traceDataItems, resourceExpectations, spanExpectations);
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
  }
}
