import { OpenAPIV3 } from 'openapi-types';
import {
  OpenAPITransformer,
  ReferenceTransformService,
  TransformContext,
} from '../../../../src/services/reference-transform';

describe('ReferenceTransformService', () => {
  let service: ReferenceTransformService;
  let transformer: OpenAPITransformer;

  beforeEach(() => {
    service = new ReferenceTransformService();
    transformer = new OpenAPITransformer();
    service.registerTransformer('openapi', transformer);
  });

  it('throws error for unknown format', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'unknown' as 'openapi' | 'asyncapi' | 'graphql',
    };

    expect(() => service.transformDocument({}, context)).toThrow(
      'No transformer registered for format: unknown'
    );
  });

  it('transforms document using registered transformer', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'openapi',
      path: '/tasks',
      method: 'get',
    };

    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/tasks': {
          get: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Task',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = service.transformDocument(doc, context);
    const operation = result.paths?.['/tasks']?.get;
    const response = operation?.responses?.['200'];
    expect(response).toBeDefined();
    expect('content' in response!).toBeTruthy();
    const responseObj = response! as OpenAPIV3.ResponseObject;
    expect(responseObj.content?.['application/json']?.schema).toBeDefined();
    // Expect the new format
    expect(responseObj.content!['application/json'].schema).toEqual({
      $ref: 'openapi://components/schemas/Task',
    });
  });
});

describe('OpenAPITransformer', () => {
  let transformer: OpenAPITransformer;

  beforeEach(() => {
    transformer = new OpenAPITransformer();
  });

  it('transforms schema references', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'openapi',
    };

    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Task: {
            $ref: '#/components/schemas/TaskId',
          },
        },
      },
    };

    const result = transformer.transformRefs(doc, context);
    // Expect the new format
    expect(result.components?.schemas?.Task).toEqual({
      $ref: 'openapi://components/schemas/TaskId',
    });
  });

  it('handles nested references', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'openapi',
    };

    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/tasks': {
          post: {
            requestBody: {
              required: true,
              description: 'Task creation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Task',
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Created',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Task',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = transformer.transformRefs(doc, context);
    const taskPath = result.paths?.['/tasks'];
    expect(taskPath?.post).toBeDefined();
    const operation = taskPath!.post!;
    expect(operation.requestBody).toBeDefined();
    expect('content' in operation.requestBody!).toBeTruthy();
    const requestBody = operation.requestBody! as OpenAPIV3.RequestBodyObject;
    expect(requestBody.content?.['application/json']?.schema).toBeDefined();
    // Expect the new format
    expect(requestBody.content['application/json'].schema).toEqual({
      $ref: 'openapi://components/schemas/Task',
    });

    // Also check the response reference in the same test
    const response = operation.responses?.['201'];
    expect(response).toBeDefined();
    expect('content' in response).toBeTruthy();
    const responseObj = response as OpenAPIV3.ResponseObject;
    expect(responseObj.content?.['application/json']?.schema).toBeDefined();
    // Expect the new format
    expect(responseObj.content!['application/json'].schema).toEqual({
      $ref: 'openapi://components/schemas/Task',
    });
  });

  it('keeps external references unchanged', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'openapi',
    };

    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Task: {
            $ref: 'https://example.com/schemas/Task',
          },
        },
      },
    };

    const result = transformer.transformRefs(doc, context);
    const task = result.components?.schemas?.Task as OpenAPIV3.ReferenceObject;
    expect(task).toEqual({
      $ref: 'https://example.com/schemas/Task',
    });
  });

  // This test is now invalid as non-schema internal refs *should* be transformed
  // it('keeps non-schema internal references unchanged', () => { ... });

  it('transforms parameter references', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'openapi',
    };
    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        parameters: {
          UserIdParam: {
            $ref: '#/components/parameters/UserId', // Reference another parameter
          },
        },
      },
    };
    const result = transformer.transformRefs(doc, context);
    expect(result.components?.parameters?.UserIdParam).toEqual({
      $ref: 'openapi://components/parameters/UserId', // Expect transformation
    });
  });

  it('transforms response references', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'openapi',
    };
    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        responses: {
          GenericError: {
            $ref: '#/components/responses/ErrorModel', // Reference another response
          },
        },
      },
    };
    const result = transformer.transformRefs(doc, context);
    expect(result.components?.responses?.GenericError).toEqual({
      $ref: 'openapi://components/responses/ErrorModel', // Expect transformation
    });
  });

  // Add tests for other component types if needed (examples, requestBodies, etc.)

  it('handles arrays properly', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'openapi',
    };

    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          TaskList: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Task',
                },
              },
            },
          },
        },
      },
    };

    const result = transformer.transformRefs(doc, context);
    const schema = result.components?.schemas?.TaskList;
    expect(schema).toBeDefined();
    expect('properties' in schema!).toBeTruthy();
    const schemaObject = schema! as OpenAPIV3.SchemaObject;
    expect(schemaObject.properties?.items).toBeDefined();
    const arraySchema = schemaObject.properties!.items as OpenAPIV3.ArraySchemaObject;
    // Expect the new format
    expect(arraySchema.items).toEqual({
      $ref: 'openapi://components/schemas/Task',
    });
  });

  it('preserves non-reference values', () => {
    const context: TransformContext = {
      resourceType: 'endpoint',
      format: 'openapi',
    };

    const doc: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {},
      components: {
        schemas: {
          Test: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      },
    };

    const result = transformer.transformRefs(doc, context);
    expect(result).toEqual(doc);
  });
});
