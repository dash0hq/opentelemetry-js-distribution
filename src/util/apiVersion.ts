// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import semver from 'semver';

const apiPackageName = '@opentelemetry/api';

/**
 * Returns the version of the @opentelemetry/api copy that resolves from the first of the given locations where one
 * resolves, or undefined if none does.
 */
export function resolveApiVersion(fromLocations: string[]): string | undefined {
  let entryPoint: string;
  try {
    entryPoint = require.resolve(apiPackageName, { paths: fromLocations });
  } catch {
    return undefined;
  }
  // The exports map of @opentelemetry/api does not expose ./package.json, so walk up from the entry point instead.
  let directory = path.dirname(entryPoint);
  for (;;) {
    const candidate = path.join(directory, 'package.json');
    if (fs.existsSync(candidate)) {
      const packageJson = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (packageJson.name === apiPackageName) {
        return packageJson.version;
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
}

/**
 * Returns the version of the @opentelemetry/api copy that registered the global OpenTelemetry API, or undefined if
 * nothing has registered it.
 */
export function registeredApiVersion(): string | undefined {
  const api = (globalThis as any)[Symbol.for('opentelemetry.js.api.1')];
  return typeof api?.version === 'string' ? api.version : undefined;
}

/**
 * Returns true if an @opentelemetry/api copy with applicationVersion ignores a global API registered with
 * registeredVersion. A copy only accepts a registration from the same major version and the same or a newer minor
 * version.
 */
export function ignoresRegisteredApi(applicationVersion: string, registeredVersion: string): boolean {
  const application = semver.parse(applicationVersion);
  const registered = semver.parse(registeredVersion);
  if (!application || !registered) {
    return false;
  }
  return application.major !== registered.major || application.minor > registered.minor;
}
