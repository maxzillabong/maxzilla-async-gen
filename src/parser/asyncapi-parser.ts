import { Parser } from '@asyncapi/parser';
import type { ParsedAsyncAPI, ParsedChannel, ParsedMessage, SchemaObject } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class AsyncAPIParser {
  private parser: Parser;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private rawSpec: any = null;

  constructor() {
    this.parser = new Parser();
  }

  async parse(filePath: string): Promise<ParsedAsyncAPI> {
    const content = await this.readFile(filePath);

    // Parse raw JSON to preserve $refs before AsyncAPI parser resolves them
    try {
      this.rawSpec = JSON.parse(content);
    } catch (e) {
      // YAML files will fail JSON.parse, that's okay
      this.rawSpec = null;
    }

    const { document, diagnostics } = await this.parser.parse(content);

    if (diagnostics.length > 0) {
      const errors = diagnostics.filter(d => d.severity === 0);
      const warnings = diagnostics.filter(d => d.severity === 1);

      if (warnings.length > 0) {
        console.warn(`\n⚠️  AsyncAPI warnings (${warnings.length}):`);
        warnings.forEach(w => console.warn(`   - ${w.message}`));
      }

      if (errors.length > 0) {
        console.error(`\n❌ AsyncAPI errors (${errors.length}):`);
        errors.forEach(e => console.error(`   - ${e.message}`));
        throw new Error(`Failed to parse AsyncAPI specification. See errors above.`);
      }
    }

    if (!document) {
      throw new Error('Failed to parse AsyncAPI document');
    }

    return this.extractData(document);
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      const resolvedPath = path.resolve(filePath);

      const stats = await fs.stat(resolvedPath);

      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      if (stats.size > this.MAX_FILE_SIZE) {
        throw new Error(`File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      return await fs.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      }
      throw error;
    }
  }

  private extractData(document: any): ParsedAsyncAPI {
    const info = document.info();
    const channels = this.extractChannels(document);
    const messages = this.extractAllMessages(document);
    const schemas = this.extractSchemas(document);

    return {
      title: info.title(),
      version: info.version(),
      description: info.description(),
      channels,
      messages,
      schemas,
    };
  }

  private extractChannels(document: any): ParsedChannel[] {
    const channels: ParsedChannel[] = [];
    const channelsCollection = document.channels();

    channelsCollection.all().forEach((channel: any) => {
      const channelId = channel.id();
      const address = channel.address();
      const description = channel.description();

      const messages = this.extractMessagesFromChannel(channel);
      const operations = this.extractOperationsFromChannel(document, channelId);

      channels.push({
        name: channelId,
        address,
        description,
        messages,
        operations,
      });
    });

    return channels;
  }

  private extractMessagesFromChannel(channel: any): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    const messagesCollection = channel.messages();

    messagesCollection.all().forEach((message: any) => {
      const messageId = message.id();
      const payload = message.payload();
      const headers = message.headers();

      messages.push({
        name: messageId,
        description: message.description(),
        payload: this.convertSchemaToObject(payload),
        headers: headers ? this.convertSchemaToObject(headers) : undefined,
      });
    });

    return messages;
  }

  private extractOperationsFromChannel(document: any, channelId: string): {
    send: any[];
    receive: any[];
  } {
    const operations: { send: any[]; receive: any[] } = { send: [], receive: [] };
    const ops = document.operations();

    ops.all().forEach((operation: any) => {
      const channel = operation.channels().all()[0];
      if (channel && channel.id() === channelId) {
        const action = operation.action();
        const messages = operation.messages().all().map((msg: any) => ({
          name: msg.id(),
          description: msg.description(),
          payload: this.convertSchemaToObject(msg.payload()),
          headers: msg.headers() ? this.convertSchemaToObject(msg.headers()) : undefined,
        }));

        const op = {
          action,
          channel: channelId,
          messages,
          description: operation.description(),
        };

        if (action === 'send') {
          operations.send.push(op);
        } else if (action === 'receive') {
          operations.receive.push(op);
        }
      }
    });

    return operations;
  }

  private extractAllMessages(document: any): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    const components = document.components();

    if (components) {
      const messagesCollection = components.messages();
      messagesCollection.all().forEach((message: any) => {
        const messageId = message.id();
        const payload = message.payload();
        const headers = message.headers();

        // Get raw schemas from spec to preserve $refs
        const rawPayload = this.rawSpec?.components?.messages?.[messageId]?.payload;
        const rawHeaders = this.rawSpec?.components?.messages?.[messageId]?.headers;

        // Convert schemas, passing raw versions to preserve nested $refs
        const payloadSchema = this.convertSchemaToObject(payload, rawPayload);
        const headersSchema = headers ? this.convertSchemaToObject(headers, rawHeaders) : undefined;

        messages.push({
          name: messageId,
          description: message.description(),
          payload: payloadSchema,
          headers: headersSchema,
        });
      });
    }

    return messages;
  }

  private extractSchemas(document: any): Record<string, SchemaObject> {
    const schemas: Record<string, SchemaObject> = {};
    const components = document.components();

    if (components) {
      const schemasCollection = components.schemas();
      schemasCollection.all().forEach((schema: any) => {
        const schemaId = schema.id();
        const rawSchema = this.rawSpec?.components?.schemas?.[schemaId];
        schemas[schemaId] = this.convertSchemaToObject(schema, rawSchema);
      });
    }

    return schemas;
  }

  private getSchemaProperty<T>(schema: any, prop: string): T | undefined {
    if (!schema) return undefined;
    const value = typeof schema[prop] === 'function' ? schema[prop]() : schema[prop];
    return value !== undefined && value !== null ? value : undefined;
  }

  private convertSchemaToObject(schema: any, rawSchemaPath?: any): SchemaObject {
    if (!schema) return {};

    const obj: SchemaObject = {};

    // Check if the raw schema at this path has a $ref
    if (rawSchemaPath && rawSchemaPath.$ref) {
      obj.$ref = rawSchemaPath.$ref;
      // If we have a $ref, we should return early and not process other properties
      // because the $ref should be the only thing used
      return obj;
    }

    const schemaType = this.getSchemaProperty<string>(schema, 'type');
    const schemaDesc = this.getSchemaProperty<string>(schema, 'description');
    const schemaFormat = this.getSchemaProperty<string>(schema, 'format');

    if (schemaType) obj.type = schemaType;
    if (schemaDesc) obj.description = schemaDesc;
    if (schemaFormat) obj.format = schemaFormat;

    const properties = this.getSchemaProperty<any>(schema, 'properties');
    if (properties && (properties.size > 0 || (typeof properties === 'object' && Object.keys(properties).length > 0))) {
      obj.properties = {};
      if (typeof properties.forEach === 'function') {
        properties.forEach((prop: any, key: string) => {
          const rawProp = rawSchemaPath?.properties?.[key];
          obj.properties![key] = this.convertSchemaToObject(prop, rawProp);
        });
      } else {
        for (const [key, prop] of Object.entries(properties)) {
          const rawProp = rawSchemaPath?.properties?.[key];
          obj.properties[key] = this.convertSchemaToObject(prop, rawProp);
        }
      }
    }

    const items = this.getSchemaProperty(schema, 'items');
    if (items) {
      const rawItems = rawSchemaPath?.items;
      obj.items = this.convertSchemaToObject(items, rawItems);
    }

    const required = this.getSchemaProperty<string[]>(schema, 'required');
    if (required && required.length > 0) {
      obj.required = required;
    }

    const enumValues = this.getSchemaProperty<string[]>(schema, 'enum');
    if (enumValues && enumValues.length > 0) {
      obj.enum = enumValues;
    }

    const allOf = this.getSchemaProperty<any[]>(schema, 'allOf');
    if (allOf && Array.isArray(allOf)) {
      obj.allOf = allOf.map((s: any, i: number) => {
        const rawAllOf = rawSchemaPath?.allOf?.[i];
        return this.convertSchemaToObject(s, rawAllOf);
      });
    }

    const anyOf = this.getSchemaProperty<any[]>(schema, 'anyOf');
    if (anyOf && Array.isArray(anyOf)) {
      obj.anyOf = anyOf.map((s: any, i: number) => {
        const rawAnyOf = rawSchemaPath?.anyOf?.[i];
        return this.convertSchemaToObject(s, rawAnyOf);
      });
    }

    const oneOf = this.getSchemaProperty<any[]>(schema, 'oneOf');
    if (oneOf && Array.isArray(oneOf)) {
      obj.oneOf = oneOf.map((s: any, i: number) => {
        const rawOneOf = rawSchemaPath?.oneOf?.[i];
        return this.convertSchemaToObject(s, rawOneOf);
      });
    }

    const ref = this.getSchemaProperty<string>(schema, '$ref');
    if (ref) {
      obj.$ref = ref;
    }

    const additionalProps = this.getSchemaProperty(schema, 'additionalProperties');
    if (additionalProps !== undefined) {
      if (typeof additionalProps === 'boolean') {
        obj.additionalProperties = additionalProps;
      } else {
        const rawAdditional = rawSchemaPath?.additionalProperties;
        obj.additionalProperties = this.convertSchemaToObject(additionalProps, rawAdditional);
      }
    }

    return obj;
  }
}
