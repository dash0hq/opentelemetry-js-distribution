// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import { ExportTraceServiceRequest } from '../collector/types/opentelemetry/proto/collector/trace/v1/trace_service';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import { Span } from '../collector/types/opentelemetry/proto/trace/v1/trace';

const { fail } = expect;

export type Expectation<T> = (span: T) => void;

export type Candidate = {
  spanLike?: any;
  passedChecks: number;
  error?: any;
};

export type MatchingSpansResult = {
  matchingSpans?: Span[];
  bestCandidate?: Candidate;
};

export function findMatchingSpans(
  traceDataItems: ExportTraceServiceRequest[],
  resourceExpectations: Expectation<Resource>[],
  spanExpectations: Expectation<Span>[],
): MatchingSpansResult {
  if (traceDataItems.length === 0) {
    fail('No trace data has been provided.');
  }
  const matchingSpans: Span[] = [];
  let bestCandidate: Candidate = {
    passedChecks: 0,
  };
  traceDataItems.forEach(traceDataItem => {
    traceDataItem.resource_spans.forEach(resourceSpan => {
      let passedResourceChecks = 0;
      if (resourceExpectations.length > 0) {
        // verify that the resource attribtues match
        const resource = resourceSpan.resource;
        if (!resource) {
          // This resource span has no resource information, try the next resource span.
          return;
        }
        try {
          for (let j = 0; j < resourceExpectations.length; j++) {
            resourceExpectations[j](resource);
            passedResourceChecks++;
          }
        } catch (error) {
          // This resource did not pass all checks, try the next resource span. Memorize the resource span if it has
          // been the best match so far.
          if (passedResourceChecks > bestCandidate.passedChecks) {
            bestCandidate = {
              spanLike: resourceSpan,
              passedChecks: passedResourceChecks,
              error,
            };
          }
          return;
        }
      }

      resourceSpan.scope_spans.forEach(scopeSpan => {
        scopeSpan.spans.forEach(span => {
          let passedChecks = passedResourceChecks;
          try {
            for (let j = 0; j < spanExpectations.length; j++) {
              spanExpectations[j](span);
              passedChecks++;
            }
            matchingSpans.push(span);
          } catch (error) {
            if (passedChecks > bestCandidate.passedChecks) {
              bestCandidate = {
                spanLike: span,
                passedChecks,
                error,
              };
            }
            // This span did not pass all checks, try the next span. Memorize the span if it has
            // been the best match so far.
            return;
          }
        });
      });
    });
  });
  if (matchingSpans.length > 0) {
    return { matchingSpans };
  } else {
    return { bestCandidate };
  }
}

export function findMatchingSpansInFileDump(
  spans: any[],
  resourceAttributeExpectations: Expectation<any>[],
  spanExpectations: Expectation<any>[],
  spanAttributeExpectations: Expectation<any>[],
): MatchingSpansResult {
  if (spans.length === 0) {
    fail('No trace data has been provided.');
  }
  const matchingSpans: Span[] = [];
  let bestCandidate: Candidate = {
    passedChecks: 0,
  };

  spans.forEach(span => {
    let passedChecks = 0;
    if (resourceAttributeExpectations.length > 0) {
      // verify that the resource attribtues match
      const resource = span.resource;
      if (!resource) {
        // This resource span has no resource information, try the next span.
        return;
      }
      const resourceAttributes = resource.attributes;
      if (!resourceAttributes) {
        // This resource span has no resource information, try the next span.
        return;
      }
      try {
        for (let i = 0; i < resourceAttributeExpectations.length; i++) {
          resourceAttributeExpectations[i](resourceAttributes);
          passedChecks++;
        }
      } catch (error) {
        // The resource attributes of this span did not match, try the next span.
        if (passedChecks > bestCandidate.passedChecks) {
          bestCandidate = {
            spanLike: span,
            passedChecks: passedChecks,
            error,
          };
        }
        return;
      }
    }

    try {
      for (let i = 0; i < spanExpectations.length; i++) {
        spanExpectations[i](span);
        passedChecks++;
      }
      if (spanAttributeExpectations.length > 0) {
        const spanAttributes = span.attributes;
        if (!spanAttributes) {
          // This span has no attributes, try the next span.
          if (passedChecks > bestCandidate.passedChecks) {
            bestCandidate = {
              spanLike: span,
              passedChecks: passedChecks,
            };
          }
          return;
        }
        for (let i = 0; i < spanAttributeExpectations.length; i++) {
          spanAttributeExpectations[i](spanAttributes);
          passedChecks++;
        }
      }
      matchingSpans.push(span);
    } catch (error) {
      // This span did not match, try the next span.
      if (passedChecks > bestCandidate.passedChecks) {
        bestCandidate = {
          spanLike: span,
          passedChecks: passedChecks,
          error,
        };
      }
    }
  });
  if (matchingSpans.length > 0) {
    return { matchingSpans };
  } else {
    return { bestCandidate };
  }
}
