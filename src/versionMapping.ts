// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import semver from 'semver';

export const sdk1xInitFile = './1.x/init';
export const sdk2xInitFile = './2.x/init';

const versionMapping = [
  // OpenTelemetry JS SDK 1.x, supports Node.js 14.x - 18.18.2, and 20.0.0-20.5.1.
  ['>=16.0.0 <18.19.0', sdk1xInitFile],
  ['>=20.0.0 <20.6.0', sdk1xInitFile],
  // OpenTelemetry JS SDK 2.x, supports Node.js >= 18.19.0 || >= 20.6.0
  ['>=18.19.0', sdk2xInitFile],
];

/**
 * Returns the init file (relative to src/) for the OpenTelemetry JS SDK line that serves the given Node.js runtime
 * version, or undefined if no SDK line serves it.
 */
export function initFileForNodeJsVersion(nodeJsRuntimeVersion: string): string | undefined {
  for (const [semverRange, initFile] of versionMapping) {
    if (semver.satisfies(nodeJsRuntimeVersion, semverRange)) {
      return initFile;
    }
  }
  return undefined;
}
