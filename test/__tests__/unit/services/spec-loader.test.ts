import { SpecLoaderService } from '../../../../src/services/spec-loader.js';
import { ReferenceTransformService } from '../../../../src/services/reference-transform.js';
import { OpenAPIV3 } from 'openapi-types';

// Create a mock function with proper type
const mockParseFunction = jest.fn<Promise<OpenAPIV3.Document>, [string]>();

// Mock SwaggerParser
jest.mock('@apidevtools/swagger-parser', () => {
  return {
    __esModule: true,
    default: {
      // Bind function to avoid 'this' context issues
      parse: (path: string): Promise<OpenAPIV3.Document> => mockParseFunction(path),
    },
  };
});

describe('SpecLoaderService', () => {
  const mockSpec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {},
  };

  let referenceTransform: ReferenceTransformService;

  beforeEach(() => {
    mockParseFunction.mockReset();
    referenceTransform = new ReferenceTransformService();
    jest.spyOn(referenceTransform, 'transformDocument').mockImplementation(() => mockSpec);
  });

  describe('loadSpec', () => {
    it('loads and parses OpenAPI spec from file', async () => {
      mockParseFunction.mockResolvedValue(mockSpec);

      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      const spec = await loader.loadSpec();

      expect(mockParseFunction).toHaveBeenCalledWith('/path/to/spec.json');
      expect(spec).toBeDefined();
      expect(spec.info.title).toBe('Test API');
    });

    it('throws error if spec cannot be loaded', async () => {
      mockParseFunction.mockRejectedValue(new Error('File not found'));

      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      await expect(loader.loadSpec()).rejects.toThrow(
        'Failed to load OpenAPI spec: File not found'
      );
    });
  });

  describe('getSpec', () => {
    it('returns loaded spec', async () => {
      mockParseFunction.mockResolvedValue(mockSpec);

      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      await loader.loadSpec();
      const spec = await loader.getSpec();

      expect(spec).toBeDefined();
      expect(spec.info.title).toBe('Test API');
    });

    it('loads spec if not loaded', async () => {
      mockParseFunction.mockResolvedValue(mockSpec);

      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      const spec = await loader.getSpec();

      expect(mockParseFunction).toHaveBeenCalledWith('/path/to/spec.json');
      expect(spec).toBeDefined();
      expect(spec.info.title).toBe('Test API');
    });
  });

  describe('getTransformedSpec', () => {
    it('returns transformed spec', async () => {
      mockParseFunction.mockResolvedValue(mockSpec);
      const transformedSpec = { ...mockSpec, transformed: true };
      (referenceTransform.transformDocument as jest.Mock).mockReturnValue(transformedSpec);

      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      const spec = await loader.getTransformedSpec({
        resourceType: 'endpoint',
        format: 'openapi',
      });

      expect(spec).toBeDefined();
      const transformSpy = jest.spyOn(referenceTransform, 'transformDocument');
      expect(transformSpy).toHaveBeenCalledWith(
        mockSpec,
        expect.objectContaining({
          resourceType: 'endpoint',
          format: 'openapi',
        })
      );
      expect(spec).toBe(transformedSpec);
    });

    it('loads spec if not loaded', async () => {
      mockParseFunction.mockResolvedValue(mockSpec);

      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      await loader.getTransformedSpec({
        resourceType: 'endpoint',
        format: 'openapi',
      });

      expect(mockParseFunction).toHaveBeenCalledWith('/path/to/spec.json');
    });
  });
});
