// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import { KeyValue } from '../collector/types/opentelemetry/proto/common/v1/common';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';
import { Span } from '../collector/types/opentelemetry/proto/trace/v1/trace';
import { LogRecord } from '../collector/types/opentelemetry/proto/logs/v1/logs';
import { HistogramDataPoint } from '../collector/types/opentelemetry/proto/metrics/v1/metrics';

const { fail } = expect;

interface WithAttributes {
  attributes: KeyValue[];
}

export function expectAttribute(object: WithAttributes, key: string, expectedValue: any, label: string) {
  const attributes = object.attributes;
  let found = false;
  attributes.forEach(attribute => {
    const a = attribute.key;
    if (a === key) {
      const actualValue = getValue(attribute);
      expect(actualValue).to.equal(
        expectedValue,
        `Expected ${label} to have attribute ${key} with value ${expectedValue}, but the attribute has value ${actualValue}.`,
      );
      found = true;
    }
  });
  if (!found) {
    fail(
      `Expected ${label} to have attribute ${key} with value ${expectedValue}, but no such attribute exists on the ${label}.`,
    );
  }
}

export function expectResourceAttribute(resource: Resource, key: string, expectedValue: any) {
  expectAttribute(resource, key, expectedValue, 'resource');
}

export function expectSpanAttribute(span: Span, key: string, expectedValue: any) {
  expectAttribute(span, key, expectedValue, 'span');
}

export function expectMetricDataPointAttribute(dataPoint: HistogramDataPoint, key: string, expectedValue: any) {
  expectAttribute(dataPoint, key, expectedValue, 'log record');
}

export function expectLogRecordAttribute(logRecord: LogRecord, key: string, expectedValue: any) {
  expectAttribute(logRecord, key, expectedValue, 'log record');
}

function getValue(attribute: KeyValue) {
  const v = attribute.value;
  if (v == null) {
    return null;
  }
  if (v.string_value) {
    return v.string_value;
  }
  if (v.bool_value) {
    return v.bool_value;
  }
  if (v.int_value) {
    return v.int_value;
  }
  if (v.double_value) {
    return v.double_value;
  }
  if (v.array_value) {
    return v.array_value;
  }
  if (v.string_value) {
    return v.string_value;
  }
  if (v.kvlist_value) {
    return v.kvlist_value;
  }
  if (v.bytes_value) {
    return v.bytes_value;
  }
}
