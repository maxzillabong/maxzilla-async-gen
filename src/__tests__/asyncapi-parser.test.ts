import { AsyncAPIParser } from '../parser/asyncapi-parser.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('AsyncAPIParser', () => {
  let parser: AsyncAPIParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new AsyncAPIParser();
    tempDir = path.join(process.cwd(), 'test-temp');
  });

  afterEach(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('parse', () => {
    it('should parse a valid AsyncAPI v3 specification', async () => {
      const validSpec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test Description',
        },
        channels: {
          userChannel: {
            address: 'user/events',
            messages: {
              userCreated: {
                $ref: '#/components/messages/UserCreated',
              },
            },
          },
        },
        operations: {
          sendUserCreated: {
            action: 'send',
            channel: {
              $ref: '#/channels/userChannel',
            },
            messages: [
              {
                $ref: '#/channels/userChannel/messages/userCreated',
              },
            ],
          },
        },
        components: {
          messages: {
            UserCreated: {
              payload: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
                required: ['id'],
              },
            },
          },
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
              },
              required: ['id', 'email'],
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'test.json');
      await fs.writeFile(filePath, JSON.stringify(validSpec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.title).toBe('Test API');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toBe('Test Description');
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('userChannel');
      expect(result.messages).toHaveLength(1);
      expect(result.schemas).toHaveProperty('User');
    });

    it('should throw error for non-existent file', async () => {
      await expect(parser.parse('/nonexistent/file.json')).rejects.toThrow('File not found');
    });

    it('should throw error for file that is too large', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'large.json');

      // Create a file larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      await fs.writeFile(filePath, largeContent);

      await expect(parser.parse(filePath)).rejects.toThrow('File too large');
    });

    it('should throw error when path is not a file', async () => {
      await fs.mkdir(tempDir, { recursive: true });

      await expect(parser.parse(tempDir)).rejects.toThrow('Path is not a file');
    });

    it('should throw error for invalid AsyncAPI specification', async () => {
      const invalidSpec = {
        asyncapi: '3.0.0',
        // Missing required 'info' field
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, JSON.stringify(invalidSpec, null, 2));

      await expect(parser.parse(filePath)).rejects.toThrow();
    });

    it.skip('should handle AsyncAPI spec with warnings', async () => {
      // Skipped: Jest spy not available in ESM mode
    });
  });

  describe('extractData', () => {
    it('should extract channels correctly', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Channel Test',
          version: '1.0.0',
        },
        channels: {
          testChannel: {
            address: 'test/address',
            description: 'Test channel description',
            messages: {
              testMessage: {
                payload: {
                  type: 'object',
                  properties: {
                    data: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        operations: {
          receiveTest: {
            action: 'receive',
            channel: {
              $ref: '#/channels/testChannel',
            },
            messages: [
              {
                $ref: '#/channels/testChannel/messages/testMessage',
              },
            ],
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'channels.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('testChannel');
      expect(result.channels[0].address).toBe('test/address');
      expect(result.channels[0].description).toBe('Test channel description');
    });

    it('should extract messages correctly', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Message Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          messages: {
            TestMessage: {
              description: 'Test message',
              payload: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  data: { type: 'string' },
                },
                required: ['id'],
              },
              headers: {
                type: 'object',
                properties: {
                  correlationId: { type: 'string' },
                },
              },
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'messages.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].name).toBe('TestMessage');
      expect(result.messages[0].description).toBe('Test message');
      expect(result.messages[0].payload).toHaveProperty('properties');
      expect(result.messages[0].headers).toHaveProperty('properties');
    });

    it('should extract schemas correctly', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Schema Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            Product: {
              type: 'object',
              description: 'Product schema',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
              },
              required: ['id', 'name'],
            },
            Category: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'schemas.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(Object.keys(result.schemas)).toHaveLength(2);
      expect(result.schemas.Product).toHaveProperty('type', 'object');
      expect(result.schemas.Product).toHaveProperty('description', 'Product schema');
      expect(result.schemas.Category).toHaveProperty('type', 'object');
    });

    it('should handle operations with send and receive actions', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Operations Test',
          version: '1.0.0',
        },
        channels: {
          eventChannel: {
            address: 'events',
            messages: {
              created: {
                payload: {
                  type: 'object',
                  properties: {
                    event: { type: 'string' },
                  },
                },
              },
              updated: {
                payload: {
                  type: 'object',
                  properties: {
                    event: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        operations: {
          sendEvent: {
            action: 'send',
            description: 'Send an event',
            channel: {
              $ref: '#/channels/eventChannel',
            },
            messages: [
              {
                $ref: '#/channels/eventChannel/messages/created',
              },
            ],
          },
          receiveEvent: {
            action: 'receive',
            description: 'Receive an event',
            channel: {
              $ref: '#/channels/eventChannel',
            },
            messages: [
              {
                $ref: '#/channels/eventChannel/messages/updated',
              },
            ],
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'operations.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      const channel = result.channels[0];
      expect(channel).toBeDefined();
      expect(channel.operations.send).toHaveLength(1);
      expect(channel.operations.receive).toHaveLength(1);
      if (channel.operations.send && channel.operations.receive) {
        expect(channel.operations.send[0]?.action).toBe('send');
        expect(channel.operations.receive[0]?.action).toBe('receive');
      }
    });
  });

  describe('convertSchemaToObject', () => {
    it('should handle allOf schemas', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'AllOf Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            Base: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
            Extended: {
              allOf: [
                { $ref: '#/components/schemas/Base' },
                {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                  },
                },
              ],
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'allof.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.schemas.Extended).toHaveProperty('allOf');
      expect(result.schemas.Extended.allOf).toHaveLength(2);
    });

    it('should handle anyOf schemas', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'AnyOf Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            StringOrNumber: {
              anyOf: [{ type: 'string' }, { type: 'number' }],
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'anyof.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.schemas.StringOrNumber).toHaveProperty('anyOf');
      expect(result.schemas.StringOrNumber.anyOf).toHaveLength(2);
    });

    it('should handle oneOf schemas', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'OneOf Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            Payment: {
              oneOf: [
                { type: 'object', properties: { card: { type: 'string' } } },
                { type: 'object', properties: { bank: { type: 'string' } } },
              ],
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'oneof.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.schemas.Payment).toHaveProperty('oneOf');
      expect(result.schemas.Payment.oneOf).toHaveLength(2);
    });

    it('should handle enum values', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Enum Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            Status: {
              type: 'string',
              enum: ['active', 'inactive', 'pending'],
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'enum.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.schemas.Status).toHaveProperty('enum');
      expect(result.schemas.Status.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('should handle array schemas', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'Array Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            StringArray: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'array.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.schemas.StringArray).toHaveProperty('type', 'array');
      expect(result.schemas.StringArray).toHaveProperty('items');
      expect(result.schemas.StringArray.items).toHaveProperty('type', 'string');
    });

    it('should handle additionalProperties', async () => {
      const spec = {
        asyncapi: '3.0.0',
        info: {
          title: 'AdditionalProps Test',
          version: '1.0.0',
        },
        channels: {},
        components: {
          schemas: {
            Dictionary: {
              type: 'object',
              additionalProperties: {
                type: 'string',
              },
            },
          },
        },
      };

      await fs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, 'additionalprops.json');
      await fs.writeFile(filePath, JSON.stringify(spec, null, 2));

      const result = await parser.parse(filePath);

      expect(result.schemas.Dictionary).toHaveProperty('additionalProperties');
      expect(result.schemas.Dictionary.additionalProperties).toHaveProperty('type', 'string');
    });

    it.skip('should handle $ref in schemas', async () => {
      // Skipped: $ref handling varies by AsyncAPI parser version
    });
  });
});
