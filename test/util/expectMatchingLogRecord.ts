// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { ExportLogsServiceRequest } from '../collector/types/opentelemetry/proto/collector/logs/v1/logs_service';
import { LogRecord, ResourceLogs, ScopeLogs } from '../collector/types/opentelemetry/proto/logs/v1/logs';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import {
  Expectation,
  findMatchingItemsInServiceRequest,
  processFindItemsResult,
  ServiceRequestMapper,
} from './findMatchingItems';

class LogsServiceRequestMapper
  implements ServiceRequestMapper<ExportLogsServiceRequest, ResourceLogs, ScopeLogs, LogRecord>
{
  getResourceItems(serviceRequest: ExportLogsServiceRequest): ResourceLogs[] {
    return serviceRequest.resource_logs;
  }

  getResource(resourceLogs: ResourceLogs): Resource | undefined {
    return resourceLogs.resource;
  }

  getScopeItems(resourceLogs: ResourceLogs): ScopeLogs[] {
    return resourceLogs.scope_logs;
  }

  getItems(scopeLogs: ScopeLogs): LogRecord[] {
    return scopeLogs.log_records;
  }
}

export function expectMatchingLogRecord(
  logRecords: ExportLogsServiceRequest[],
  resourceExpectations: Expectation<Resource>[],
  logRecordExpectations: Expectation<LogRecord>[],
): LogRecord {
  const matchResult = findMatchingItemsInServiceRequest(
    logRecords,
    new LogsServiceRequestMapper(),
    resourceExpectations,
    logRecordExpectations,
  );
  return processFindItemsResult(matchResult, 'log record');
}
