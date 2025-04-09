import { SpecLoader, createSpecLoader } from '../../../../src/services/spec-loader.js';
import { OpenAPIV3 } from 'openapi-types';

// Create a mock function with proper type
const mockValidateFunction = jest.fn<Promise<OpenAPIV3.Document>, [string]>();

// Mock SwaggerParser
jest.mock('@apidevtools/swagger-parser', () => {
  return {
    __esModule: true,
    default: {
      // Bind function to avoid 'this' context issues
      validate: (path: string): Promise<OpenAPIV3.Document> => mockValidateFunction(path),
    },
  };
});

describe('SpecLoader', () => {
  const mockSpec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {},
  };

  beforeEach(() => {
    mockValidateFunction.mockReset();
  });

  describe('loadSpec', () => {
    it('loads and parses OpenAPI spec from file', async () => {
      mockValidateFunction.mockResolvedValue(mockSpec);

      const loader = new SpecLoader('/path/to/spec.json');
      const spec = await loader.loadSpec();

      expect(mockValidateFunction).toHaveBeenCalledWith('/path/to/spec.json');
      expect(spec).toBeDefined();
      expect(spec.info.title).toBe('Test API');
    });

    it('throws error if spec cannot be loaded', async () => {
      mockValidateFunction.mockRejectedValue(new Error('File not found'));

      const loader = new SpecLoader('/path/to/spec.json');
      await expect(loader.loadSpec()).rejects.toThrow(
        'Failed to load OpenAPI spec: File not found'
      );
    });
  });

  describe('getSpec', () => {
    it('returns loaded spec', async () => {
      mockValidateFunction.mockResolvedValue(mockSpec);

      const loader = new SpecLoader('/path/to/spec.json');
      await loader.loadSpec();
      const spec = loader.getSpec();

      expect(spec).toBeDefined();
      expect(spec.info.title).toBe('Test API');
    });

    it('throws error if spec not loaded', () => {
      const loader = new SpecLoader('/path/to/spec.json');
      expect(() => loader.getSpec()).toThrow('OpenAPI spec not loaded. Call loadSpec() first.');
    });
  });

  describe('createSpecLoader', () => {
    it('creates and initializes loader', async () => {
      mockValidateFunction.mockResolvedValue(mockSpec);

      const loader = await createSpecLoader('/path/to/spec.json');
      expect(loader.getSpec()).toBeDefined();
      expect(loader.getSpec().info.title).toBe('Test API');
    });

    it('throws error if initialization fails', async () => {
      mockValidateFunction.mockRejectedValue(new Error('File not found'));

      await expect(createSpecLoader('/path/to/spec.json')).rejects.toThrow(
        'Failed to load OpenAPI spec: File not found'
      );
    });
  });
});
