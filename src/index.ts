// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import semver from 'semver';

import { ConfigFile, defaultConfigFile, resolveConfigFile, unsupportedConfigFileOutcome } from './util/configFile';
import { initFileForNodeJsVersion, sdk1xInitFile } from './versionMapping';

const lowerBound = '14.0.0';

// Maintenance note: This needs to be kept in sync with the version ranges in .github/workflows/verify.yaml, property
// jobs.verify.strategy.matrix.node-version.
const untestedVersionRange = '>=26.0.0';

const prefix = 'Dash0 OpenTelemetry Distribution';

function init(configFile: ConfigFile | undefined) {
  try {
    const otelSdkAlreadyLoaded = Object.keys(require.cache).some(cacheKey =>
      cacheKey.includes('@opentelemetry/sdk-node/build/src/sdk.js'),
    );

    if (otelSdkAlreadyLoaded) {
      logProhibitiveError(
        `It seems this Node.js application is already instrumented, the Dash0 Node.js OpenTelemetry distribution has been automatically disabled to prevent double-instrumentation.`,
      );
      return;
    }

    const nodeJsRuntimeVersion = process.version;

    if (semver.lt(nodeJsRuntimeVersion, lowerBound)) {
      logProhibitiveError(
        `The distribution does not support this Node.js runtime version (${nodeJsRuntimeVersion}). The minimum supported version is Node.js ${lowerBound}.`,
      );
      return;
    }
    if (semver.satisfies(nodeJsRuntimeVersion, untestedVersionRange)) {
      logWarning(
        `Please note: The distribution has not been explicitly tested with this Node.js runtime version (${nodeJsRuntimeVersion}), or any version ${untestedVersionRange}.`,
      );
    }

    const initFile = initFileForNodeJsVersion(nodeJsRuntimeVersion);
    if (initFile) {
      if (initFile === sdk1xInitFile && configFile) {
        // Declarative configuration requires OpenTelemetry JS SDK 2.x
        const unsupported = unsupportedConfigFileOutcome(
          configFile,
          process.env.DASH0_OTEL_COLLECTOR_BASE_URL != null,
          nodeJsRuntimeVersion,
        );
        if (unsupported?.prohibitive) {
          logProhibitiveError(unsupported.message);
          return;
        }
        if (unsupported) {
          logWarning(unsupported.message);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require(initFile);
      return;
    }

    logProhibitiveError(`No matching version range found for Node.js runtime version ${nodeJsRuntimeVersion}.`);
  } catch (e) {
    logProhibitiveError(`Initialization failed: ${e}`);
  }
}

if (process.env.DASH0_DISABLE != null && process.env.DASH0_DISABLE.toLowerCase() === 'true') {
  logProhibitiveError(`The distribution has been disabled by setting DASH0_DISABLE=${process.env.DASH0_DISABLE}.`);
} else {
  const configFile = resolveConfigFile();
  if (process.env.DASH0_OTEL_COLLECTOR_BASE_URL == null && !configFile) {
    logProhibitiveError(
      `Neither DASH0_OTEL_COLLECTOR_BASE_URL nor OTEL_CONFIG_FILE is set, and ${defaultConfigFile} does not exist.`,
    );
  } else {
    init(configFile);
  }
}

function logProhibitiveError(message: string) {
  console.error(`[${prefix}] ${message} OpenTelemetry data will not be sent to Dash0.`);
}

function logWarning(message: string) {
  console.error(`[${prefix}] ${message}`);
}
