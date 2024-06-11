// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import { ExportTraceServiceRequest } from '../collector/types/opentelemetry/proto/collector/trace/v1/trace_service';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import { Span } from '../collector/types/opentelemetry/proto/trace/v1/trace';

const { fail } = expect;

export type Expectation<T> = (span: T) => void;

export interface MatchingSpansResult {
  matchingSpans: Span[];
  lastError?: Error;
}

export function findMatchingSpans(
  traceDataItems: ExportTraceServiceRequest[],
  resourceExpectations: Expectation<Resource>[],
  spanExpectations: Expectation<Span>[],
): MatchingSpansResult {
  if (traceDataItems.length === 0) {
    fail('No trace data has been provided.');
  }
  const matchingSpans: Span[] = [];

  let lastError = null;
  traceDataItems.forEach(traceDataItem => {
    traceDataItem.resource_spans.forEach(resourceSpan => {
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
          }
        } catch (error) {
          // This resource did not match, try the next resource span.
          lastError = error;
          return;
        }
      }

      resourceSpan.scope_spans.forEach(scopeSpan => {
        scopeSpan.spans.forEach(span => {
          try {
            for (let j = 0; j < spanExpectations.length; j++) {
              spanExpectations[j](span);
            }
            matchingSpans.push(span);
          } catch (error) {
            // This span did not match, try the next span.
            lastError = error;
          }
        });
      });
    });
  });
  if (lastError) {
    return { matchingSpans, lastError };
  } else {
    return { matchingSpans };
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

  let lastError = null;
  spans.forEach(span => {
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
        }
      } catch (error) {
        // This resource did not match, try the next resource span.
        lastError = error;
        return;
      }
    }

    try {
      for (let i = 0; i < spanExpectations.length; i++) {
        spanExpectations[i](span);
      }
      if (spanAttributeExpectations.length > 0) {
        const spanAttributes = span.attributes;
        if (!spanAttributes) {
          // This span has no attributes, try the next span.
          return;
        }
        for (let i = 0; i < spanAttributeExpectations.length; i++) {
          spanAttributeExpectations[i](spanAttributes);
        }
      }
      matchingSpans.push(span);
    } catch (error) {
      // This span did not match, try the next span.
      lastError = error;
    }
  });
  if (lastError) {
    return { matchingSpans, lastError };
  } else {
    return { matchingSpans };
  }
}
