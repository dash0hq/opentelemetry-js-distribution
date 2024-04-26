// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

export function readPort(envVar: string, defaultPort: number): number {
  let port: number | undefined;
  const envVarValue = process.env[envVar];
  if (envVarValue != null) {
    port = parseInt(envVarValue, 10);
  }
  if (port == null) {
    return defaultPort;
  }
  return port;
}
