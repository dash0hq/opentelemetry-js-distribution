/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { ResourceLogs } from "../../../logs/v1/logs";
import Long = require("long");

export const protobufPackage = "opentelemetry.proto.collector.logs.v1";

export interface ExportLogsServiceRequest {
  /**
   * An array of ResourceLogs.
   * For data coming from a single resource this array will typically contain one
   * element. Intermediary nodes (such as OpenTelemetry Collector) that receive
   * data from multiple origins typically batch the data before forwarding further and
   * in that case this array will contain multiple elements.
   */
  resource_logs: ResourceLogs[];
}

export interface ExportLogsServiceResponse {
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
  partial_success: ExportLogsPartialSuccess | undefined;
}

export interface ExportLogsPartialSuccess {
  /**
   * The number of rejected log records.
   *
   * A `rejected_<signal>` field holding a `0` value indicates that the
   * request was fully accepted.
   */
  rejected_log_records: string;
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

function createBaseExportLogsServiceRequest(): ExportLogsServiceRequest {
  return { resource_logs: [] };
}

export const ExportLogsServiceRequest = {
  encode(message: ExportLogsServiceRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.resource_logs) {
      ResourceLogs.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportLogsServiceRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportLogsServiceRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.resource_logs.push(ResourceLogs.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportLogsServiceRequest {
    return {
      resource_logs: globalThis.Array.isArray(object?.resource_logs)
        ? object.resource_logs.map((e: any) => ResourceLogs.fromJSON(e))
        : [],
    };
  },

  toJSON(message: ExportLogsServiceRequest): unknown {
    const obj: any = {};
    if (message.resource_logs?.length) {
      obj.resource_logs = message.resource_logs.map((e) => ResourceLogs.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportLogsServiceRequest>, I>>(base?: I): ExportLogsServiceRequest {
    return ExportLogsServiceRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportLogsServiceRequest>, I>>(object: I): ExportLogsServiceRequest {
    const message = createBaseExportLogsServiceRequest();
    message.resource_logs = object.resource_logs?.map((e) => ResourceLogs.fromPartial(e)) || [];
    return message;
  },
};

function createBaseExportLogsServiceResponse(): ExportLogsServiceResponse {
  return { partial_success: undefined };
}

export const ExportLogsServiceResponse = {
  encode(message: ExportLogsServiceResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.partial_success !== undefined) {
      ExportLogsPartialSuccess.encode(message.partial_success, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportLogsServiceResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportLogsServiceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.partial_success = ExportLogsPartialSuccess.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ExportLogsServiceResponse {
    return {
      partial_success: isSet(object.partial_success)
        ? ExportLogsPartialSuccess.fromJSON(object.partial_success)
        : undefined,
    };
  },

  toJSON(message: ExportLogsServiceResponse): unknown {
    const obj: any = {};
    if (message.partial_success !== undefined) {
      obj.partial_success = ExportLogsPartialSuccess.toJSON(message.partial_success);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportLogsServiceResponse>, I>>(base?: I): ExportLogsServiceResponse {
    return ExportLogsServiceResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportLogsServiceResponse>, I>>(object: I): ExportLogsServiceResponse {
    const message = createBaseExportLogsServiceResponse();
    message.partial_success = (object.partial_success !== undefined && object.partial_success !== null)
      ? ExportLogsPartialSuccess.fromPartial(object.partial_success)
      : undefined;
    return message;
  },
};

function createBaseExportLogsPartialSuccess(): ExportLogsPartialSuccess {
  return { rejected_log_records: "0", error_message: "" };
}

export const ExportLogsPartialSuccess = {
  encode(message: ExportLogsPartialSuccess, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.rejected_log_records !== "0") {
      writer.uint32(8).int64(message.rejected_log_records);
    }
    if (message.error_message !== "") {
      writer.uint32(18).string(message.error_message);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ExportLogsPartialSuccess {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExportLogsPartialSuccess();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.rejected_log_records = longToString(reader.int64() as Long);
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

  fromJSON(object: any): ExportLogsPartialSuccess {
    return {
      rejected_log_records: isSet(object.rejected_log_records) ? globalThis.String(object.rejected_log_records) : "0",
      error_message: isSet(object.error_message) ? globalThis.String(object.error_message) : "",
    };
  },

  toJSON(message: ExportLogsPartialSuccess): unknown {
    const obj: any = {};
    if (message.rejected_log_records !== "0") {
      obj.rejected_log_records = message.rejected_log_records;
    }
    if (message.error_message !== "") {
      obj.error_message = message.error_message;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ExportLogsPartialSuccess>, I>>(base?: I): ExportLogsPartialSuccess {
    return ExportLogsPartialSuccess.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ExportLogsPartialSuccess>, I>>(object: I): ExportLogsPartialSuccess {
    const message = createBaseExportLogsPartialSuccess();
    message.rejected_log_records = object.rejected_log_records ?? "0";
    message.error_message = object.error_message ?? "";
    return message;
  },
};

/**
 * Service that can be used to push logs between one Application instrumented with
 * OpenTelemetry and an collector, or between an collector and a central collector (in this
 * case logs are sent/received to/from multiple Applications).
 */
export interface LogsService {
  /**
   * For performance reasons, it is recommended to keep this RPC
   * alive for the entire life of the application.
   */
  Export(request: ExportLogsServiceRequest): Promise<ExportLogsServiceResponse>;
}

export const LogsServiceServiceName = "opentelemetry.proto.collector.logs.v1.LogsService";
export class LogsServiceClientImpl implements LogsService {
  private readonly rpc: Rpc;
  private readonly service: string;
  constructor(rpc: Rpc, opts?: { service?: string }) {
    this.service = opts?.service || LogsServiceServiceName;
    this.rpc = rpc;
    this.Export = this.Export.bind(this);
  }
  Export(request: ExportLogsServiceRequest): Promise<ExportLogsServiceResponse> {
    const data = ExportLogsServiceRequest.encode(request).finish();
    const promise = this.rpc.request(this.service, "Export", data);
    return promise.then((data) => ExportLogsServiceResponse.decode(_m0.Reader.create(data)));
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
