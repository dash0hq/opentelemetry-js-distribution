// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import path from 'node:path';

import { ROOT_CONTEXT, defaultTextMapGetter, trace } from '@opentelemetry/api';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { expect } from 'chai';

import {
  CreatePropagatorFromConfig,
  installDeclarativePropagators,
  wrapCreatePropagatorFromConfig,
} from './declarativePropagators';

// The module installDeclarativePropagators patches, located the same way (see declarativeResourceDetectors_test.ts).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createFromConfigModule = require(
  path.join(path.dirname(require.resolve('@opentelemetry/sdk-node')), 'create-from-config'),
);

const propagators = { xray: () => new AWSXRayPropagator() };

const traceparentTraceId = '0af7651916cd43dd8448eb211c80319c';
const xrayTraceId = '5759e988bd862e3fe1be46a994272793';
const traceparent = `00-${traceparentTraceId}-b7ad6b7169203331-01`;
const xrayHeader = 'Root=1-5759e988-bd862e3fe1be46a994272793;Parent=53995c3f42cd8ad8;Sampled=1';
const xrayRootOnlyHeader = 'Root=1-5759e988-bd862e3fe1be46a994272793';

function composite(...names: string[]) {
  return { composite: names.map(name => ({ [name]: null })) };
}

describe('declarative propagators', () => {
  let original: CreatePropagatorFromConfig;
  let wrapped: CreatePropagatorFromConfig;

  beforeEach(() => {
    original = createFromConfigModule.createPropagatorFromConfig;
    wrapped = wrapCreatePropagatorFromConfig(original, propagators);
  });

  function extractedTraceId(config: unknown, carrier: Record<string, string>): string | undefined {
    const propagator = wrapped(config);
    expect(propagator).to.not.be.undefined;
    return trace.getSpanContext(propagator!.extract(ROOT_CONTEXT, carrier, defaultTextMapGetter))?.traceId;
  }

  it('is rejected by upstream without the wrapper', () => {
    expect(() => original(composite('tracecontext', 'xray'))).to.throw(/unknown TextMapPropagator/);
  });

  it('passes a configuration without xray through unchanged', () => {
    expect(wrapped(composite('tracecontext', 'baggage'))?.fields()).to.deep.equal([
      'traceparent',
      'tracestate',
      'baggage',
    ]);
  });

  it('builds tracecontext, baggage and xray in the given order', () => {
    expect(wrapped(composite('tracecontext', 'baggage', 'xray'))?.fields()).to.deep.equal([
      'traceparent',
      'tracestate',
      'baggage',
      'x-amzn-trace-id',
    ]);
  });

  it('prefers xray over traceparent when xray comes last', () => {
    const traceId = extractedTraceId(composite('tracecontext', 'baggage', 'xray'), {
      traceparent,
      'x-amzn-trace-id': xrayHeader,
    });
    expect(traceId).to.equal(xrayTraceId);
  });

  it('keeps traceparent when the X-Ray header has no parent', () => {
    const traceId = extractedTraceId(composite('tracecontext', 'baggage', 'xray'), {
      traceparent,
      'x-amzn-trace-id': xrayRootOnlyHeader,
    });
    expect(traceId).to.equal(traceparentTraceId);
  });

  it('prefers traceparent over xray when tracecontext comes last', () => {
    const traceId = extractedTraceId(composite('xray', 'tracecontext'), {
      traceparent,
      'x-amzn-trace-id': xrayHeader,
    });
    expect(traceId).to.equal(traceparentTraceId);
  });

  it('accepts xray in composite_list', () => {
    expect(wrapped({ composite: [{ tracecontext: null }], composite_list: 'baggage, xray' })?.fields()).to.deep.equal([
      'traceparent',
      'tracestate',
      'baggage',
      'x-amzn-trace-id',
    ]);
  });

  it('drops duplicates', () => {
    expect(wrapped(composite('tracecontext', 'xray', 'tracecontext', 'xray'))?.fields()).to.deep.equal([
      'traceparent',
      'tracestate',
      'x-amzn-trace-id',
    ]);
  });

  it('returns no propagator if the list contains none', () => {
    expect(wrapped(composite('xray', 'none'))).to.be.undefined;
  });

  it('lets upstream reject other unknown names', () => {
    expect(() => wrapped(composite('tracecontext', 'xray', 'unknown'))).to.throw(/unknown TextMapPropagator.*unknown/);
  });

  describe('installation', () => {
    afterEach(() => {
      createFromConfigModule.createPropagatorFromConfig = original;
    });

    it('patches sdk-node', () => {
      expect(installDeclarativePropagators(propagators)).to.be.undefined;
      expect(createFromConfigModule.createPropagatorFromConfig).to.not.equal(original);
      expect(createFromConfigModule.createPropagatorFromConfig(composite('xray'))?.fields()).to.deep.equal([
        'x-amzn-trace-id',
      ]);
    });

    it('does not patch a createPropagatorFromConfig that takes a component registry first', () => {
      const withRegistry = (_registry: unknown, propagatorConfig?: unknown) => original(propagatorConfig);
      createFromConfigModule.createPropagatorFromConfig = withRegistry;
      expect(installDeclarativePropagators(propagators)).to.match(/takes 2 parameters/);
      expect(createFromConfigModule.createPropagatorFromConfig).to.equal(withRegistry);
    });
  });
});
