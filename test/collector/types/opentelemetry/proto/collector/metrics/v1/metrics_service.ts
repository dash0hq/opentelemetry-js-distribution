/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResourceMetrics } from "../../../metrics/v1/metrics";
import Long = require("long");

export const protobufPackage = "opentelemetry.proto.collector.metrics.v1";

export interface ExportMetricsServiceRequest {
  /**
   * An array of ResourceMetrics.
   * For data coming from a single resource this array will typically contain one
   * element. Intermediary nodes (such as OpenTelemetry Collector) that receive
   * data from multiple origins typically batch the data before forwarding further and
   * in that case this array will contain multiple elements.
   */
  resource_metrics: ResourceMetrics[];
}

export interface ExportMetricsServiceResponse {
  /**
   * The details of a partially successful export request.
   *
   * If the request is only partially accepted
   * (i.e. when the server accepts only parts of the data and rejects the rest)
   * the server MUST initialize the `partial_success` field and MUST
   * set the `rejected_<signal>` with the number of items it rejected.
   *
   * Servers MAY also make use of the `partial_success` field to convey
   * warnings/suggestions to senders even when the request was fully accepted.
   * In such cases, the `rejected_<signal>` MUST have a value of `0` and
   * the `error_message` MUST be non-empty.
   *
   * A `partial_success` message with an empty value (rejected_<signal> = 0 and
   * `error_message` = "") is equivalent to it not being set/present. Senders
   * SHOULD interpret it the same way as in the full success case.
   */
  partial_success: ExportMetricsPartialSuccess | undefined;
}

export interface ExportMetricsPartialSuccess {
  /**
   * The number of rejected data points.
   *
   * A `rejected_<signal>` field holding a `0` value indicates that the
   * request was fully accepted.
   */
  rejected_data_points: string;
  /**
   * A developer-facing human-readable message in English. It should be used
   * either to explain why the server rejected parts of the data during a partial
   * success or to convey warnings/suggestions during a full success. The message
   * should offer guidance on how users can address such issues.
   *
   * error_message is an optional field. An error_message with an empty value
   * is equivalent to it not being set.
   */
  error_message: string;
}

function createBaseExportMetricsServiceRequest(): ExportMetricsServiceRequest {
  return { resource_metrics: [] };
}

export const ExportMetricsServiceRequest = {
  encode(message: ExportMetricsServiceRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.resource_metrics) {
      ResourceMetrics.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportMetricsServiceRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportMetricsServiceRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.resource_metrics.push(ResourceMetrics.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportMetricsServiceRequest {
    return {
      resource_metrics: globalThis.Array.isArray(object?.resource_metrics)
        ? object.resource_metrics.map((e: any) => ResourceMetrics.fromJSON(e))
        : [],
    };
  },

  toJSON(message: ExportMetricsServiceRequest): unknown {
    const obj: any = {};
    if (message.resource_metrics?.length) {
      obj.resource_metrics = message.resource_metrics.map((e) => ResourceMetrics.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportMetricsServiceRequest>, I>>(base?: I): ExportMetricsServiceRequest {
    return ExportMetricsServiceRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportMetricsServiceRequest>, I>>(object: I): ExportMetricsServiceRequest {
    const message = createBaseExportMetricsServiceRequest();
    message.resource_metrics = object.resource_metrics?.map((e) => ResourceMetrics.fromPartial(e)) || [];
    return message;
  },
};

function createBaseExportMetricsServiceResponse(): ExportMetricsServiceResponse {
  return { partial_success: undefined };
}

export const ExportMetricsServiceResponse = {
  encode(message: ExportMetricsServiceResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.partial_success !== undefined) {
      ExportMetricsPartialSuccess.encode(message.partial_success, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportMetricsServiceResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportMetricsServiceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.partial_success = ExportMetricsPartialSuccess.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportMetricsServiceResponse {
    return {
      partial_success: isSet(object.partial_success)
        ? ExportMetricsPartialSuccess.fromJSON(object.partial_success)
        : undefined,
    };
  },

  toJSON(message: ExportMetricsServiceResponse): unknown {
    const obj: any = {};
    if (message.partial_success !== undefined) {
      obj.partial_success = ExportMetricsPartialSuccess.toJSON(message.partial_success);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportMetricsServiceResponse>, I>>(base?: I): ExportMetricsServiceResponse {
    return ExportMetricsServiceResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportMetricsServiceResponse>, I>>(object: I): ExportMetricsServiceResponse {
    const message = createBaseExportMetricsServiceResponse();
    message.partial_success = (object.partial_success !== undefined && object.partial_success !== null)
      ? ExportMetricsPartialSuccess.fromPartial(object.partial_success)
      : undefined;
    return message;
  },
};

function createBaseExportMetricsPartialSuccess(): ExportMetricsPartialSuccess {
  return { rejected_data_points: "0", error_message: "" };
}

export const ExportMetricsPartialSuccess = {
  encode(message: ExportMetricsPartialSuccess, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.rejected_data_points !== "0") {
      writer.uint32(8).int64(message.rejected_data_points);
    }
    if (message.error_message !== "") {
      writer.uint32(18).string(message.error_message);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportMetricsPartialSuccess {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportMetricsPartialSuccess();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.rejected_data_points = longToString(reader.int64() as Long);
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.error_message = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportMetricsPartialSuccess {
    return {
      rejected_data_points: isSet(object.rejected_data_points) ? globalThis.String(object.rejected_data_points) : "0",
      error_message: isSet(object.error_message) ? globalThis.String(object.error_message) : "",
    };
  },

  toJSON(message: ExportMetricsPartialSuccess): unknown {
    const obj: any = {};
    if (message.rejected_data_points !== "0") {
      obj.rejected_data_points = message.rejected_data_points;
    }
    if (message.error_message !== "") {
      obj.error_message = message.error_message;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportMetricsPartialSuccess>, I>>(base?: I): ExportMetricsPartialSuccess {
    return ExportMetricsPartialSuccess.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportMetricsPartialSuccess>, I>>(object: I): ExportMetricsPartialSuccess {
    const message = createBaseExportMetricsPartialSuccess();
    message.rejected_data_points = object.rejected_data_points ?? "0";
    message.error_message = object.error_message ?? "";
    return message;
  },
};

/**
 * Service that can be used to push metrics between one Application
 * instrumented with OpenTelemetry and a collector, or between a collector and a
 * central collector.
 */
export interface MetricsService {
  /**
   * For performance reasons, it is recommended to keep this RPC
   * alive for the entire life of the application.
   */
  Export(request: ExportMetricsServiceRequest): Promise<ExportMetricsServiceResponse>;
}

export const MetricsServiceServiceName = "opentelemetry.proto.collector.metrics.v1.MetricsService";
export class MetricsServiceClientImpl implements MetricsService {
  private readonly rpc: Rpc;
  private readonly service: string;
  constructor(rpc: Rpc, opts?: { service?: string }) {
    this.service = opts?.service || MetricsServiceServiceName;
    this.rpc = rpc;
    this.Export = this.Export.bind(this);
  }
  Export(request: ExportMetricsServiceRequest): Promise<ExportMetricsServiceResponse> {
    const data = ExportMetricsServiceRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, "Export", data);
    return promise.then((data) => ExportMetricsServiceResponse.decode(_m0.Reader.create(data)));
  }
}

interface Rpc {
  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function longToString(long: Long) {
  return long.toString();
}

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
