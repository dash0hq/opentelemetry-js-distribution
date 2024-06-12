// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { ExportTraceServiceRequest } from '../collector/types/opentelemetry/proto/collector/trace/v1/trace_service';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import { Span } from '../collector/types/opentelemetry/proto/trace/v1/trace';
import { Expectation, findMatchingSpans, findMatchingSpansInFileDump, MatchingSpansResult } from './findMatchingSpans';

export function expectMatchingSpan(
  traceDataItems: ExportTraceServiceRequest[],
  resourceExpectations: Expectation<Resource>[],
  spanExpectations: Expectation<Span>[],
): Span {
  const matchResult = findMatchingSpans(traceDataItems, resourceExpectations, spanExpectations);
  return processFindSpanResult(matchResult);
}

export function expectMatchingSpanInFileDump(
  spans: any[],
  resourceAttributeExpectations: Expectation<any>[],
  spanExpectations: Expectation<any>[],
  spanAttributeExpectations: Expectation<any>[],
): Span {
  const matchResult = findMatchingSpansInFileDump(
    spans,
    resourceAttributeExpectations,
    spanExpectations,
    spanAttributeExpectations,
  );
  return processFindSpanResult(matchResult);
}

function processFindSpanResult(matchResult: MatchingSpansResult): Span {
  if (matchResult.matchingSpans) {
    const matchingSpans = matchResult.matchingSpans;
    if (matchingSpans.length === 1) {
      return matchingSpans[0];
    } else if (matchingSpans.length > 1) {
      throw new Error(
        `Expected exactly one matching span, found ${matchingSpans.length}.\nMatches:\n${JSON.stringify(matchingSpans, null, 2)}`,
      );
    } else {
      throw new Error('Unexpected error while processing matching spans.');
    }
  } else if (matchResult.bestCandidate) {
    const bestCandidate = matchResult.bestCandidate;
    throw new Error(
      `No matching span has been found. The best candidate passed ${bestCandidate.passedChecks} and failed check ${bestCandidate.passedChecks + 1} with error ${bestCandidate.error}. This is the best candidate:\n${JSON.stringify(bestCandidate.spanLike, null, 2)}`,
    );
  } else {
    throw new Error('No matching span has been found.');
  }
}
