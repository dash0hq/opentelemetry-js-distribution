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

import { detectResources, Resource, ResourceDetector, resourceFromAttributes } from '@opentelemetry/resources';

import { patchCreateFromConfigExport } from './sdkNodeCreateFromConfig';

export const serviceNameDetectorName = 'dash0_service_name';

export type CreateResourceFromConfig = (resourceConfig?: any, ...rest: unknown[]) => Resource;

/**
 * Wraps sdk-node's createResourceFromConfig so that the given detectors can be named in a configuration file.
 *
 * Attributes from these detectors rank below everything upstream produces, i.e. below the file's own attributes and
 * upstream's detectors, with one exception: the service.name from the service name fallback replaces the SDK's
 * unknown_service default. It only applies when upstream did not produce any other service name.
 */
export function wrapCreateResourceFromConfig(
  original: CreateResourceFromConfig,
  detectors: Record<string, ResourceDetector>,
): CreateResourceFromConfig {
  return (resourceConfig, ...rest) => {
    const detection = resourceConfig?.['detection/development'];
    const requested: string[] = [];
    const remaining: unknown[] = [];
    for (const entry of detection?.detectors ?? []) {
      // Entries with more than one key go to upstream unchanged, which rejects them.
      const keys = entry != null && typeof entry === 'object' ? Object.keys(entry) : [];
      const name = keys.length === 1 ? keys[0] : undefined;
      if (name !== undefined && Object.prototype.hasOwnProperty.call(detectors, name)) {
        requested.push(name);
      } else {
        remaining.push(entry);
      }
    }
    if (requested.length === 0) {
      return original(resourceConfig, ...rest);
    }

    const upstreamResource = original(
      {
        ...resourceConfig,
        'detection/development': { ...detection, detectors: remaining },
      },
      ...rest,
    );

    const lowPrecedence = requested.filter(name => name !== serviceNameDetectorName).map(name => detectors[name]);
    let resource =
      lowPrecedence.length > 0
        ? detectResources({ detectors: lowPrecedence }).merge(upstreamResource)
        : upstreamResource;

    if (requested.includes(serviceNameDetectorName) && hasDefaultServiceName(resource)) {
      // Only service.name outranks upstream, to replace the unknown_service default. Everything else the fallback
      // detects, e.g. service.version, stays below the file's attributes.
      const fallback = detectResources({ detectors: [detectors[serviceNameDetectorName]] });
      const serviceName = fallback.getRawAttributes().find(([key]) => key === 'service.name');
      resource = fallback.merge(resource);
      if (serviceName !== undefined) {
        resource = resource.merge(resourceFromAttributes({ 'service.name': serviceName[1] }));
      }
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
 * Patches sdk-node so that the given detectors can be named in a configuration file. Returns an error message if
 * sdk-node does not have the expected shape, in which case nothing is patched.
 */
export function installDeclarativeResourceDetectors(detectors: Record<string, ResourceDetector>): string | undefined {
  return patchCreateFromConfigExport<CreateResourceFromConfig>('createResourceFromConfig', original =>
    wrapCreateResourceFromConfig(original, detectors),
  );
}
