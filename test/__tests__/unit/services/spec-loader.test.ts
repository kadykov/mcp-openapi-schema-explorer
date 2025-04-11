import { SpecLoaderService } from '../../../../src/services/spec-loader.js';
import { ReferenceTransformService } from '../../../../src/services/reference-transform.js';
import { OpenAPIV3 } from 'openapi-types';

// Define mock implementations first
const mockConvertUrlImplementation = jest.fn();
const mockConvertFileImplementation = jest.fn();

// Mock the module, referencing the defined implementations
// IMPORTANT: The factory function for jest.mock runs BEFORE top-level variable assignments in the module scope.
// We need to access the mocks indirectly.
interface Swagger2OpenapiResult {
  openapi: OpenAPIV3.Document;
  options: unknown; // Use unknown for options as we don't have precise types here
}

jest.mock('swagger2openapi', () => {
  // Return an object where the properties are functions that call our mocks
  return {
    convertUrl: (url: string, options: unknown): Promise<Swagger2OpenapiResult> =>
      mockConvertUrlImplementation(url, options) as Promise<Swagger2OpenapiResult>, // Cast return type
    convertFile: (filename: string, options: unknown): Promise<Swagger2OpenapiResult> =>
      mockConvertFileImplementation(filename, options) as Promise<Swagger2OpenapiResult>, // Cast return type
  };
});

