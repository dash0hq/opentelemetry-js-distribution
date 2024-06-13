// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { ExportTraceServiceRequest } from '../collector/types/opentelemetry/proto/collector/trace/v1/trace_service';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import { ResourceSpans, ScopeSpans, Span } from '../collector/types/opentelemetry/proto/trace/v1/trace';
import {
  Expectation,
  findMatchingItemsInServiceRequest,
  findMatchingSpansInFileDump,
  processFindItemsResult,
  ServiceRequestMapper,
} from './findMatchingItems';

class TraceDataServiceRequestMapper
  implements ServiceRequestMapper<ExportTraceServiceRequest, ResourceSpans, ScopeSpans, Span>
{
  getResourceItems(serviceRequest: ExportTraceServiceRequest): ResourceSpans[] {
    return serviceRequest.resource_spans;
  }

  getResource(resourceSpans: ResourceSpans): Resource | undefined {
    return resourceSpans.resource;
  }

  getScopeItems(resourceSpan: ResourceSpans): ScopeSpans[] {
    return resourceSpan.scope_spans;
  }

  getItems(scopeSpan: ScopeSpans): Span[] {
    return scopeSpan.spans;
  }
}

export function expectMatchingSpan(
  traceDataItems: ExportTraceServiceRequest[],
  resourceExpectations: Expectation<Resource>[],
  spanExpectations: Expectation<Span>[],
): Span {
  const matchResult = findMatchingItemsInServiceRequest(
    traceDataItems,
    new TraceDataServiceRequestMapper(),
    resourceExpectations,
    spanExpectations,
  );
  return processFindItemsResult(matchResult, 'span');
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
  return processFindItemsResult(matchResult, 'span');
}
