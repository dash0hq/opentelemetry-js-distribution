Dash0 Node.js OpenTelemetry Distribution
========================================

This is the Dash0 OpenTelemetry distribution for Node.js.
It is primarily intended to be used by the [Dash0 Kubernetes operator](https://github.com/dash0hq/dash0-operator) to
instrument Node.js workloads with OpenTelemetry.

Configuration
-------------

### <a id="DASH0_AUTOMATIC_SERVICE_NAME">DASH0_AUTOMATIC_SERVICE_NAME</a>

If no service name has been set, a service name and a service version are automatically derived by reading the main `package.json` file
(if it is present):
* The `service.name` resource attribute will be set to the value of the `name` attribute found in the `package.json` file.
* The `service.version` resource attribute will be set to the value of the `version` attribute found in the `package.json` file.

This behavior can be disabled either
* by setting an explicit service name using the `OTEL_SERVICE_NAME` environment variable,
* by setting an explicit service name using the `OTEL_RESOURCE_ATTRIBUTES` environment variable (using the `service.name` attribute key), or
* by setting the environment variable `DASH0_AUTOMATIC_SERVICE_NAME=false`.

### <a id="DASH0_BOOTSTRAP_SPAN">DASH0_BOOTSTRAP_SPAN</a>

If set to a non-empty string, the distribution will create a span immediately at startup with the span name set to the
value of DASH0_BOOTSTRAP_SPAN.

### <a id="DASH0_DEBUG">DASH0_DEBUG</a>

Additional debug logs can be enabled by setting `DASH0_DEBUG=true`.

### <a id="DASH0_DEBUG_PRINT_SPANS">DASH0_DEBUG_PRINT_SPANS</a>

If `DASH0_DEBUG_PRINT_SPANS=true` is set, all spans are printed to `stdout` via the
[ConsoleSpanExporter](https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk_trace_base.ConsoleSpanExporter.html).

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

The base URL of the OpenTelemetry collector that the distribution will send data to, for example
`http://localhost:4318`.
The distribution appends `/v1/traces`, `/v1/metrics` and `/v1/logs` to it.

This variable is required unless a [declarative configuration file](#declarative-configuration) is used.
If neither is set, the distribution does not start.
When both are set, the configuration file takes precedence and `DASH0_OTEL_COLLECTOR_BASE_URL` is ignored, with a
warning.

### <a id="declarative-configuration">Declarative configuration</a>

Instead of environment variables, the OpenTelemetry SDK can be configured with an OpenTelemetry
[declarative configuration file](https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/),
by setting `OTEL_CONFIG_FILE` to its path.
The file then is the complete SDK configuration: it defines the exporters, endpoints, processors, sampling and the
resource.
As the specification requires, other `OTEL_*` environment variables are ignored unless the file references them via
`${VARIABLE}` substitution.

A minimal file that exports all three signals to a collector looks like this:

```yaml
file_format: "1.0"
resource:
  attributes:
    - name: service.name
      value: ${OTEL_SERVICE_NAME:-unknown_service}
  attributes_list: ${OTEL_RESOURCE_ATTRIBUTES:-}
tracer_provider:
  processors:
    - batch:
        exporter:
          otlp_http:
            endpoint: http://localhost:4318/v1/traces
meter_provider:
  readers:
    - periodic:
        exporter:
          otlp_http:
            endpoint: http://localhost:4318/v1/metrics
logger_provider:
  processors:
    - batch:
        exporter:
          otlp_http:
            endpoint: http://localhost:4318/v1/logs
```

Declarative configuration requires Node.js 18.19.0 or later, excluding 20.0.0 to 20.5.1.
On older Node.js versions, the configuration file is ignored with a warning, and the distribution falls back to
`DASH0_OTEL_COLLECTOR_BASE_URL`; if that is not set either, the distribution does not start.

If the file cannot be loaded, an error is logged and the application keeps running without telemetry.

Because the file defines the whole SDK, the following do not apply when a configuration file is used:
* [DASH0_AUTOMATIC_SERVICE_NAME](#DASH0_AUTOMATIC_SERVICE_NAME): the service name is not derived from `package.json`;
  set `service.name` in the file instead.
* [DASH0_DEBUG_PRINT_SPANS](#DASH0_DEBUG_PRINT_SPANS): add a span processor with a `console` exporter to the file
  instead.
* The `k8s.pod.uid` resource attribute, which the distribution otherwise detects when running in Kubernetes.
* The `telemetry.distro.name` and `telemetry.distro.version` resource attributes.
* `OTEL_METRIC_EXPORT_INTERVAL` and `OTEL_METRIC_EXPORT_TIMEOUT`: set `interval` and `timeout` on the periodic metric
  reader in the file instead.

These continue to work as described above:
[DASH0_BOOTSTRAP_SPAN](#DASH0_BOOTSTRAP_SPAN), [DASH0_DEBUG](#DASH0_DEBUG), [DASH0_DISABLE](#DASH0_DISABLE),
[DASH0_ENABLE_FS_INSTRUMENTATION](#DASH0_ENABLE_FS_INSTRUMENTATION),
[DASH0_FLUSH_ON_SIGTERM_SIGINT](#DASH0_FLUSH_ON_SIGTERM_SIGINT),
[DASH0_FLUSH_ON_EMPTY_EVENT_LOOP](#DASH0_FLUSH_ON_EMPTY_EVENT_LOOP), and
[enabling only specific instrumentations](#enabling-only-specific-instrumentations).

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
