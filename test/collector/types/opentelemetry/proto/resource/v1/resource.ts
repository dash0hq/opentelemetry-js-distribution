/* eslint-disable */
import * as _m0 from "protobufjs/minimal";
import { KeyValue } from "../../common/v1/common";

export const protobufPackage = "opentelemetry.proto.resource.v1";

/** Resource information. */
export interface Resource {
  /**
   * Set of attributes that describe the resource.
   * Attribute keys MUST be unique (it is not allowed to have more than one
   * attribute with the same key).
   */
  attributes: KeyValue[];
  /**
   * dropped_attributes_count is the number of dropped attributes. If the value is 0, then
   * no attributes were dropped.
   */
  dropped_attributes_count: number;
}

function createBaseResource(): Resource {
  return { attributes: [], dropped_attributes_count: 0 };
}

export const Resource = {
  encode(message: Resource, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.attributes) {
      KeyValue.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.dropped_attributes_count !== 0) {
      writer.uint32(16).uint32(message.dropped_attributes_count);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Resource {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResource();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.attributes.push(KeyValue.decode(reader, reader.uint32()));
          continue;
        case 2:
          if (tag !== 16) {
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

  fromJSON(object: any): Resource {
    return {
      attributes: globalThis.Array.isArray(object?.attributes)
        ? object.attributes.map((e: any) => KeyValue.fromJSON(e))
        : [],
      dropped_attributes_count: isSet(object.dropped_attributes_count)
        ? globalThis.Number(object.dropped_attributes_count)
        : 0,
    };
  },

  toJSON(message: Resource): unknown {
    const obj: any = {};
    if (message.attributes?.length) {
      obj.attributes = message.attributes.map((e) => KeyValue.toJSON(e));
    }
    if (message.dropped_attributes_count !== 0) {
      obj.dropped_attributes_count = Math.round(message.dropped_attributes_count);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Resource>, I>>(base?: I): Resource {
    return Resource.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Resource>, I>>(object: I): Resource {
    const message = createBaseResource();
    message.attributes = object.attributes?.map((e) => KeyValue.fromPartial(e)) || [];
    message.dropped_attributes_count = object.dropped_attributes_count ?? 0;
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
