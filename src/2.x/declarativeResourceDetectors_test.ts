// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import path from 'node:path';

import { ResourceDetector } from '@opentelemetry/resources';
import { expect } from 'chai';

import {
  CreateResourceFromConfig,
  installDeclarativeResourceDetectors,
  wrapCreateResourceFromConfig,
} from './declarativeResourceDetectors';

// The module installDeclarativeResourceDetectors patches, located the same way.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createFromConfigModule = require(
  path.join(path.dirname(require.resolve('@opentelemetry/sdk-node')), 'create-from-config'),
);

const detectors: Record<string, ResourceDetector> = {
  dash0_distribution: { detect: () => ({ attributes: { 'telemetry.distro.name': 'dash0-nodejs' } }) },
  dash0_kubernetes: { detect: () => ({ attributes: { 'k8s.pod.uid': 'pod-uid', 'shared.key': 'from-dash0' } }) },
  dash0_service_name: {
    detect: () => ({ attributes: { 'service.name': 'from-package-json', 'service.version': '1.2.3' } }),
  },
};

function resourceConfig(detectorNames: string[], attributes: { name: string; value: string }[] = []) {
  return {
    attributes,
    'detection/development': { detectors: detectorNames.map(name => ({ [name]: {} })) },
  };
}

describe('declarative resource detectors', () => {
  let original: CreateResourceFromConfig;
  let wrapped: CreateResourceFromConfig;

  beforeEach(() => {
    original = createFromConfigModule.createResourceFromConfig;
    wrapped = wrapCreateResourceFromConfig(original, detectors);
  });

  it('is rejected by upstream without the wrapper', () => {
    expect(() => original(resourceConfig(['dash0_kubernetes']))).to.throw();
  });

  it('passes a configuration without Dash0 detectors through unchanged', () => {
    const config = resourceConfig(['process'], [{ name: 'service.name', value: 'my-service' }]);
    const attributes = wrapped(config).attributes;
    expect(attributes).to.have.property('service.name', 'my-service');
    expect(attributes).to.have.property('process.pid', process.pid);
    expect(attributes).to.not.have.property('telemetry.distro.name');
  });

  it('passes a configuration without a detection section through unchanged', () => {
    const attributes = wrapped({ attributes: [{ name: 'service.name', value: 'my-service' }] }).attributes;
    expect(attributes).to.have.property('service.name', 'my-service');
  });

  it('applies the Dash0 detectors alongside upstream detectors', () => {
    const attributes = wrapped(resourceConfig(['process', 'dash0_distribution', 'dash0_kubernetes'])).attributes;
    expect(attributes).to.have.property('telemetry.distro.name', 'dash0-nodejs');
    expect(attributes).to.have.property('k8s.pod.uid', 'pod-uid');
    expect(attributes).to.have.property('process.pid', process.pid);
  });

  it('lets attributes from the file take precedence over the Dash0 detectors', () => {
    const attributes = wrapped(
      resourceConfig(['dash0_kubernetes'], [{ name: 'shared.key', value: 'from-file' }]),
    ).attributes;
    expect(attributes).to.have.property('shared.key', 'from-file');
    expect(attributes).to.have.property('k8s.pod.uid', 'pod-uid');
  });

  it('applies the service name fallback when no service name is configured', () => {
    const attributes = wrapped(resourceConfig(['dash0_service_name'])).attributes;
    expect(attributes).to.have.property('service.name', 'from-package-json');
    expect(attributes).to.have.property('service.version', '1.2.3');
  });

  it('applies the service name fallback when the service name is an unknown_service placeholder', () => {
    const attributes = wrapped(
      resourceConfig(['dash0_service_name'], [{ name: 'service.name', value: 'unknown_service' }]),
    ).attributes;
    expect(attributes).to.have.property('service.name', 'from-package-json');
  });

  it('does not apply the service name fallback when the file sets a service name', () => {
    const attributes = wrapped(
      resourceConfig(['dash0_service_name'], [{ name: 'service.name', value: 'my-service' }]),
    ).attributes;
    expect(attributes).to.have.property('service.name', 'my-service');
    expect(attributes).to.not.have.property('service.version');
  });

  it('still rejects unknown detector names', () => {
    expect(() => wrapped(resourceConfig(['dash0_kubernetes', 'no_such_detector']))).to.throw();
  });

  describe('installation', () => {
    afterEach(() => {
      createFromConfigModule.createResourceFromConfig = original;
    });

    it('patches sdk-node', () => {
      expect(installDeclarativeResourceDetectors(detectors)).to.be.undefined;
      expect(createFromConfigModule.createResourceFromConfig).to.not.equal(original);
      const attributes = createFromConfigModule.createResourceFromConfig(
        resourceConfig(['dash0_distribution']),
      ).attributes;
      expect(attributes).to.have.property('telemetry.distro.name', 'dash0-nodejs');
    });
  });
});
