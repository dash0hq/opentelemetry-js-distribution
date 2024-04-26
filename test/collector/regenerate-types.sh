#!/usr/bin/env bash

# SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
# SPDX-License-Identifier: Apache-2.0

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

generate_types_for_service() {
  local service=${1:-}
  if [[ -z $service ]]; then
    echo "generate_types_for_service: missing mandatory argument <service>"
    exit 1
  fi
  echo generating TypeScript type definitions for $service service.
  protoc \
    --plugin=../..//node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_opt=forceLong=string \
    --ts_proto_opt=snakeToCamel=false \
    --ts_proto_out=types \
    -I=./opentelemetry-proto \
    ./opentelemetry-proto/opentelemetry/proto/collector/${service}/v1/${service}_service.proto
  echo TypeScript type definitions for $service service have been generated.
}

generate_types_for_service trace
generate_types_for_service metrics
generate_types_for_service logs

echo
