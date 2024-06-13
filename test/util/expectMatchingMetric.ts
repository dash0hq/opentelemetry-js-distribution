// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { ExportMetricsServiceRequest } from '../collector/types/opentelemetry/proto/collector/metrics/v1/metrics_service';
import { ResourceMetrics, ScopeMetrics, Metric } from '../collector/types/opentelemetry/proto/metrics/v1/metrics';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import {
  Expectation,
  findMatchingItemsInServiceRequest,
  processFindItemsResult,
  ServiceRequestMapper,
} from './findMatchingItems';

class MetricsServiceRequestMapper
  implements ServiceRequestMapper<ExportMetricsServiceRequest, ResourceMetrics, ScopeMetrics, Metric>
{
  getResourceItems(serviceRequest: ExportMetricsServiceRequest): ResourceMetrics[] {
    return serviceRequest.resource_metrics;
  }

  getResource(resourceMetrics: ResourceMetrics): Resource | undefined {
    return resourceMetrics.resource;
  }

  getScopeItems(resourceMetrics: ResourceMetrics): ScopeMetrics[] {
    return resourceMetrics.scope_metrics;
  }

  getItems(scopeMetrics: ScopeMetrics): Metric[] {
    return scopeMetrics.metrics;
  }
}

export function expectMatchingMetric(
  metrics: ExportMetricsServiceRequest[],
  resourceExpectations: Expectation<Resource>[],
  metricExpectations: Expectation<Metric>[],
): Metric {
  const matchResult = findMatchingItemsInServiceRequest(
    metrics,
    new MetricsServiceRequestMapper(),
    resourceExpectations,
    metricExpectations,
  );
  return processFindItemsResult(matchResult, 'metric');
}
