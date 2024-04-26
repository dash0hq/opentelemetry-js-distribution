/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import Long = require("long");

export const protobufPackage = "opentelemetry.proto.common.v1";

/**
 * AnyValue is used to represent any type of attribute value. AnyValue may contain a
 * primitive value such as a string or integer or it may contain an arbitrary nested
 * object containing arrays, key-value lists and primitives.
 */
export interface AnyValue {
  string_value?: string | undefined;
  bool_value?: boolean | undefined;
  int_value?: string | undefined;
  double_value?: number | undefined;
  array_value?: ArrayValue | undefined;
  kvlist_value?: KeyValueList | undefined;
  bytes_value?: Uint8Array | undefined;
}

/**
 * ArrayValue is a list of AnyValue messages. We need ArrayValue as a message
 * since oneof in AnyValue does not allow repeated fields.
 */
export interface ArrayValue {
  /** Array of values. The array may be empty (contain 0 elements). */
  values: AnyValue[];
}

/**
 * KeyValueList is a list of KeyValue messages. We need KeyValueList as a message
 * since `oneof` in AnyValue does not allow repeated fields. Everywhere else where we need
 * a list of KeyValue messages (e.g. in Span) we use `repeated KeyValue` directly to
 * avoid unnecessary extra wrapping (which slows down the protocol). The 2 approaches
 * are semantically equivalent.
 */
export interface KeyValueList {
  /**
   * A collection of key/value pairs of key-value pairs. The list may be empty (may
   * contain 0 elements).
   * The keys MUST be unique (it is not allowed to have more than one
   * value with the same key).
   */
  values: KeyValue[];
}

/**
 * KeyValue is a key-value pair that is used to store Span attributes, Link
 * attributes, etc.
 */
export interface KeyValue {
  key: string;
  value: AnyValue | undefined;
}

/**
 * InstrumentationScope is a message representing the instrumentation scope information
 * such as the fully qualified name and version.
 */
export interface InstrumentationScope {
  /** An empty instrumentation scope name means the name is unknown. */
  name: string;
  version: string;
  /**
   * Additional attributes that describe the scope. [Optional].
   * Attribute keys MUST be unique (it is not allowed to have more than one
   * attribute with the same key).
   */
  attributes: KeyValue[];
  dropped_attributes_count: number;
}

function createBaseAnyValue(): AnyValue {
  return {
    string_value: undefined,
    bool_value: undefined,
    int_value: undefined,
    double_value: undefined,
    array_value: undefined,
    kvlist_value: undefined,
    bytes_value: undefined,
  };
}

