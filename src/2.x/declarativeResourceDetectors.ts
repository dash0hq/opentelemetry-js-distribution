// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

// Lets a declarative configuration file opt in to the Dash0 resource detectors by name, e.g.
//
//   resource:
//     detection/development:
//       detectors:
//         - host: {}
//         - dash0_kubernetes: {}
//
// Upstream's startNodeSDK only knows a fixed set of detector names and rejects any other name, failing the whole SDK
// setup. The sanctioned extension point for third-party detectors is the ComponentProvider SPI, which
// OpenTelemetry JS does not implement yet (https://github.com/open-telemetry/opentelemetry-js/issues/5825). Until it
// does, we wrap sdk-node's internal createResourceFromConfig: the dash0_* entries are removed from the detector list
// before upstream sees it, and we run those detectors ourselves. The same names can be registered through the SPI
// once it exists.
//
// This depends on sdk-node internals, which is why @opentelemetry/sdk-node is pinned to an exact version, and why the
// integration tests cover a configuration file that names these detectors.

import path from 'node:path';

import { detectResources, Resource, ResourceDetector } from '@opentelemetry/resources';

export const serviceNameDetectorName = 'dash0_service_name';

export type CreateResourceFromConfig = (resourceConfig?: any) => Resource;

/**
 * Wraps sdk-node's createResourceFromConfig so that the given detectors can be named in a configuration file.
 *
 * Attributes from these detectors rank below everything upstream produces, i.e. below the file's own attributes and
 * upstream's detectors, with one exception: the service name fallback only applies when upstream did not produce a
 * service name other than the SDK's unknown_service default.
 */
export function wrapCreateResourceFromConfig(
  original: CreateResourceFromConfig,
  detectors: Record<string, ResourceDetector>,
): CreateResourceFromConfig {
  return resourceConfig => {
    const detection = resourceConfig?.['detection/development'];
    const requested: string[] = [];
    const remaining: unknown[] = [];
    for (const entry of detection?.detectors ?? []) {
      const name = entry != null && typeof entry === 'object' ? Object.keys(entry)[0] : undefined;
      if (name !== undefined && Object.prototype.hasOwnProperty.call(detectors, name)) {
        requested.push(name);
      } else {
        remaining.push(entry);
      }
    }
    if (requested.length === 0) {
      return original(resourceConfig);
    }

    const upstreamResource = original({
      ...resourceConfig,
      'detection/development': { ...detection, detectors: remaining },
    });

    const lowPrecedence = requested.filter(name => name !== serviceNameDetectorName).map(name => detectors[name]);
    let resource =
      lowPrecedence.length > 0
        ? detectResources({ detectors: lowPrecedence }).merge(upstreamResource)
        : upstreamResource;

    if (requested.includes(serviceNameDetectorName) && hasDefaultServiceName(resource)) {
      resource = resource.merge(detectResources({ detectors: [detectors[serviceNameDetectorName]] }));
    }
    return resource;
  };
}

function hasDefaultServiceName(resource: Resource): boolean {
  // Read the raw attributes rather than resource.attributes, which logs an error while asynchronous attributes, e.g.
  // from upstream's host detector, are still pending. As in resource.attributes, the first non-null entry for a key
  // wins.
  const entry = resource.getRawAttributes().find(([key, value]) => key === 'service.name' && value != null);
  if (entry === undefined) {
    return true;
  }
  const serviceName = entry[1];
  if (serviceName instanceof Promise) {
    // Set by an asynchronous detector; assume it is a real service name.
    return false;
  }
  return String(serviceName).startsWith('unknown_service');
}

/**
 * Locates sdk-node's create-from-config module and replaces its createResourceFromConfig export with the wrapped
 * version. startNodeSDK looks the function up on that module at call time, so this has to happen before startNodeSDK
 * is called.
 *
 * The module is resolved relative to the package entry point rather than by a deep import specifier: the tsc build
 * (sdk-node <= 0.222) has it at build/src/create-from-config.js, the tsdown build that replaces it at
 * dist/create-from-config.cjs, and the latter's package.json exports map rejects deep imports, but not absolute paths.
 *
 * Returns an error message if the module or the function could not be found, in which case nothing is patched.
 */
export function installDeclarativeResourceDetectors(detectors: Record<string, ResourceDetector>): string | undefined {
  let entryPoint: string;
  try {
    entryPoint = require.resolve('@opentelemetry/sdk-node');
  } catch (e) {
    return `cannot resolve @opentelemetry/sdk-node: ${e}`;
  }
  const directory = path.dirname(entryPoint);
  const candidates = ['create-from-config.js', 'create-from-config.cjs'].map(file => path.join(directory, file));
  for (const candidate of candidates) {
    let module: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      module = require(candidate);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      continue;
    }
    if (typeof module?.createResourceFromConfig !== 'function') {
      return `${candidate} does not export a createResourceFromConfig function`;
    }
    module.createResourceFromConfig = wrapCreateResourceFromConfig(module.createResourceFromConfig, detectors);
    return undefined;
  }
  return `none of ${candidates.join(', ')} could be loaded`;
}
