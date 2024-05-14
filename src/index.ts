// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

const majorVersionLowerBound = 18;
const majorVersionTestedUpperBound = 22;
const prefix = 'Dash0 OpenTelemetry Distribution';

function init() {
  try {
    const nodeJsRuntimeVersion = process.version;
    const match = nodeJsRuntimeVersion.match(/v(?<majorVersion>\d+)\.(?:\d+)\.(?:\d+)/);
    if (!match?.groups) {
      logProhibitiveError(`Cannot parse Node.js runtime version ${nodeJsRuntimeVersion}.`);
      return;
    }
    const majorVersion = parseInt(match.groups.majorVersion, 10);
    if (isNaN(majorVersion)) {
      logProhibitiveError(`Cannot parse Node.js runtime version ${nodeJsRuntimeVersion}.`);
      return;
    }
    if (majorVersion < majorVersionLowerBound) {
      logProhibitiveError(
        `The distribution does not support this Node.js runtime version (${nodeJsRuntimeVersion}). The minimum supported version is Node.js ${majorVersionLowerBound}.0.0.`,
      );
      return;
    }
    if (majorVersion > majorVersionTestedUpperBound) {
      logWarning(
        `Please note: The distribution has not been explicitly tested with this Node.js runtime version (${nodeJsRuntimeVersion}). The maximum tested version is Node.js ${majorVersionTestedUpperBound}.`,
      );
    }

    require('./init');
  } catch (e) {
    logProhibitiveError(`Initialization failed: ${e}`);
  }
}

init();

function logProhibitiveError(message: string) {
  console.error(`[${prefix}] ${message} OpenTelemetry data will not be sent to Dash0.`);
}

function logWarning(message: string) {
  console.error(`[${prefix}] ${message}`);
}
