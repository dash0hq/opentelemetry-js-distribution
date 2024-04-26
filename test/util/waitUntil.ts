// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import isCi from 'is-ci';

import delay from './delay';

export interface RetryOptions {
  attempts: number;
  maxAttempts: number;
  waitBetweenRetries: number;
}

export function defaultRetryOptions(): RetryOptions {
  if (isCi) {
    return {
      attempts: 0,
      maxAttempts: 30,
      waitBetweenRetries: 300,
    };
  } else {
    return {
      attempts: 0,
      maxAttempts: 15,
      waitBetweenRetries: 200,
    };
  }
}

/**
 * Retries a function until it does not throw an error.
 *
 * @param fn the function to retry
 * @param retryOptions the options for retrying
 */
export default async function waitUntil(fn: () => any, options?: RetryOptions) {
  options = options ?? defaultRetryOptions();
  try {
    return await fn();
  } catch (e) {
    await delay(options.waitBetweenRetries);
    options.attempts += 1;
    if (options.attempts > options.maxAttempts) {
      throw e;
    }
    return waitUntil(fn, options);
  }
}
