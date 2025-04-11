import { OpenAPIV3 } from 'openapi-types';
import {
  getValidatedPathItem,
  getValidatedOperations,
  getValidatedComponentMap,
  getValidatedComponentDetails,
  // We might also test formatResults and isOpenAPIV3 if needed, but focus on new helpers first
} from '../../../../src/handlers/handler-utils.js'; // Adjust path as needed

// --- Mocks and Fixtures ---

const mockSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: { responses: { '200': { description: 'OK' } } },
      post: { responses: { '201': { description: 'Created' } } },
    },
    '/users/{id}': {
      get: { responses: { '200': { description: 'OK' } } },
      delete: { responses: { '204': { description: 'No Content' } } },
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    },
    '/items': {
      // Path item with no standard methods
      description: 'Collection of items',
      parameters: [],
    },
  },
  components: {
    schemas: {
      User: { type: 'object', properties: { id: { type: 'string' } } },
      Error: { type: 'object', properties: { message: { type: 'string' } } },
    },
    responses: {
      NotFound: { description: 'Resource not found' },
    },
    // Intentionally missing 'parameters' section for testing
  },
};

const mockSpecNoPaths: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {}, // Empty paths
  components: {},
};

const mockSpecNoComponents: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: { '/ping': { get: { responses: { '200': { description: 'OK' } } } } },
  // No components section
};

// --- Tests ---

