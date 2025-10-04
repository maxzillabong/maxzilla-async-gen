export interface ParsedMessage {
  name: string;
  description?: string;
  payload: SchemaObject;
  headers?: SchemaObject;
}

export interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  enum?: string[];
  description?: string;
  $ref?: string;
  allOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  format?: string;
  additionalProperties?: boolean | SchemaObject;
}

export interface ParsedChannel {
  name: string;
  address?: string;
  description?: string;
  messages: ParsedMessage[];
  operations: {
    send?: ParsedOperation[];
    receive?: ParsedOperation[];
  };
}

export interface ParsedOperation {
  action: 'send' | 'receive';
  channel: string;
  messages: ParsedMessage[];
  description?: string;
}

export interface ParsedAsyncAPI {
  title: string;
  version: string;
  description?: string;
  channels: ParsedChannel[];
  messages: ParsedMessage[];
  schemas: Record<string, SchemaObject>;
}

export interface GeneratorOptions {
  enumType?: 'enum' | 'union';
  exportEverything?: boolean;
  useUnknown?: boolean;
  noEmit?: boolean;
}
