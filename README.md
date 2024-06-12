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

### <a id="DASH0_BOOTSTRAP_SPAN">DASH0_BOOTSTRAP_SPAN</a>

If set to a non-empty string, the distribution will create a span immediately at startup with the span name set to the
value of DASH0_BOOTSTRAP_SPAN.

### <a id="DASH0_DEBUG">DASH0_DEBUG</a>

Additional debug logs can be enabled by setting `DASH0_DEBUG=true`.

### <a id="DASH0_DEBUG_PRINT_SPANS">DASH0_DEBUG_PRINT_SPANS</a>

If `DASH0_DEBUG_PRINT_SPANS=true` is set, all spans are printed to `stdout` via the
[ConsoleSpanExporter](https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk_trace_base.ConsoleSpanExporter.html).
If `DASH0_DEBUG_PRINT_SPANS` is set to any other non-empty string, the value is interpreted as a file system path.
Spans will be appended to that file.
The file will be created if it does not exist.
If the file cannot be opened for writing, a message will be printed to `stderr` and no spans will be printed to file.
The spans are printed in the same format that the `ConsoleSpanExporter` uses.
This facility is meant for troubleshooting and should not be activated in production.

### <a id="DASH0_DISABLE">DASH0_DISABLE</a>

Disables the Dash0 Node.js distribution entirely.

### <a id="DASH0_ENABLE_FS_INSTRUMENTATION">DASH0_ENABLE_FS_INSTRUMENTATION</a>

By default, the instrumentation plug-in `@opentelemetry/instrumentation-fs` is disabled. Set `DASH0_ENABLE_FS_INSTRUMENTATION=true` to enable spans for file system access.


### <a id="DASH0_FLUSH_ON_SIGTERM_SIGINT">DASH0_FLUSH_ON_SIGTERM_SIGINT</a>

If `DASH0_FLUSH_ON_SIGTERM_SIGINT=true` is set, the Dash0 Node.js distribution will install a handler for SIGTERM and
SIGINT that will shutdown the OpenTelemetry SDK gracefully when one of these signals is received.
The SDK shutdown is timeboxed to 500 milliseconds.
The signal handler will call `process.exit(0)` after the SDK's shutdown has completed, or after the 500 millisecond
timeout, whichever happens sooner.
This option can be helpful if you care about telemetry that is being produced shortly before the process terminates.
This option must not be used if the application under monitoring has its own handler for SIGTERM or SIGINT, because
Dash0's handler (and in particular the necessary `process.exit(0)` call) might interfere with the application's own
signal handler.

### <a id="DASH0_FLUSH_ON_EMPTY_EVENT_LOOP">DASH0_FLUSH_ON_EMPTY_EVENT_LOOP</a>

By default, the Dash0 Node.js distribution will install a hook that will shutdown the OpenTelemetry SDK gracefully when
the Node.js runtime is about to exit because the event loop is empty.
This can be disabled by setting `DASH0_FLUSH_ON_EMPTY_EVENT_LOOP=false`.
The SDK shutdown is timeboxed to 500 milliseconds.
This hook can be helpful if you care about telemetry that is being produced shortly before the process
exits.
Disabling it can be useful if you care about the process terminating as quickly as possible when the event loop is
empty.
In contrast to the handlers for SIGTERM/SIGINT (see above), this hook will not call `process.exit` (since the Node.js
runtime will exit on its own anyway).

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
