// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import { Resource } from '../collector/types/opentelemetry/proto/resource/v1/resource';

const { fail } = expect;

export interface ServiceRequestMapper<SR, R, S, I> {
  getResourceItems(serviceRequest: SR): R[];
  getResource(resourceItem: R): Resource | undefined;
  getScopeItems(resourceItem: R): S[];
  getItems(scopeItem: S): I[];
}

export type Expectation<T> = (span: T) => void;

export type Candidate = {
  item?: any;
  passedChecks: number;
  error?: any;
};

export type MatchingItemsResult<T> = {
  matchingItems?: T[];
  bestCandidate?: Candidate;
};

export function findMatchingItemsInServiceRequest<SR, R, S, I>(
  serviceRequests: SR[],
  mapper: ServiceRequestMapper<SR, R, S, I>,
  resourceExpectations: Expectation<Resource>[],
  spanExpectations: Expectation<I>[],
): MatchingItemsResult<I> {
  if (serviceRequests.length === 0) {
    fail('No service requests has been provided.');
  }
  const matchingItems: I[] = [];
  let bestCandidate: Candidate = {
    passedChecks: 0,
  };
  serviceRequests.forEach(serviceRequest => {
    mapper.getResourceItems(serviceRequest).forEach(resourceItem => {
      let passedResourceChecks = 0;
      if (resourceExpectations.length > 0) {
        // verify that the resource attributes match
        const resource = mapper.getResource(resourceItem);
        if (!resource) {
          // This resource span/log has no resource information, try the next one.
          return;
        }
        try {
          for (let j = 0; j < resourceExpectations.length; j++) {
            resourceExpectations[j](resource);
            passedResourceChecks++;
          }
        } catch (error) {
          // This resource did not pass all checks, try the next one. Memorize the resource if it has been the best
          // match so far.
          if (passedResourceChecks > bestCandidate.passedChecks || bestCandidate.item == null) {
            bestCandidate = {
              item: resourceItem,
              passedChecks: passedResourceChecks,
              error,
            };
          }
          return;
        }
      }

      mapper.getScopeItems(resourceItem).forEach(scopeItem => {
        mapper.getItems(scopeItem).forEach(item => {
          let passedChecks = passedResourceChecks;
          try {
            for (let j = 0; j < spanExpectations.length; j++) {
              spanExpectations[j](item);
              passedChecks++;
            }
            matchingItems.push(item);
          } catch (error) {
            // This span/log record did not pass all checks, try the next one. Memorize it if it has  been the best
            // match so far.
            if (passedChecks > bestCandidate.passedChecks) {
              bestCandidate = {
                item: item,
                passedChecks,
                error,
              };
            }
            return;
          }
        });
      });
    });
  });
  if (matchingItems.length > 0) {
    return { matchingItems };
  } else {
    return { bestCandidate };
  }
}

export function processFindItemsResult<T>(matchResult: MatchingItemsResult<T>, itemLabel: string): T {
  if (matchResult.matchingItems && matchResult.matchingItems.length >= 1) {
    return matchResult.matchingItems[0];
  } else if (matchResult.bestCandidate) {
    const bestCandidate = matchResult.bestCandidate;
    throw new Error(
      `No matching ${itemLabel} has been found. The best candidate passed ${bestCandidate.passedChecks} checks and failed check ${bestCandidate.passedChecks + 1} with error "${bestCandidate.error}". This is the best candidate:\n${JSON.stringify(bestCandidate.item, null, 2)}`,
    );
  } else {
    throw new Error(`No matching ${itemLabel} has been found.`);
  }
}
