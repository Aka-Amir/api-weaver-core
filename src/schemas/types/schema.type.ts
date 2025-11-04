import { EnumType } from "./enum.type";

export type ObjectSchemaType = {
  type: "object";
  properties: Record<string, SchemaType>;
  required: string[];
  description?: string;
  example?: string;
};

export type ArraySchemaType = {
  type: "array";
  items: SchemaType;
  description?: string;
  example?: string;
};

export type EnumSchemaType = {
  type: string;
  enum?: EnumType;
  title?: string;
  description?: string;
  example?: string;
};

export type SchemaRefType = {
  $ref: string;
  description?: string;
  example?: string;
};
export type SchemaPropertyType = {
  description?: string;
  example?: string;
} & (ObjectSchemaType | ArraySchemaType | EnumSchemaType);

export type SchemaType = SchemaRefType | SchemaPropertyType;