describe('Handler Utils', () => {
  // --- getValidatedPathItem ---
  describe('getValidatedPathItem', () => {
    it('should return the path item object for a valid path', () => {
      const pathItem = getValidatedPathItem(mockSpec, '/users');
      expect(pathItem).toBeDefined();
      expect(pathItem).toHaveProperty('get');
      expect(pathItem).toHaveProperty('post');
    });

    it('should return the path item object for a path with parameters', () => {
      const pathItem = getValidatedPathItem(mockSpec, '/users/{id}');
      expect(pathItem).toBeDefined();
      expect(pathItem).toHaveProperty('get');
      expect(pathItem).toHaveProperty('delete');
      expect(pathItem).toHaveProperty('parameters');
    });

    it('should throw Error if path is not found', () => {
      expect(() => getValidatedPathItem(mockSpec, '/nonexistent')).toThrow(
        new Error('Path "/nonexistent" not found in the specification.')
      );
    });

    it('should throw Error if spec has no paths object', () => {
      const specWithoutPaths = { ...mockSpec, paths: undefined };
      // @ts-expect-error - Intentionally passing spec with undefined paths to test error handling
      expect(() => getValidatedPathItem(specWithoutPaths, '/users')).toThrow(
        new Error('Specification does not contain any paths.')
      );
    });

    it('should throw Error if spec has empty paths object', () => {
      expect(() => getValidatedPathItem(mockSpecNoPaths, '/users')).toThrow(
        new Error('Path "/users" not found in the specification.')
      );
    });
  });

  // --- getValidatedOperations ---
  describe('getValidatedOperations', () => {
    const usersPathItem = mockSpec.paths['/users'] as OpenAPIV3.PathItemObject;
    const userIdPathItem = mockSpec.paths['/users/{id}'] as OpenAPIV3.PathItemObject;
    const itemsPathItem = mockSpec.paths['/items'] as OpenAPIV3.PathItemObject;

    it('should return valid requested methods when all exist', () => {
      const validMethods = getValidatedOperations(usersPathItem, ['get', 'post'], '/users');
      expect(validMethods).toEqual(['get', 'post']);
    });

    it('should return valid requested methods when some exist', () => {
      const validMethods = getValidatedOperations(usersPathItem, ['get', 'put', 'post'], '/users');
      expect(validMethods).toEqual(['get', 'post']);
    });

    it('should return valid requested methods ignoring case', () => {
      const validMethods = getValidatedOperations(usersPathItem, ['GET', 'POST'], '/users');
      // Note: the helper expects lowercase input, but the internal map uses lowercase keys
      expect(validMethods).toEqual(['GET', 'POST']); // It returns the original case of valid inputs
    });

    it('should return only the valid method when one exists', () => {
      const validMethods = getValidatedOperations(
        userIdPathItem,
        ['delete', 'patch'],
        '/users/{id}'
      );
      expect(validMethods).toEqual(['delete']);
    });

    it('should throw Error if no requested methods are valid', () => {
      expect(() => getValidatedOperations(usersPathItem, ['put', 'delete'], '/users')).toThrow(
        new Error(
          'None of the requested methods (put, delete) are valid for path "/users". Available methods: get, post'
        )
      );
    });

    it('should throw Error if requested methods array is empty', () => {
      // The calling handler should prevent this, but test the helper
      expect(() => getValidatedOperations(usersPathItem, [], '/users')).toThrow(
        new Error(
          'None of the requested methods () are valid for path "/users". Available methods: get, post'
        )
      );
    });

    it('should throw Error if path item has no valid methods', () => {
      expect(() => getValidatedOperations(itemsPathItem, ['get'], '/items')).toThrow(
        new Error(
          'None of the requested methods (get) are valid for path "/items". Available methods: '
        )
      );
    });
  });

  // --- getValidatedComponentMap ---
  describe('getValidatedComponentMap', () => {
    it('should return the component map for a valid type', () => {
      const schemasMap = getValidatedComponentMap(mockSpec, 'schemas');
      expect(schemasMap).toBeDefined();
      expect(schemasMap).toHaveProperty('User');
      expect(schemasMap).toHaveProperty('Error');
    });

    it('should return the component map for another valid type', () => {
      const responsesMap = getValidatedComponentMap(mockSpec, 'responses');
      expect(responsesMap).toBeDefined();
      expect(responsesMap).toHaveProperty('NotFound');
    });

    it('should throw Error if component type is not found', () => {
      expect(() => getValidatedComponentMap(mockSpec, 'parameters')).toThrow(
        new Error(
          'Component type "parameters" not found in the specification. Available types: schemas, responses'
        )
      );
    });

    it('should throw Error if spec has no components section', () => {
      expect(() => getValidatedComponentMap(mockSpecNoComponents, 'schemas')).toThrow(
        new Error('Specification does not contain a components section.')
      );
    });
  });

  // --- getValidatedComponentDetails ---
  describe('getValidatedComponentDetails', () => {
    const schemasMap = mockSpec.components?.schemas as Record<string, OpenAPIV3.SchemaObject>;
    const responsesMap = mockSpec.components?.responses as Record<string, OpenAPIV3.ResponseObject>;
    const detailsMapSchemas = new Map(Object.entries(schemasMap));
    const detailsMapResponses = new Map(Object.entries(responsesMap));

    it('should return details for valid requested names', () => {
      const validDetails = getValidatedComponentDetails(
        detailsMapSchemas,
        ['User', 'Error'],
        'schemas'
      );
      expect(validDetails).toHaveLength(2);
      expect(validDetails[0].name).toBe('User');
      expect(validDetails[0].detail).toEqual(schemasMap['User']);
      expect(validDetails[1].name).toBe('Error');
      expect(validDetails[1].detail).toEqual(schemasMap['Error']);
    });

    it('should return details for a single valid requested name', () => {
      const validDetails = getValidatedComponentDetails(detailsMapSchemas, ['User'], 'schemas');
      expect(validDetails).toHaveLength(1);
      expect(validDetails[0].name).toBe('User');
      expect(validDetails[0].detail).toEqual(schemasMap['User']);
    });

    it('should return only details for valid names when some are invalid', () => {
      const validDetails = getValidatedComponentDetails(
        detailsMapSchemas,
        ['User', 'NonExistent', 'Error'],
        'schemas'
      );
      expect(validDetails).toHaveLength(2);
      expect(validDetails[0].name).toBe('User');
      expect(validDetails[1].name).toBe('Error');
    });

    it('should throw Error if no requested names are valid', () => {
      expect(() =>
        getValidatedComponentDetails(detailsMapSchemas, ['NonExistent1', 'NonExistent2'], 'schemas')
      ).toThrow(
        new Error(
          // Expect sorted names: Error, User
          'None of the requested names (NonExistent1, NonExistent2) are valid for component type "schemas". Available names: Error, User'
        )
      );
    });

    it('should throw Error if requested names array is empty', () => {
      // The calling handler should prevent this, but test the helper
      expect(() => getValidatedComponentDetails(detailsMapSchemas, [], 'schemas')).toThrow(
        new Error(
          // Expect sorted names: Error, User
          'None of the requested names () are valid for component type "schemas". Available names: Error, User'
        )
      );
    });

    it('should work for other component types (responses)', () => {
      const validDetails = getValidatedComponentDetails(
        detailsMapResponses,
        ['NotFound'],
        'responses'
      );
      expect(validDetails).toHaveLength(1);
      expect(validDetails[0].name).toBe('NotFound');
      expect(validDetails[0].detail).toEqual(responsesMap['NotFound']);
    });
  });
});
