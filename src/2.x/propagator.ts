// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { TextMapPropagator } from '@opentelemetry/api';
import { getPropagator } from '@opentelemetry/auto-configuration-propagators';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';

/**
 * Returns the propagators named in OTEL_PROPAGATORS, or tracecontext,baggage,xray if it is unset or empty.
 */
export function createPropagator(): TextMapPropagator {
  const fromEnv = process.env.OTEL_PROPAGATORS;
  if (fromEnv != null && fromEnv.trim() !== '') {
    return getPropagator();
  }
  // The composite extracts in order and the last valid context wins, so xray after tracecontext takes precedence over
  // traceparent. An X-Amzn-Trace-Id without Parent (as added by an AWS load balancer) is invalid and keeps traceparent.
  return new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator(), new AWSXRayPropagator()],
  });
}
