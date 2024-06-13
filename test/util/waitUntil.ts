// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import isCi from 'is-ci';

import delay from './delay';

export interface RetryOptions {
  maxAttempts: number;
  waitBetweenRetries: number;
}

export interface RetryInProgress {
  attempts: number;
  options: RetryOptions;
}

export function defaultRetryOptions(): RetryOptions {
  if (isCi) {
    return {
      maxAttempts: 30,
      waitBetweenRetries: 300,
    };
  } else {
    return {
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
export default async function waitUntil(fn: () => any, opts?: Partial<RetryOptions>) {
  let retryInProgress: RetryInProgress;
  const defaults = defaultRetryOptions();
  if (!opts) {
    retryInProgress = {
      attempts: 0,
      options: defaults,
    };
  } else {
    retryInProgress = {
      attempts: 0,
      options: {
        maxAttempts: opts.maxAttempts ?? defaults.maxAttempts,
        waitBetweenRetries: opts.waitBetweenRetries ?? defaults.waitBetweenRetries,
      },
    };
  }
  return _waitUntil(fn, retryInProgress);
}

async function _waitUntil(fn: () => any, retryInProgress: RetryInProgress) {
  try {
    return await fn();
  } catch (e) {
    await delay(retryInProgress.options.waitBetweenRetries);
    retryInProgress.attempts += 1;
    if (retryInProgress.attempts > retryInProgress.options.maxAttempts) {
      throw e;
    }
    return _waitUntil(fn, retryInProgress);
  }
}
