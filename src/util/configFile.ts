// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

// Plain 'fs': index.ts loads this before the version check, and Node.js 14.0 to 14.17 cannot require 'node:' modules.
import { statSync } from 'fs';

export const defaultConfigFile = '/etc/opentelemetry/nodejs/otel-config.yaml';

export interface ConfigFile {
  path: string;
  /** True when the path comes from OTEL_CONFIG_FILE, false when it is the default file. */
  explicit: boolean;
}

/**
 * Returns the declarative configuration file to use: OTEL_CONFIG_FILE when it is set and not blank, otherwise
 * defaultConfigFile when it exists, otherwise undefined. An explicit OTEL_CONFIG_FILE is returned even if the file does
 * not exist, so that the SDK reports the error.
 */
export function resolveConfigFile(
  env: NodeJS.ProcessEnv = process.env,
  isFile: (path: string) => boolean = fileExists,
): ConfigFile | undefined {
  const fromEnv = env.OTEL_CONFIG_FILE?.trim();
  if (fromEnv) {
    return { path: fromEnv, explicit: true };
  }
  if (isFile(defaultConfigFile)) {
    return { path: defaultConfigFile, explicit: false };
  }
  return undefined;
}

/**
 * Calls fn with OTEL_CONFIG_FILE set to the given file, for SDK functions that only read the path from the environment.
 * Restores the previous value afterwards, so that child processes do not inherit a path the user never set. fn must
 * read the variable synchronously.
 */
export function withConfigFileInEnv<T>(configFile: ConfigFile, fn: () => T, env: NodeJS.ProcessEnv = process.env): T {
  if (configFile.explicit) {
    return fn();
  }
  const previous = env.OTEL_CONFIG_FILE;
  env.OTEL_CONFIG_FILE = configFile.path;
  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete env.OTEL_CONFIG_FILE;
    } else {
      env.OTEL_CONFIG_FILE = previous;
    }
  }
}

export interface UnsupportedConfigFileOutcome {
  /** True when the distribution must not start, false when it falls back to environment variables. */
  prohibitive: boolean;
  message: string;
}

/**
 * Returns what to log when a configuration file is present on a Node.js version without declarative configuration
 * support, or undefined when nothing needs to be logged.
 */
export function unsupportedConfigFileOutcome(
  configFile: ConfigFile,
  hasCollectorBaseUrl: boolean,
  nodeJsRuntimeVersion: string,
): UnsupportedConfigFileOutcome | undefined {
  const source = configFile.explicit ? 'OTEL_CONFIG_FILE is set' : `${configFile.path} exists`;
  if (!hasCollectorBaseUrl) {
    return {
      prohibitive: true,
      message: `${source}, but configuration files are not supported on this Node.js runtime version (${nodeJsRuntimeVersion}), and DASH0_OTEL_COLLECTOR_BASE_URL is not set.`,
    };
  }
  // The default file is only a fallback, so ignoring it is not worth a warning.
  if (!configFile.explicit) {
    return undefined;
  }
  return {
    prohibitive: false,
    message: `${source}, but configuration files are not supported on this Node.js runtime version (${nodeJsRuntimeVersion}). The configuration file will be ignored, the distribution will be configured via environment variables instead.`,
  };
}

function fileExists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
