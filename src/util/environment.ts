// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

export function hasOptedIn(envVarName: string) {
  const raw = process.env[envVarName];
  return raw != null && raw.toLowerCase() === 'true';
}

export function hasOptedOut(envVarName: string) {
  const raw = process.env[envVarName];
  return raw != null && raw.toLowerCase() === 'false';
}

export function parseNumericEnvironmentVariableWithDefault(envVarName: string, defaultValue: number): number {
  const raw = process.env[envVarName];
  if (!raw) {
    return defaultValue;
  }
  const value = parseInt(raw, 10);
  if (isNaN(value)) {
    return defaultValue;
  }
  return value;
}
