// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import semver from 'semver';

import { ignoresRegisteredApi, registeredApiVersion, resolveApiVersion } from './util/apiVersion';

const lowerBound = '14.0.0';
const versionMapping = [
  // OpenTelemetry JS SDK 1.x, supports Node.js 14.x - 18.18.2, and 20.0.0-20.5.1.
  ['>=16.0.0 <18.19.0', './1.x/init'],
  ['>=20.0.0 <20.6.0', './1.x/init'],
  // OpenTelemetry JS SDK 2.x, supports Node.js >= 18.19.0 || >= 20.6.0
  ['>=18.19.0', './2.x/init'],
];

// Maintenance note: This needs to be kept in sync with the version ranges in .github/workflows/verify.yaml, property
// jobs.verify.strategy.matrix.node-version.
const untestedVersionRange = '>=26.0.0';

const prefix = 'Dash0 OpenTelemetry Distribution';

function init() {
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

    for (let i = 0; i < versionMapping.length; i++) {
      const [semverRange, initFile] = versionMapping[i];
      if (semver.satisfies(nodeJsRuntimeVersion, semverRange)) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require(initFile);
        warnIfApplicationIgnoresRegisteredApi();
        return;
      }
    }

    logProhibitiveError(`No matching version range found for Node.js runtime version ${nodeJsRuntimeVersion}.`);
  } catch (e) {
    logProhibitiveError(`Initialization failed: ${e}`);
  }
}

if (process.env.DASH0_DISABLE != null && process.env.DASH0_DISABLE.toLowerCase() === 'true') {
  logProhibitiveError(`The distribution has been disabled by setting DASH0_DISABLE=${process.env.DASH0_DISABLE}.`);
} else if (process.env.DASH0_OTEL_COLLECTOR_BASE_URL == null) {
  logProhibitiveError(`DASH0_OTEL_COLLECTOR_BASE_URL is not set.`);
} else {
  init();
}

// @opentelemetry/api ignores an incompatible global registration without logging anything, so the application would
// look instrumented while its own spans and metrics are dropped.
function warnIfApplicationIgnoresRegisteredApi() {
  try {
    const registeredVersion = registeredApiVersion();
    if (!registeredVersion) {
      return;
    }
    const applicationLocations = process.argv[1] ? [process.argv[1], process.cwd()] : [process.cwd()];
    const applicationVersion = resolveApiVersion(applicationLocations);
    if (applicationVersion && ignoresRegisteredApi(applicationVersion, registeredVersion)) {
      logWarning(
        `The application uses @opentelemetry/api ${applicationVersion}, which ignores the OpenTelemetry SDK that the distribution registered with @opentelemetry/api ${registeredVersion}. Spans and metrics that the application creates with @opentelemetry/api will not be recorded, and they will not be part of the traces of auto-instrumented requests.`,
      );
    }
  } catch {
    // The check is best effort and must not affect the SDK that has already started.
  }
}

function logProhibitiveError(message: string) {
  console.error(`[${prefix}] ${message} OpenTelemetry data will not be sent to Dash0.`);
}

function logWarning(message: string) {
  console.error(`[${prefix}] ${message}`);
}
