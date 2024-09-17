// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { DetectorSync, Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { readPackageJson } from './packageJsonUtil';

export default class ServiceNameFallbackDetector implements DetectorSync {
  detect(): Resource {
    return new Resource({}, this.detectServiceNameFallback());
  }

  private async detectServiceNameFallback(): Promise<any> {
    if (
      hasOptedOutOfServiceNameFallbackDetection() ||
      hasOTelServiceNameSet() ||
      hasServiceNameSetViaOTelResourceAttributesEnvVar()
    ) {
      return {};
    }

    const packageJson = await readPackageJson();
    if (!packageJson) {
      return {};
    }
    return {
      [SEMRESATTRS_SERVICE_NAME]: packageJson.name,
      [SEMRESATTRS_SERVICE_VERSION]: packageJson.version,
    };
  }
}

function hasOptedOutOfServiceNameFallbackDetection() {
  const automaticServiceName = process.env.DASH0_AUTOMATIC_SERVICE_NAME;
  return automaticServiceName && automaticServiceName.trim().toLowerCase() === 'false';
}

function hasOTelServiceNameSet() {
  const otelServiceName = process.env.OTEL_SERVICE_NAME;
  return otelServiceName && otelServiceName.trim() !== '';
}

function hasServiceNameSetViaOTelResourceAttributesEnvVar() {
  const otelResourceAttributes = process.env.OTEL_RESOURCE_ATTRIBUTES;
  if (otelResourceAttributes) {
    const rawAttributes: string[] = otelResourceAttributes.split(',');
    for (const rawAttribute of rawAttributes) {
      const keyValuePair: string[] = rawAttribute.split('=');
      if (keyValuePair.length !== 2) {
        continue;
      }
      const [key, value] = keyValuePair;
      if (key.trim() === SEMRESATTRS_SERVICE_NAME) {
        // The split&join plus the regex comes from
        // https://github.com/open-telemetry/opentelemetry-js/blob/50bd46061ea54f350e30a8d685a4e5742a89e015/packages/opentelemetry-resources/src/detectors/EnvDetectorSync.ts#L114
        // to make sure our interpretation of OTEL_RESOURCE_ATTRIBUTES key-value pairs is aligned with opentelemetry-js.
        // Apparently the intent is to get rid of surrounding quotes in key-value pairs like
        // OTEL_RESOURCE_ATTRIBUTES=key1="value",key2="value"
        if (value != null && value.trim().split(/^"|"$/).join('').trim().length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}
