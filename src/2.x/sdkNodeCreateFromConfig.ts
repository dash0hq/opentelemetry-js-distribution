// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import path from 'node:path';

/**
 * Replaces the given export of sdk-node's create-from-config module with a wrapped version. startNodeSDK looks these
 * functions up on that module at call time, so this has to happen before startNodeSDK is called.
 *
 * The module is resolved relative to the package entry point rather than by a deep import specifier: the tsc build
 * (sdk-node <= 0.222) has it at build/src/create-from-config.js, the tsdown build that replaces it at
 * dist/create-from-config.cjs, and the latter's package.json exports map rejects deep imports, but not absolute paths.
 *
 * Returns an error message if the module or the function could not be found, or if the function does not take a
 * single configuration section as its only parameter, in which case nothing is patched.
 */
export function patchCreateFromConfigExport<F extends (...args: any[]) => any>(
  exportName: string,
  wrap: (original: F) => F,
): string | undefined {
  let entryPoint: string;
  try {
    entryPoint = require.resolve('@opentelemetry/sdk-node');
  } catch (e) {
    return `cannot resolve @opentelemetry/sdk-node: ${e}`;
  }
  const directory = path.dirname(entryPoint);
  const candidates = ['create-from-config.js', 'create-from-config.cjs'].map(file => path.join(directory, file));
  const loadErrors: string[] = [];
  for (const candidate of candidates) {
    let module: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      module = require(candidate);
    } catch (e) {
      loadErrors.push(`${candidate}: ${e}`);
      continue;
    }
    const original = module?.[exportName];
    if (typeof original !== 'function') {
      return `${candidate} does not export a ${exportName} function`;
    }
    // Newer sdk-node versions take a component registry first. Wrapping one of those would hand the registry to the
    // wrapper as the configuration section and silently drop the file's own section.
    if (original.length !== 1) {
      return `${candidate} exports a ${exportName} that takes ${original.length} parameters, expected the configuration section only`;
    }
    module[exportName] = wrap(original);
    return undefined;
  }
  return `none of the candidate modules could be loaded (${loadErrors.join('; ')})`;
}
