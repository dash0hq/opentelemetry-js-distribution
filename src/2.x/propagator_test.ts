// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  ROOT_CONTEXT,
  SpanContext,
  TextMapPropagator,
  TraceFlags,
  defaultTextMapGetter,
  defaultTextMapSetter,
  propagation,
  trace,
} from '@opentelemetry/api';
import { expect } from 'chai';

import { createPropagator } from './propagator';

const traceparentTraceId = '0af7651916cd43dd8448eb211c80319c';
const traceparentSpanId = 'b7ad6b7169203331';
const traceparent = `00-${traceparentTraceId}-${traceparentSpanId}-01`;

const xrayTraceId = '5759e988bd862e3fe1be46a994272793';
const xrayRoot = '1-5759e988-bd862e3fe1be46a994272793';
const xraySpanId = '53995c3f42cd8ad8';
const xrayHeader = `Root=${xrayRoot};Parent=${xraySpanId};Sampled=1`;

describe('propagator', () => {
  let originalValue: string | undefined;

  before(() => {
    originalValue = process.env.OTEL_PROPAGATORS;
  });

  beforeEach(() => {
    delete process.env.OTEL_PROPAGATORS;
  });

  after(() => {
    if (originalValue == null) {
      delete process.env.OTEL_PROPAGATORS;
    } else {
      process.env.OTEL_PROPAGATORS = originalValue;
    }
  });

  describe('default', () => {
    it('uses tracecontext, baggage and xray in that order', () => {
      expect(createPropagator().fields()).to.deep.equal(['traceparent', 'tracestate', 'baggage', 'x-amzn-trace-id']);
    });

    it('uses the default when OTEL_PROPAGATORS is empty', () => {
      process.env.OTEL_PROPAGATORS = ' ';
      expect(createPropagator().fields()).to.deep.equal(['traceparent', 'tracestate', 'baggage', 'x-amzn-trace-id']);
    });

    it('extracts traceparent', () => {
      expectRemoteParent(extract(createPropagator(), { traceparent }), traceparentTraceId, traceparentSpanId);
    });

    it('extracts X-Amzn-Trace-Id', () => {
      expectRemoteParent(extract(createPropagator(), { 'x-amzn-trace-id': xrayHeader }), xrayTraceId, xraySpanId);
    });

    it('prefers X-Amzn-Trace-Id over traceparent when both are present', () => {
      const spanContext = extract(createPropagator(), { traceparent, 'x-amzn-trace-id': xrayHeader });
      expectRemoteParent(spanContext, xrayTraceId, xraySpanId);
    });

    it('extracts an X-Amzn-Trace-Id that a load balancer extended with Self and unknown fields', () => {
      const header = `Self=1-67891234-12456789abcdef012345678;${xrayHeader};CalledFrom=app-a;Lineage=a87bd80c:1`;
      expectRemoteParent(extract(createPropagator(), { 'x-amzn-trace-id': header }), xrayTraceId, xraySpanId);
    });

    [
      `Root=${xrayRoot}`,
      `Self=1-67891234-12456789abcdef012345678;Root=${xrayRoot}`,
      `Root=${xrayRoot};Sampled=1`,
    ].forEach(header => {
      it(`keeps traceparent when X-Amzn-Trace-Id has no Parent: ${header}`, () => {
        const spanContext = extract(createPropagator(), { traceparent, 'x-amzn-trace-id': header });
        expectRemoteParent(spanContext, traceparentTraceId, traceparentSpanId);
      });

      it(`extracts nothing when X-Amzn-Trace-Id has no Parent and traceparent is absent: ${header}`, () => {
        expect(extract(createPropagator(), { 'x-amzn-trace-id': header })).to.be.undefined;
      });
    });

    it('injects traceparent and X-Amzn-Trace-Id for the same span', () => {
      const carrier = inject(createPropagator(), {
        traceId: traceparentTraceId,
        spanId: traceparentSpanId,
        traceFlags: TraceFlags.SAMPLED,
      });
      expect(carrier.traceparent).to.equal(traceparent);
      expect(carrier['x-amzn-trace-id']).to.equal(
        'Root=1-0af76519-16cd43dd8448eb211c80319c;Parent=b7ad6b7169203331;Sampled=1',
      );
    });

    it('round-trips baggage', () => {
      const propagator = createPropagator();
      const incoming = {
        traceparent,
        'x-amzn-trace-id': `${xrayHeader};Lineage=a87bd80c:1`,
        baggage: 'tenant=acme,region=eu-west-1',
      };
      const ctx = propagator.extract(ROOT_CONTEXT, incoming, defaultTextMapGetter);
      expect(propagation.getBaggage(ctx)?.getEntry('tenant')?.value).to.equal('acme');

      const outgoing: Record<string, string> = {};
      propagator.inject(ctx, outgoing, defaultTextMapSetter);
      expect(outgoing.baggage).to.equal('tenant=acme,region=eu-west-1');
    });
  });

  describe('OTEL_PROPAGATORS', () => {
    it('honors tracecontext only', () => {
      process.env.OTEL_PROPAGATORS = 'tracecontext';
      const propagator = createPropagator();
      expect(propagator.fields()).to.deep.equal(['traceparent', 'tracestate']);
      const spanContext = extract(propagator, { traceparent, 'x-amzn-trace-id': xrayHeader });
      expectRemoteParent(spanContext, traceparentTraceId, traceparentSpanId);
    });

    it('honors xray only', () => {
      process.env.OTEL_PROPAGATORS = 'xray';
      const propagator = createPropagator();
      expect(propagator.fields()).to.deep.equal(['x-amzn-trace-id']);
      expect(extract(propagator, { traceparent })).to.be.undefined;
    });

    it('honors the order of the list', () => {
      process.env.OTEL_PROPAGATORS = 'xray,tracecontext';
      const propagator = createPropagator();
      expect(propagator.fields()).to.deep.equal(['x-amzn-trace-id', 'traceparent', 'tracestate']);
      const spanContext = extract(propagator, { traceparent, 'x-amzn-trace-id': xrayHeader });
      expectRemoteParent(spanContext, traceparentTraceId, traceparentSpanId);
    });

    it('honors none', () => {
      process.env.OTEL_PROPAGATORS = 'none';
      const propagator = createPropagator();
      expect(propagator.fields()).to.be.empty;
      expect(extract(propagator, { traceparent, 'x-amzn-trace-id': xrayHeader })).to.be.undefined;
    });
  });
});

function extract(propagator: TextMapPropagator, carrier: Record<string, string>): SpanContext | undefined {
  return trace.getSpanContext(propagator.extract(ROOT_CONTEXT, carrier, defaultTextMapGetter));
}

function inject(propagator: TextMapPropagator, spanContext: SpanContext): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagator.inject(trace.setSpanContext(ROOT_CONTEXT, spanContext), carrier, defaultTextMapSetter);
  return carrier;
}

function expectRemoteParent(spanContext: SpanContext | undefined, traceId: string, spanId: string) {
  expect(spanContext).to.exist;
  expect(spanContext!.traceId).to.equal(traceId);
  expect(spanContext!.spanId).to.equal(spanId);
  expect(spanContext!.isRemote).to.be.true;
}
