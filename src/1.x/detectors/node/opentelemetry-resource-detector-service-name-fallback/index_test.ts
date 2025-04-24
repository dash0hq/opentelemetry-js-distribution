// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { Resource } from '@opentelemetry/resources-1.x';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { expect } from 'chai';
import Sinon from 'sinon';
import sinon from 'sinon';

import ServiceNameFallbackDetector from './index';
import * as packageJsonUtil from '../../../../util/packageJsonUtil';

const packageJson = {
  name: '@example/app-under-test',
  version: '2.13.47',
  description: 'a Node.js application',
  main: 'src/index.js',
};

const envVarNames = [
  //
  'DASH0_AUTOMATIC_SERVICE_NAME',
  'OTEL_SERVICE_NAME',
  'OTEL_RESOURCE_ATTRIBUTES',
];

interface Dict<T> {
  [key: string]: T | undefined;
}

describe('service name fallback', () => {
  const sandbox = sinon.createSandbox();
  let readPackageJsonStub: Sinon.SinonStub;
  let serviceNameFallback: ServiceNameFallbackDetector;

  const originalEnvVarValues: Dict<string> = {};

  before(() => {
    envVarNames.forEach(envVarName => {
      originalEnvVarValues[envVarName] = process.env[envVarName];
    });
  });

  beforeEach(() => {
    readPackageJsonStub = sandbox.stub(packageJsonUtil, 'readPackageJson');
    serviceNameFallback = new ServiceNameFallbackDetector();
  });

  afterEach(() => {
    sandbox.restore();
    envVarNames.forEach(envVarName => {
      if (originalEnvVarValues[envVarName] === undefined) {
        delete process.env[envVarName];
      } else {
        process.env[envVarName] = originalEnvVarValues[envVarName];
      }
    });
  });

  it('sets a service name and version based on package.json attributes', async () => {
    givenAValidPackageJsonFile();
    const result = serviceNameFallback.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.have.property(SEMRESATTRS_SERVICE_NAME, '@example/app-under-test');
    expect(attributes).to.have.property(SEMRESATTRS_SERVICE_VERSION, '2.13.47');
  });

  it('does not set a service name if DASH0_AUTOMATIC_SERVICE_NAME is false', async () => {
    givenAValidPackageJsonFile();
    process.env.DASH0_AUTOMATIC_SERVICE_NAME = 'false';
    const result = serviceNameFallback.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.be.empty;
  });

  it('does not set a service name if OTEL_SERVICE_NAME is set', async () => {
    givenAValidPackageJsonFile();
    process.env.OTEL_SERVICE_NAME = 'already-set';
    const result = serviceNameFallback.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.be.empty;
  });

  it('sets a service name if OTEL_SERVICE_NAME is set to an empty string', async () => {
    givenAValidPackageJsonFile();
    process.env.OTEL_SERVICE_NAME = '   ';
    const result = serviceNameFallback.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.have.property(SEMRESATTRS_SERVICE_NAME, '@example/app-under-test');
    expect(attributes).to.have.property(SEMRESATTRS_SERVICE_VERSION, '2.13.47');
  });

  it('does not set a service name if OTEL_RESOURCE_ATTRIBUTES has the service.name key', async () => {
    givenAValidPackageJsonFile();
    process.env.OTEL_RESOURCE_ATTRIBUTES = 'key1=value,service.name=already-set,key2=valu,key2=valuee';
    const result = serviceNameFallback.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.be.empty;
  });

  it('sets a service name if OTEL_RESOURCE_ATTRIBUTES is set but does not have the service.name key', async () => {
    givenAValidPackageJsonFile();
    process.env.OTEL_RESOURCE_ATTRIBUTES = 'key1=value,key2=value';
    const result = serviceNameFallback.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.have.property(SEMRESATTRS_SERVICE_NAME, '@example/app-under-test');
    expect(attributes).to.have.property(SEMRESATTRS_SERVICE_VERSION, '2.13.47');
  });

  it('does not set a service name if no package.json can be found', async () => {
    givenThereIsNoPackageJsonFile();
    const result = serviceNameFallback.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.be.empty;
  });

  function givenThereIsNoPackageJsonFile() {
    readPackageJsonStub.returns(null);
  }

  function givenAValidPackageJsonFile() {
    readPackageJsonStub.returns(null).returns(packageJson);
  }

  async function waitForAsyncDetection(result: Resource) {
    expect(result).to.exist;
    expect(result.asyncAttributesPending).to.be.true;
    // @ts-expect-error required
    await result.waitForAsyncAttributes();
    return result.attributes;
  }
});
