// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

export default function delay(millis: number) {
  return new Promise(resolve => setTimeout(resolve, millis));
}
