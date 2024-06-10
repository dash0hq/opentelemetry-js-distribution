Dash0 Node.js OpenTelemetry Distribution
========================================

This is the Dash0 OpenTelemetry distribution for Node.js.
It is primarily intended to be used by the [Dash0 Kubernetes operator](https://github.com/dash0hq/dash0-operator) to
instrument Node.js workloads with OpenTelemetry.

Configuration
-------------

### <a id="DASH0_AUTOMATIC_SERVICE_NAME">DASH0_AUTOMATIC_SERVICE_NAME</a>

If no `OTEL_SERVICE_NAME` has been set, a service name is automatically derived by reading the main `package.json` file
(if it is present) as `${packageJson.name}@${packageJson.version}`.
This can be disabled either by setting `OTEL_SERVICE_NAME` or by setting `DASH0_AUTOMATIC_SERVICE_NAME=false`.

### <a id="DASH0_DEBUG">DASH0_DEBUG</a>

Additional debug logs can be enabled by setting `DASH0_DEBUG=true`.

### <a id="DASH0_DISABLE">DASH0_DISABLE</a>

Disables the Dash0 Node.js distribution entirely.

### <a id="DASH0_ENABLE_FS_INSTRUMENTATION">DASH0_ENABLE_FS_INSTRUMENTATION</a>

By default, the instrumentation plug-in `@opentelemetry/instrumentation-fs` is disabled. Set `DASH0_ENABLE_FS_INSTRUMENTATION=true` to enable spans for file system access.

### <a id="DASH0_OTEL_COLLECTOR_BASE_URL">DASH0_OTEL_COLLECTOR_BASE_URL</a>

The base URL of the OpenTelemetry collector that the distribution will send data to.
It defaults to `http://dash0-operator-opentelemetry-collector.dash0-operator-system.svc.cluster.local:4318`.

### Enabling only specific instrumentations

By default, all
[supported instrumentations](#https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/metapackages/auto-instrumentations-node/README.md#supported-instrumentations)
are enabled (with the exception of `@opentelemetry/instrumentation-fs`), but you can use the environment variable
`OTEL_NODE_ENABLED_INSTRUMENTATIONS` to enable only certain instrumentations by providing a comma-separated list of the
instrumentation package names without the `@opentelemetry/instrumentation-` prefix.

For example, to enable only
[@opentelemetry/instrumentation-http](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-instrumentation-http)
and [@opentelemetry/instrumentation-nestjs-core](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-nestjs-core)
instrumentations, set `OTEL_NODE_ENABLED_INSTRUMENTATIONS="http,nestjs-core"`.

See https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/metapackages/auto-instrumentations-node/README.md#usage-auto-instrumentation for more information.
