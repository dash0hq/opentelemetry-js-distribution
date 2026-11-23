// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

// Lets a declarative configuration file name propagators that upstream does not know, e.g.
//
//   propagator:
//     composite:
//       - tracecontext:
//       - baggage:
//       - xray:
//
// Upstream's startNodeSDK only knows a fixed set of propagator names and rejects any other name, failing the whole SDK
// setup. As for the resource detectors (see declarativeResourceDetectors.ts), the sanctioned extension point is the
// ComponentProvider SPI, which OpenTelemetry JS does not implement yet
// (https://github.com/open-telemetry/opentelemetry-js/issues/5825), so we wrap sdk-node's internal
// createPropagatorFromConfig until it does.

import { TextMapPropagator } from '@opentelemetry/api';
import { CompositePropagator } from '@opentelemetry/core';

import { patchCreateFromConfigExport } from './sdkNodeCreateFromConfig';

export type CreatePropagatorFromConfig = (propagatorConfig: any, ...rest: unknown[]) => TextMapPropagator | undefined;

/**
 * Wraps sdk-node's createPropagatorFromConfig so that the given propagators can be named in a configuration file,
 * in composite as well as in composite_list.
 *
 * The propagators keep the order the file gives them. Runs of other entries are built by upstream, which validates
 * them as usual.
 */
export function wrapCreatePropagatorFromConfig(
  original: CreatePropagatorFromConfig,
  propagators: Record<string, () => TextMapPropagator>,
): CreatePropagatorFromConfig {
  const isCustom = (name: string | undefined): name is string =>
    name !== undefined && Object.prototype.hasOwnProperty.call(propagators, name);

  return (propagatorConfig, ...rest) => {
    const entries = mergeComposite(propagatorConfig?.composite, propagatorConfig?.composite_list);
    const names = entries.map(entryName);
    // Upstream returns no propagator at all if the list contains none, whatever else it contains.
    if (!names.some(isCustom) || names.includes('none')) {
      return original(propagatorConfig, ...rest);
    }

    const result: TextMapPropagator[] = [];
    const seen = new Set<string>();
    let run: unknown[] = [];
    const flushRun = () => {
      if (run.length > 0) {
        const propagator = original({ composite: run }, ...rest);
        if (propagator !== undefined) {
          result.push(propagator);
        }
        run = [];
      }
    };
    entries.forEach((entry, i) => {
      const name = names[i];
      if (name !== undefined) {
        // Upstream drops duplicates within one call; this drops them across runs too.
        if (seen.has(name)) {
          return;
        }
        seen.add(name);
      }
      if (isCustom(name)) {
        flushRun();
        result.push(propagators[name]());
      } else {
        run.push(entry);
      }
    });
    flushRun();
    return new CompositePropagator({ propagators: result });
  };
}

/**
 * Appends the names in composite_list to the composite entries, skipping names already present, as upstream does.
 */
function mergeComposite(composite: unknown, compositeList: unknown): unknown[] {
  const merged = Array.isArray(composite) ? composite.slice() : [];
  if (typeof compositeList !== 'string') {
    return merged;
  }
  const existing = new Set(merged.map(entryName));
  for (const name of compositeList.split(',').map(n => n.trim())) {
    if (name !== '' && !existing.has(name)) {
      existing.add(name);
      merged.push({ [name]: null });
    }
  }
  return merged;
}

/**
 * Returns the name of a composite entry, or undefined if the entry is malformed. Upstream rejects malformed entries.
 */
function entryName(entry: unknown): string | undefined {
  if (entry == null || typeof entry !== 'object') {
    return undefined;
  }
  const keys = Object.keys(entry).filter(key => (entry as Record<string, unknown>)[key] !== undefined);
  return keys.length === 1 ? keys[0] : undefined;
}

/**
 * Patches sdk-node so that the given propagators can be named in a configuration file. Returns an error message if
 * sdk-node does not have the expected shape, in which case nothing is patched.
 */
export function installDeclarativePropagators(
  propagators: Record<string, () => TextMapPropagator>,
): string | undefined {
  return patchCreateFromConfigExport<CreatePropagatorFromConfig>('createPropagatorFromConfig', original =>
    wrapCreatePropagatorFromConfig(original, propagators),
  );
}
