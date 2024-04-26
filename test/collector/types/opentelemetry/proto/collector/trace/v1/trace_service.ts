/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResourceSpans } from "../../../trace/v1/trace";
import Long = require("long");

export const protobufPackage = "opentelemetry.proto.collector.trace.v1";

export interface ExportTraceServiceRequest {
  /**
   * An array of ResourceSpans.
   * For data coming from a single resource this array will typically contain one
   * element. Intermediary nodes (such as OpenTelemetry Collector) that receive
   * data from multiple origins typically batch the data before forwarding further and
   * in that case this array will contain multiple elements.
   */
  resource_spans: ResourceSpans[];
}

export interface ExportTraceServiceResponse {
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
  partial_success: ExportTracePartialSuccess | undefined;
}

export interface ExportTracePartialSuccess {
  /**
   * The number of rejected spans.
   *
   * A `rejected_<signal>` field holding a `0` value indicates that the
   * request was fully accepted.
   */
  rejected_spans: string;
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

function createBaseExportTraceServiceRequest(): ExportTraceServiceRequest {
  return { resource_spans: [] };
}

export const ExportTraceServiceRequest = {
  encode(message: ExportTraceServiceRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.resource_spans) {
      ResourceSpans.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportTraceServiceRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportTraceServiceRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.resource_spans.push(ResourceSpans.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportTraceServiceRequest {
    return {
      resource_spans: globalThis.Array.isArray(object?.resource_spans)
        ? object.resource_spans.map((e: any) => ResourceSpans.fromJSON(e))
        : [],
    };
  },

  toJSON(message: ExportTraceServiceRequest): unknown {
    const obj: any = {};
    if (message.resource_spans?.length) {
      obj.resource_spans = message.resource_spans.map((e) => ResourceSpans.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportTraceServiceRequest>, I>>(base?: I): ExportTraceServiceRequest {
    return ExportTraceServiceRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportTraceServiceRequest>, I>>(object: I): ExportTraceServiceRequest {
    const message = createBaseExportTraceServiceRequest();
    message.resource_spans = object.resource_spans?.map((e) => ResourceSpans.fromPartial(e)) || [];
    return message;
  },
};

function createBaseExportTraceServiceResponse(): ExportTraceServiceResponse {
  return { partial_success: undefined };
}

export const ExportTraceServiceResponse = {
  encode(message: ExportTraceServiceResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.partial_success !== undefined) {
      ExportTracePartialSuccess.encode(message.partial_success, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportTraceServiceResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportTraceServiceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.partial_success = ExportTracePartialSuccess.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportTraceServiceResponse {
    return {
      partial_success: isSet(object.partial_success)
        ? ExportTracePartialSuccess.fromJSON(object.partial_success)
        : undefined,
    };
  },

  toJSON(message: ExportTraceServiceResponse): unknown {
    const obj: any = {};
    if (message.partial_success !== undefined) {
      obj.partial_success = ExportTracePartialSuccess.toJSON(message.partial_success);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportTraceServiceResponse>, I>>(base?: I): ExportTraceServiceResponse {
    return ExportTraceServiceResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportTraceServiceResponse>, I>>(object: I): ExportTraceServiceResponse {
    const message = createBaseExportTraceServiceResponse();
    message.partial_success = (object.partial_success !== undefined && object.partial_success !== null)
      ? ExportTracePartialSuccess.fromPartial(object.partial_success)
      : undefined;
    return message;
  },
};

function createBaseExportTracePartialSuccess(): ExportTracePartialSuccess {
  return { rejected_spans: "0", error_message: "" };
}

export const ExportTracePartialSuccess = {
  encode(message: ExportTracePartialSuccess, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.rejected_spans !== "0") {
      writer.uint32(8).int64(message.rejected_spans);
    }
    if (message.error_message !== "") {
      writer.uint32(18).string(message.error_message);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportTracePartialSuccess {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportTracePartialSuccess();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.rejected_spans = longToString(reader.int64() as Long);
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

  fromJSON(object: any): ExportTracePartialSuccess {
    return {
      rejected_spans: isSet(object.rejected_spans) ? globalThis.String(object.rejected_spans) : "0",
      error_message: isSet(object.error_message) ? globalThis.String(object.error_message) : "",
    };
  },

  toJSON(message: ExportTracePartialSuccess): unknown {
    const obj: any = {};
    if (message.rejected_spans !== "0") {
      obj.rejected_spans = message.rejected_spans;
    }
    if (message.error_message !== "") {
      obj.error_message = message.error_message;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportTracePartialSuccess>, I>>(base?: I): ExportTracePartialSuccess {
    return ExportTracePartialSuccess.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportTracePartialSuccess>, I>>(object: I): ExportTracePartialSuccess {
    const message = createBaseExportTracePartialSuccess();
    message.rejected_spans = object.rejected_spans ?? "0";
    message.error_message = object.error_message ?? "";
    return message;
  },
};

/**
 * Service that can be used to push spans between one Application instrumented with
 * OpenTelemetry and a collector, or between a collector and a central collector (in this
 * case spans are sent/received to/from multiple Applications).
 */
export interface TraceService {
  /**
   * For performance reasons, it is recommended to keep this RPC
   * alive for the entire life of the application.
   */
  Export(request: ExportTraceServiceRequest): Promise<ExportTraceServiceResponse>;
}

export const TraceServiceServiceName = "opentelemetry.proto.collector.trace.v1.TraceService";
export class TraceServiceClientImpl implements TraceService {
  private readonly rpc: Rpc;
  private readonly service: string;
  constructor(rpc: Rpc, opts?: { service?: string }) {
    this.service = opts?.service || TraceServiceServiceName;
    this.rpc = rpc;
    this.Export = this.Export.bind(this);
  }
  Export(request: ExportTraceServiceRequest): Promise<ExportTraceServiceResponse> {
    const data = ExportTraceServiceRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, "Export", data);
    return promise.then((data) => ExportTraceServiceResponse.decode(_m0.Reader.create(data)));
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