export const AnyValue = {
  encode(message: AnyValue, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.string_value !== undefined) {
      writer.uint32(10).string(message.string_value);
    }
    if (message.bool_value !== undefined) {
      writer.uint32(16).bool(message.bool_value);
    }
    if (message.int_value !== undefined) {
      writer.uint32(24).int64(message.int_value);
    }
    if (message.double_value !== undefined) {
      writer.uint32(33).double(message.double_value);
    }
    if (message.array_value !== undefined) {
      ArrayValue.encode(message.array_value, writer.uint32(42).fork()).ldelim();
    }
    if (message.kvlist_value !== undefined) {
      KeyValueList.encode(message.kvlist_value, writer.uint32(50).fork()).ldelim();
    }
    if (message.bytes_value !== undefined) {
      writer.uint32(58).bytes(message.bytes_value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AnyValue {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAnyValue();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.string_value = reader.string();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.bool_value = reader.bool();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.int_value = longToString(reader.int64() as Long);
          continue;
        case 4:
          if (tag !== 33) {
            break;
          }

          message.double_value = reader.double();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.array_value = ArrayValue.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.kvlist_value = KeyValueList.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.bytes_value = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): AnyValue {
    return {
      string_value: isSet(object.string_value) ? globalThis.String(object.string_value) : undefined,
      bool_value: isSet(object.bool_value) ? globalThis.Boolean(object.bool_value) : undefined,
      int_value: isSet(object.int_value) ? globalThis.String(object.int_value) : undefined,
      double_value: isSet(object.double_value) ? globalThis.Number(object.double_value) : undefined,
      array_value: isSet(object.array_value) ? ArrayValue.fromJSON(object.array_value) : undefined,
      kvlist_value: isSet(object.kvlist_value) ? KeyValueList.fromJSON(object.kvlist_value) : undefined,
      bytes_value: isSet(object.bytes_value) ? bytesFromBase64(object.bytes_value) : undefined,
    };
  },

  toJSON(message: AnyValue): unknown {
    const obj: any = {};
    if (message.string_value !== undefined) {
      obj.string_value = message.string_value;
    }
    if (message.bool_value !== undefined) {
      obj.bool_value = message.bool_value;
    }
    if (message.int_value !== undefined) {
      obj.int_value = message.int_value;
    }
    if (message.double_value !== undefined) {
      obj.double_value = message.double_value;
    }
    if (message.array_value !== undefined) {
      obj.array_value = ArrayValue.toJSON(message.array_value);
    }
    if (message.kvlist_value !== undefined) {
      obj.kvlist_value = KeyValueList.toJSON(message.kvlist_value);
    }
    if (message.bytes_value !== undefined) {
      obj.bytes_value = base64FromBytes(message.bytes_value);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<AnyValue>, I>>(base?: I): AnyValue {
    return AnyValue.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<AnyValue>, I>>(object: I): AnyValue {
    const message = createBaseAnyValue();
    message.string_value = object.string_value ?? undefined;
    message.bool_value = object.bool_value ?? undefined;
    message.int_value = object.int_value ?? undefined;
    message.double_value = object.double_value ?? undefined;
    message.array_value = (object.array_value !== undefined && object.array_value !== null)
      ? ArrayValue.fromPartial(object.array_value)
      : undefined;
    message.kvlist_value = (object.kvlist_value !== undefined && object.kvlist_value !== null)
      ? KeyValueList.fromPartial(object.kvlist_value)
      : undefined;
    message.bytes_value = object.bytes_value ?? undefined;
    return message;
  },
};

function createBaseArrayValue(): ArrayValue {
  return { values: [] };
}

export const ArrayValue = {
  encode(message: ArrayValue, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.values) {
      AnyValue.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ArrayValue {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseArrayValue();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.values.push(AnyValue.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ArrayValue {
    return {
      values: globalThis.Array.isArray(object?.values) ? object.values.map((e: any) => AnyValue.fromJSON(e)) : [],
    };
  },

  toJSON(message: ArrayValue): unknown {
    const obj: any = {};
    if (message.values?.length) {
      obj.values = message.values.map((e) => AnyValue.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ArrayValue>, I>>(base?: I): ArrayValue {
    return ArrayValue.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ArrayValue>, I>>(object: I): ArrayValue {
    const message = createBaseArrayValue();
    message.values = object.values?.map((e) => AnyValue.fromPartial(e)) || [];
    return message;
  },
};

function createBaseKeyValueList(): KeyValueList {
  return { values: [] };
}

export const KeyValueList = {
  encode(message: KeyValueList, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.values) {
      KeyValue.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): KeyValueList {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseKeyValueList();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.values.push(KeyValue.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): KeyValueList {
    return {
      values: globalThis.Array.isArray(object?.values) ? object.values.map((e: any) => KeyValue.fromJSON(e)) : [],
    };
  },

  toJSON(message: KeyValueList): unknown {
    const obj: any = {};
    if (message.values?.length) {
      obj.values = message.values.map((e) => KeyValue.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<KeyValueList>, I>>(base?: I): KeyValueList {
    return KeyValueList.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<KeyValueList>, I>>(object: I): KeyValueList {
    const message = createBaseKeyValueList();
    message.values = object.values?.map((e) => KeyValue.fromPartial(e)) || [];
    return message;
  },
};

function createBaseKeyValue(): KeyValue {
  return { key: "", value: undefined };
}

export const KeyValue = {
  encode(message: KeyValue, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      AnyValue.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): KeyValue {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseKeyValue();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = AnyValue.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): KeyValue {
    return {
      key: isSet(object.key) ? globalThis.String(object.key) : "",
      value: isSet(object.value) ? AnyValue.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: KeyValue): unknown {
    const obj: any = {};
    if (message.key !== "") {
      obj.key = message.key;
    }
    if (message.value !== undefined) {
      obj.value = AnyValue.toJSON(message.value);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<KeyValue>, I>>(base?: I): KeyValue {
    return KeyValue.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<KeyValue>, I>>(object: I): KeyValue {
    const message = createBaseKeyValue();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? AnyValue.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseInstrumentationScope(): InstrumentationScope {
  return { name: "", version: "", attributes: [], dropped_attributes_count: 0 };
}

export const InstrumentationScope = {
  encode(message: InstrumentationScope, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.version !== "") {
      writer.uint32(18).string(message.version);
    }
    for (const v of message.attributes) {
      KeyValue.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.dropped_attributes_count !== 0) {
      writer.uint32(32).uint32(message.dropped_attributes_count);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): InstrumentationScope {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInstrumentationScope();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.version = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.attributes.push(KeyValue.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.dropped_attributes_count = reader.uint32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): InstrumentationScope {
    return {
      name: isSet(object.name) ? globalThis.String(object.name) : "",
      version: isSet(object.version) ? globalThis.String(object.version) : "",
      attributes: globalThis.Array.isArray(object?.attributes)
        ? object.attributes.map((e: any) => KeyValue.fromJSON(e))
        : [],
      dropped_attributes_count: isSet(object.dropped_attributes_count)
        ? globalThis.Number(object.dropped_attributes_count)
        : 0,
    };
  },

  toJSON(message: InstrumentationScope): unknown {
    const obj: any = {};
    if (message.name !== "") {
      obj.name = message.name;
    }
    if (message.version !== "") {
      obj.version = message.version;
    }
    if (message.attributes?.length) {
      obj.attributes = message.attributes.map((e) => KeyValue.toJSON(e));
    }
    if (message.dropped_attributes_count !== 0) {
      obj.dropped_attributes_count = Math.round(message.dropped_attributes_count);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<InstrumentationScope>, I>>(base?: I): InstrumentationScope {
    return InstrumentationScope.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<InstrumentationScope>, I>>(object: I): InstrumentationScope {
    const message = createBaseInstrumentationScope();
    message.name = object.name ?? "";
    message.version = object.version ?? "";
    message.attributes = object.attributes?.map((e) => KeyValue.fromPartial(e)) || [];
    message.dropped_attributes_count = object.dropped_attributes_count ?? 0;
    return message;
  },
};

function bytesFromBase64(b64: string): Uint8Array {
  if ((globalThis as any).Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = globalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if ((globalThis as any).Buffer) {
    return globalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(globalThis.String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(""));
  }
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
