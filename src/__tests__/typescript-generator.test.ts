import { TypeScriptGenerator } from '../generator/typescript-generator.js';
import type { ParsedAsyncAPI, SchemaObject } from '../types/index.js';

describe('TypeScriptGenerator', () => {
  let generator: TypeScriptGenerator;

  beforeEach(() => {
    generator = new TypeScriptGenerator();
  });

  describe('generate', () => {
    it('should generate TypeScript from parsed AsyncAPI', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test Description',
        channels: [
          {
            name: 'userChannel',
            address: 'user/events',
            messages: [],
            operations: {
              send: [
                {
                  action: 'send',
                  channel: 'userChannel',
                  messages: [
                    {
                      name: 'UserCreated',
                      payload: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                        },
                      },
                    },
                  ],
                },
              ],
              receive: [],
            },
          },
        ],
        messages: [
          {
            name: 'UserCreated',
            payload: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
              required: ['id'],
            },
          },
        ],
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['id', 'email'],
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('Generated from AsyncAPI spec: Test API v1.0.0');
      expect(output).toContain('Test Description');
      expect(output).toContain('interface User');
      expect(output).toContain('interface UserCreatedPayload');
      expect(output).toContain('interface UserCreatedMessage');
      expect(output).toContain('UserChannelSendMessages');
    });

    it('should handle empty schemas and messages', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Empty API',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {},
      };

      const output = generator.generate(parsed);

      expect(output).toContain('Generated from AsyncAPI spec: Empty API v1.0.0');
      expect(output).not.toContain('interface');
    });
  });

  describe('schemaToTypeScript', () => {
    it('should generate interface from object schema', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Person: {
            type: 'object',
            description: 'A person',
            properties: {
              name: { type: 'string', description: 'Person name' },
              age: { type: 'number' },
            },
            required: ['name'],
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface Person');
      expect(output).toContain('/**\n * A person\n */');
      expect(output).toContain('/** Person name */');
      expect(output).toContain('name: string;');
      expect(output).toContain('age?: number;');
    });

    it('should handle nested objects', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Company: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                },
              },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface Company');
      expect(output).toContain('interface CompanyAddress');
      expect(output).toContain('address?: CompanyAddress;');
    });

    it('should handle array schemas', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          StringList: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export type StringList = string[];');
    });

    it('should handle enum schemas with union type', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain("export type Status = 'active' | 'inactive' | 'pending';");
    });

    it('should handle enum schemas with TypeScript enum', () => {
      const generatorWithEnum = new TypeScriptGenerator({ enumType: 'enum' });
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
        },
      };

      const output = generatorWithEnum.generate(parsed);

      expect(output).toContain('export enum Priority');
      expect(output).toContain("LOW = 'low'");
      expect(output).toContain("MEDIUM = 'medium'");
      expect(output).toContain("HIGH = 'high'");
    });

    it('should handle allOf schemas', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Extended: {
            allOf: [
              {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                },
              },
              {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            ],
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export type Extended =');
      expect(output).toContain('&');
    });

    it('should handle anyOf schemas', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          StringOrNumber: {
            anyOf: [{ type: 'string' }, { type: 'number' }],
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export type StringOrNumber =');
      expect(output).toContain('|');
    });

    it('should handle oneOf schemas', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Payment: {
            oneOf: [
              { type: 'object', properties: { card: { type: 'string' } } },
              { type: 'object', properties: { bank: { type: 'string' } } },
            ],
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export type Payment =');
      expect(output).toContain('|');
    });

    it('should resolve $ref references', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
            },
          },
          Person: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: { $ref: '#/components/schemas/Address' },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface Address');
      expect(output).toContain('export interface Person');
      expect(output).toContain('address?: Address;');
    });

    it('should handle circular references', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Node: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              next: { $ref: '#/components/schemas/Node' },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface Node');
      expect(output).toContain('next?: Node;');
    });

    it('should handle additionalProperties with boolean', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Dictionary: {
            type: 'object',
            additionalProperties: true,
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('[key: string]: any;');
    });

    it('should handle additionalProperties with schema', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          StringDict: {
            type: 'object',
            additionalProperties: {
              type: 'string',
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('[key: string]: string;');
    });

    it('should use unknown instead of any when configured', () => {
      const generatorWithUnknown = new TypeScriptGenerator({ useUnknown: true });
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          NoType: {},
        },
      };

      const output = generatorWithUnknown.generate(parsed);

      expect(output).toContain('unknown');
    });

    it.skip('should warn on unresolved $ref', () => {
      // Skipped: Jest spy not available in ESM mode
    });
  });

  describe('sanitizeIdentifier', () => {
    it('should sanitize invalid characters', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          'user-name': {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface UserName');
    });

    it('should handle identifiers starting with numbers', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          '123test': {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface _123test');
    });

    it('should handle reserved words', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          interface: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface Interface_');
    });
  });

  describe('escapeJsDocComment', () => {
    it('should escape JSDoc comment terminators', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Test: {
            type: 'object',
            description: 'This has */ in it',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('This has *\\/ in it');
    });

    it('should replace newlines with spaces', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Test: {
            type: 'object',
            description: 'Line 1\nLine 2',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('Line 1 Line 2');
    });
  });

  describe('generateMessages', () => {
    it('should generate message interfaces', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [
          {
            name: 'OrderCreated',
            description: 'Order was created',
            payload: {
              type: 'object',
              properties: {
                orderId: { type: 'string' },
              },
            },
          },
        ],
        schemas: {},
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface OrderCreatedPayload');
      expect(output).toContain('export interface OrderCreatedMessage');
      expect(output).toContain('/**\n * Order was created\n */');
      expect(output).toContain('payload: OrderCreatedPayload;');
    });

    it('should generate message headers when present', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [
          {
            name: 'UserNotification',
            payload: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
            headers: {
              type: 'object',
              properties: {
                correlationId: { type: 'string' },
              },
            },
          },
        ],
        schemas: {},
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface UserNotificationHeaders');
      expect(output).toContain('headers?: UserNotificationHeaders;');
    });
  });

  describe('generateChannelTypes', () => {
    it('should generate send message union types', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [
          {
            name: 'orders',
            address: 'orders',
            messages: [],
            operations: {
              send: [
                {
                  action: 'send',
                  channel: 'orders',
                  messages: [
                    {
                      name: 'OrderCreated',
                      payload: { type: 'object', properties: { id: { type: 'string' } } },
                    },
                    {
                      name: 'OrderUpdated',
                      payload: { type: 'object', properties: { id: { type: 'string' } } },
                    },
                  ],
                },
              ],
              receive: [],
            },
          },
        ],
        messages: [
          {
            name: 'OrderCreated',
            payload: { type: 'object', properties: { id: { type: 'string' } } },
          },
          {
            name: 'OrderUpdated',
            payload: { type: 'object', properties: { id: { type: 'string' } } },
          },
        ],
        schemas: {},
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export type OrdersSendMessages = OrderCreatedMessage | OrderUpdatedMessage;');
    });

    it('should generate receive message union types', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [
          {
            name: 'notifications',
            address: 'notifications',
            messages: [],
            operations: {
              send: [],
              receive: [
                {
                  action: 'receive',
                  channel: 'notifications',
                  messages: [
                    {
                      name: 'EmailSent',
                      payload: { type: 'object', properties: { to: { type: 'string' } } },
                    },
                  ],
                },
              ],
            },
          },
        ],
        messages: [
          {
            name: 'EmailSent',
            payload: { type: 'object', properties: { to: { type: 'string' } } },
          },
        ],
        schemas: {},
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export type NotificationsReceiveMessages = EmailSentMessage;');
    });
  });

  describe('primitive types', () => {
    it.each([
      ['string', 'string'],
      ['number', 'number'],
      ['integer', 'number'],
      ['boolean', 'boolean'],
      ['null', 'null'],
    ])('should map %s to %s', (jsonType, tsType) => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          TestType: {
            type: jsonType as any,
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain(`export type TestType = ${tsType};`);
    });
  });

  describe('toPascalCase', () => {
    it.each([
      ['user-name', 'UserName'],
      ['user_name', 'UserName'],
      ['user.name', 'UserName'],
      ['UserName', 'UserName'],
      ['userName', 'UserName'],
      ['user123', 'User123'],
    ])('should convert %s to %s', (input, expected) => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          [input]: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain(`export interface ${expected}`);
    });
  });

  describe('edge cases', () => {
    it('should handle empty object schemas', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          Empty: {
            type: 'object',
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('export interface Empty {');
      expect(output).toContain('}');
    });

    it('should handle schemas with only description', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          JustDescription: {
            description: 'Only a description',
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain('/**\n * Only a description\n */');
    });

    it('should escape special characters in enum string literals', () => {
      const parsed: ParsedAsyncAPI = {
        title: 'Test',
        version: '1.0.0',
        channels: [],
        messages: [],
        schemas: {
          SpecialEnum: {
            type: 'string',
            enum: ["it's", "quote'test"],
          },
        },
      };

      const output = generator.generate(parsed);

      expect(output).toContain("\\'");
    });
  });
});
