import { AsyncAPIParser } from '../parser/asyncapi-parser.js';
import { TypeScriptGenerator } from '../generator/typescript-generator.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Integration Tests', () => {
  let parser: AsyncAPIParser;
  let generator: TypeScriptGenerator;
  let tempDir: string;

  beforeEach(() => {
    parser = new AsyncAPIParser();
    generator = new TypeScriptGenerator();
    tempDir = path.join(process.cwd(), 'test-temp-integration');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End AsyncAPI Processing', () => {
    it('should parse and generate TypeScript from complete AsyncAPI spec', async () => {
      const asyncApiSpec = {
        asyncapi: '3.0.0',
        info: {
          title: 'E-Commerce API',
          version: '2.0.0',
          description: 'AsyncAPI for e-commerce events',
        },
        channels: {
          orderEvents: {
            address: 'orders/events',
            description: 'Order event channel',
            messages: {
              orderCreated: {
                $ref: '#/components/messages/OrderCreated',
              },
              orderUpdated: {
                $ref: '#/components/messages/OrderUpdated',
              },
            },
          },
          userEvents: {
            address: 'users/events',
            messages: {
              userRegistered: {
                $ref: '#/components/messages/UserRegistered',
              },
            },
          },
        },
        operations: {
          publishOrderCreated: {
            action: 'send',
            channel: {
              $ref: '#/channels/orderEvents',
            },
            messages: [
              {
                $ref: '#/channels/orderEvents/messages/orderCreated',
              },
            ],
          },
          subscribeOrderUpdated: {
            action: 'receive',
            channel: {
              $ref: '#/channels/orderEvents',
            },
            messages: [
              {
                $ref: '#/channels/orderEvents/messages/orderUpdated',
              },
            ],
          },
          subscribeUserRegistered: {
            action: 'receive',
            channel: {
              $ref: '#/channels/userEvents',
            },
            messages: [
              {
                $ref: '#/channels/userEvents/messages/userRegistered',
              },
            ],
          },
        },
        components: {
          messages: {
            OrderCreated: {
              description: 'Event fired when a new order is created',
              payload: {
                $ref: '#/components/schemas/Order',
              },
              headers: {
                type: 'object',
                properties: {
                  correlationId: {
                    type: 'string',
                    description: 'Correlation ID for tracking',
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                  },
                },
                required: ['correlationId'],
              },
            },
            OrderUpdated: {
              description: 'Event fired when an order is updated',
              payload: {
                $ref: '#/components/schemas/Order',
              },
            },
            UserRegistered: {
              description: 'Event fired when a user registers',
              payload: {
                $ref: '#/components/schemas/User',
              },
            },
          },
          schemas: {
            Order: {
              type: 'object',
              description: 'An order in the system',
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique order identifier',
                },
                userId: {
                  type: 'string',
                  description: 'User who placed the order',
                },
                items: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/OrderItem',
                  },
                },
                total: {
                  type: 'number',
                  description: 'Total order amount',
                },
                status: {
                  $ref: '#/components/schemas/OrderStatus',
                },
              },
              required: ['id', 'userId', 'items', 'total', 'status'],
            },
            OrderItem: {
              type: 'object',
              properties: {
                productId: {
                  type: 'string',
                },
                quantity: {
                  type: 'integer',
                },
                price: {
                  type: 'number',
                },
              },
              required: ['productId', 'quantity', 'price'],
            },
            OrderStatus: {
              type: 'string',
              enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            },
            User: {
              type: 'object',
              description: 'A user in the system',
              properties: {
                id: {
                  type: 'string',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
                profile: {
                  $ref: '#/components/schemas/UserProfile',
                },
              },
              required: ['id', 'email'],
            },
            UserProfile: {
              type: 'object',
              properties: {
                firstName: {
                  type: 'string',
                },
                lastName: {
                  type: 'string',
                },
                address: {
                  $ref: '#/components/schemas/Address',
                },
              },
            },
            Address: {
              type: 'object',
              properties: {
                street: {
                  type: 'string',
                },
                city: {
                  type: 'string',
                },
                country: {
                  type: 'string',
                },
                postalCode: {
                  type: 'string',
                },
              },
              required: ['street', 'city', 'country'],
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const specPath = path.join(tempDir, 'asyncapi.json');
      await fs.writeFile(specPath, JSON.stringify(asyncApiSpec, null, 2));

      const parsed = await parser.parse(specPath);
      const output = generator.generate(parsed);

      // Check header comment
      expect(output).toContain('Generated from AsyncAPI spec: E-Commerce API v2.0.0');
      expect(output).toContain('AsyncAPI for e-commerce events');

      // Check schemas
      expect(output).toContain('export interface Order');
      expect(output).toContain('export interface OrderItem');
      expect(output).toContain('export interface User');
      expect(output).toContain('interface UserProfile');
      expect(output).toContain('export interface Address');
      expect(output).toContain("export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';");

      // Check message payloads
      expect(output).toContain("export type OrderCreatedPayload = Order;");
      expect(output).toContain("export type OrderUpdatedPayload = Order;");
      expect(output).toContain("export type UserRegisteredPayload = User;");

      // Check message headers
      expect(output).toContain('export interface OrderCreatedHeaders');

      // Check message interfaces
      expect(output).toContain('export interface OrderCreatedMessage');
      expect(output).toContain('export interface OrderUpdatedMessage');
      expect(output).toContain('export interface UserRegisteredMessage');

      // Check channel types
      expect(output).toContain('export type OrderEventsSendMessages');
      expect(output).toContain('export type OrderEventsReceiveMessages');
      expect(output).toContain('export type UserEventsReceiveMessages');

      // Check references are resolved (nested types may be inline or separate)
      expect(output).toContain("export type OrderStatus = 'pending'");
      expect(output).toContain('interface UserProfile');
      expect(output).toContain('interface Address');

      // Check required vs optional fields
      expect(output).toContain('id: string;'); // required
      expect(output).toContain('userId: string;'); // required
      expect(output).toContain('firstName?: string;'); // optional

      // Check descriptions are preserved (JSDoc format is multi-line)
      expect(output).toContain('/**\n * An order in the system\n */');
      expect(output).toContain('/** Unique order identifier */');
      expect(output).toContain('/**\n * Event fired when a new order is created\n */');
    });

    it('should handle complex nested schemas', async () => {
      const asyncApiSpec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Nested Schema Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            Company: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                departments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      manager: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const specPath = path.join(tempDir, 'nested.json');
      await fs.writeFile(specPath, JSON.stringify(asyncApiSpec, null, 2));

      const parsed = await parser.parse(specPath);
      const output = generator.generate(parsed);

      expect(output).toContain('export interface Company');
      expect(output).toContain('interface DepartmentsItem');
      expect(output).toContain('interface DepartmentsItemManager');
    });

    it('should handle composition schemas (allOf, anyOf, oneOf)', async () => {
      const asyncApiSpec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Composition Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            BaseEntity: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
            Product: {
              allOf: [
                { $ref: '#/components/schemas/BaseEntity' },
                {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    price: { type: 'number' },
                  },
                },
              ],
            },
            StringOrNumber: {
              anyOf: [{ type: 'string' }, { type: 'number' }],
            },
            PaymentMethod: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    creditCard: { type: 'string' },
                  },
                },
                {
                  type: 'object',
                  properties: {
                    bankAccount: { type: 'string' },
                  },
                },
              ],
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const specPath = path.join(tempDir, 'composition.json');
      await fs.writeFile(specPath, JSON.stringify(asyncApiSpec, null, 2));

      const parsed = await parser.parse(specPath);
      const output = generator.generate(parsed);

      expect(output).toContain('export interface BaseEntity');
      expect(output).toContain('export type Product =');
      expect(output).toContain('&'); // allOf uses intersection
      expect(output).toContain('export type StringOrNumber =');
      expect(output).toContain('|'); // anyOf uses union
      expect(output).toContain('export type PaymentMethod =');
    });

    it('should handle multiple channels with different operation types', async () => {
      const asyncApiSpec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Multi-Channel Test',
          version: '1.0.0',
        },
        channels: {
          commands: {
            address: 'app/commands',
            messages: {
              createUser: {
                payload: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                  },
                },
              },
              deleteUser: {
                payload: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                  },
                },
              },
            },
          },
          events: {
            address: 'app/events',
            messages: {
              userCreated: {
                payload: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        operations: {
          sendCreateUser: {
            action: 'send',
            channel: { $ref: '#/channels/commands' },
            messages: [
              { $ref: '#/channels/commands/messages/createUser' },
              { $ref: '#/channels/commands/messages/deleteUser' },
            ],
          },
          receiveUserCreated: {
            action: 'receive',
            channel: { $ref: '#/channels/events' },
            messages: [{ $ref: '#/channels/events/messages/userCreated' }],
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const specPath = path.join(tempDir, 'multichannel.json');
      await fs.writeFile(specPath, JSON.stringify(asyncApiSpec, null, 2));

      const parsed = await parser.parse(specPath);
      const output = generator.generate(parsed);

      expect(output).toContain('export type CommandsSendMessages = CreateUserMessage | DeleteUserMessage;');
      expect(output).toContain('export type EventsReceiveMessages = UserCreatedMessage;');
    });

    it('should write generated types to file', async () => {
      const asyncApiSpec = {
        asyncapi: '3.0.0',
        info: {
          title: 'File Write Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            SimpleType: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const specPath = path.join(tempDir, 'spec.json');
      const outputPath = path.join(tempDir, 'generated.ts');

      await fs.writeFile(specPath, JSON.stringify(asyncApiSpec, null, 2));

      const parsed = await parser.parse(specPath);
      const output = generator.generate(parsed);

      await fs.writeFile(outputPath, output, 'utf-8');

      const fileContent = await fs.readFile(outputPath, 'utf-8');
      expect(fileContent).toBe(output);
      expect(fileContent).toContain('export interface SimpleType');
    });

    it('should handle empty AsyncAPI specification', async () => {
      const asyncApiSpec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Empty Test',
          version: '1.0.0',
        },
        channels: {},
      };

      await fs.mkdir(tempDir, { recursive: true });
      const specPath = path.join(tempDir, 'empty.json');
      await fs.writeFile(specPath, JSON.stringify(asyncApiSpec, null, 2));

      const parsed = await parser.parse(specPath);
      const output = generator.generate(parsed);

      expect(output).toContain('Generated from AsyncAPI spec: Empty Test v1.0.0');
      expect(parsed.channels).toHaveLength(0);
      expect(parsed.messages).toHaveLength(0);
      expect(Object.keys(parsed.schemas)).toHaveLength(0);
    });

    it('should preserve special characters and formatting', async () => {
      const asyncApiSpec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Special Chars Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            'kebab-case-name': {
              type: 'object',
              description: "Description with 'quotes' and */ comment terminator",
              properties: {
                'property-with-dashes': { type: 'string' },
                property_with_underscores: { type: 'number' },
              },
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const specPath = path.join(tempDir, 'special.json');
      await fs.writeFile(specPath, JSON.stringify(asyncApiSpec, null, 2));

      const parsed = await parser.parse(specPath);
      const output = generator.generate(parsed);

      // Should sanitize identifiers
      expect(output).toContain('export interface KebabCaseName');

      // Should escape JSDoc
      expect(output).toContain('*\\/');

      // Should handle properties with special characters (hyphens preserved as-is)
      expect(output).toContain('property-with-dashes');
    });
  });
});