describe('SpecLoaderService', () => {
  const mockV3Spec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Test V3 API',
      version: '1.0.0',
    },
    paths: {},
  };

  // Simulate the structure returned by swagger2openapi
  const mockS2OResult = {
    openapi: mockV3Spec,
    options: {}, // Add other properties if needed by tests
  };

  let referenceTransform: ReferenceTransformService;

  beforeEach(() => {
    // Reset the mock implementations
    mockConvertUrlImplementation.mockReset();
    mockConvertFileImplementation.mockReset();
    referenceTransform = new ReferenceTransformService();
    // Mock the transformDocument method for simplicity in these tests
    jest.spyOn(referenceTransform, 'transformDocument').mockImplementation(spec => spec);
  });

  describe('loadSpec', () => {
    it('loads local v3 spec using convertFile', async () => {
      mockConvertFileImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      const spec = await loader.loadSpec();

      expect(mockConvertFileImplementation).toHaveBeenCalledWith(
        '/path/to/spec.json',
        expect.any(Object)
      );
      expect(mockConvertUrlImplementation).not.toHaveBeenCalled();
      expect(spec).toEqual(mockV3Spec);
    });

    it('loads remote v3 spec using convertUrl', async () => {
      mockConvertUrlImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('http://example.com/spec.json', referenceTransform);
      const spec = await loader.loadSpec();

      expect(mockConvertUrlImplementation).toHaveBeenCalledWith(
        'http://example.com/spec.json',
        expect.any(Object)
      );
      expect(mockConvertFileImplementation).not.toHaveBeenCalled();
      expect(spec).toEqual(mockV3Spec);
    });

    it('loads and converts local v2 spec using convertFile', async () => {
      // Assume convertFile handles v2 internally and returns v3
      mockConvertFileImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('/path/to/v2spec.json', referenceTransform);
      const spec = await loader.loadSpec();

      expect(mockConvertFileImplementation).toHaveBeenCalledWith(
        '/path/to/v2spec.json',
        expect.any(Object)
      );
      expect(mockConvertUrlImplementation).not.toHaveBeenCalled();
      expect(spec).toEqual(mockV3Spec); // Should be the converted v3 spec
    });

    it('loads and converts remote v2 spec using convertUrl', async () => {
      // Assume convertUrl handles v2 internally and returns v3
      mockConvertUrlImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('https://example.com/v2spec.yaml', referenceTransform);
      const spec = await loader.loadSpec();

      expect(mockConvertUrlImplementation).toHaveBeenCalledWith(
        'https://example.com/v2spec.yaml',
        expect.any(Object)
      );
      expect(mockConvertFileImplementation).not.toHaveBeenCalled();
      expect(spec).toEqual(mockV3Spec); // Should be the converted v3 spec
    });

    it('throws error if convertFile fails', async () => {
      const loadError = new Error('File not found');
      mockConvertFileImplementation.mockRejectedValue(loadError);
      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);

      await expect(loader.loadSpec()).rejects.toThrow(
        'Failed to load/convert OpenAPI spec from /path/to/spec.json: File not found'
      );
    });

    it('throws error if convertUrl fails', async () => {
      const loadError = new Error('Network error');
      mockConvertUrlImplementation.mockRejectedValue(loadError);
      const loader = new SpecLoaderService('http://example.com/spec.json', referenceTransform);

      await expect(loader.loadSpec()).rejects.toThrow(
        'Failed to load/convert OpenAPI spec from http://example.com/spec.json: Network error'
      );
    });

    it('throws error if result object is invalid', async () => {
      mockConvertFileImplementation.mockResolvedValue({ options: {} }); // Missing openapi property
      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);

      await expect(loader.loadSpec()).rejects.toThrow(
        'Failed to load/convert OpenAPI spec from /path/to/spec.json: Conversion or parsing failed to produce an OpenAPI document.'
      );
    });
  });

  describe('getSpec', () => {
    it('returns loaded spec after loadSpec called', async () => {
      mockConvertFileImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      await loader.loadSpec(); // Load first
      const spec = await loader.getSpec();

      expect(spec).toEqual(mockV3Spec);
      // Ensure loadSpec was only called once implicitly by the first await
      expect(mockConvertFileImplementation).toHaveBeenCalledTimes(1);
    });

    it('loads spec via convertFile if not already loaded', async () => {
      mockConvertFileImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      const spec = await loader.getSpec(); // Should trigger loadSpec

      expect(mockConvertFileImplementation).toHaveBeenCalledWith(
        '/path/to/spec.json',
        expect.any(Object)
      );
      expect(spec).toEqual(mockV3Spec);
    });

    it('loads spec via convertUrl if not already loaded', async () => {
      mockConvertUrlImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('http://example.com/spec.json', referenceTransform);
      const spec = await loader.getSpec(); // Should trigger loadSpec

      expect(mockConvertUrlImplementation).toHaveBeenCalledWith(
        'http://example.com/spec.json',
        expect.any(Object)
      );
      expect(spec).toEqual(mockV3Spec);
    });
  });

  describe('getTransformedSpec', () => {
    // Mock the transformer to return a distinctly modified object
    const mockTransformedSpec = {
      ...mockV3Spec,
      info: { ...mockV3Spec.info, title: 'Transformed API' },
    };

    beforeEach(() => {
      jest
        .spyOn(referenceTransform, 'transformDocument')
        .mockImplementation(() => mockTransformedSpec);
    });

    it('returns transformed spec after loading', async () => {
      mockConvertFileImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      const spec = await loader.getTransformedSpec({ resourceType: 'endpoint', format: 'openapi' }); // Should load then transform

      expect(mockConvertFileImplementation).toHaveBeenCalledTimes(1); // Ensure loading happened
      const transformSpy = jest.spyOn(referenceTransform, 'transformDocument');
      expect(transformSpy).toHaveBeenCalledWith(
        mockV3Spec,
        expect.objectContaining({ resourceType: 'endpoint', format: 'openapi' })
      );
      expect(spec).toEqual(mockTransformedSpec);
    });

    it('loads spec if not loaded before transforming', async () => {
      mockConvertFileImplementation.mockResolvedValue(mockS2OResult);
      const loader = new SpecLoaderService('/path/to/spec.json', referenceTransform);
      await loader.getTransformedSpec({ resourceType: 'endpoint', format: 'openapi' }); // Trigger load

      expect(mockConvertFileImplementation).toHaveBeenCalledWith(
        '/path/to/spec.json',
        expect.any(Object)
      );
    });
  });
});
