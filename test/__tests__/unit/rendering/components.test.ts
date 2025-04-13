import { OpenAPIV3 } from 'openapi-types';
import { RenderableComponents, RenderableComponentMap } from '../../../../src/rendering/components';
import { RenderContext } from '../../../../src/rendering/types';
import { IFormatter, JsonFormatter } from '../../../../src/services/formatters';

// Mock Formatter & Context
const mockFormatter: IFormatter = new JsonFormatter();
const mockContext: RenderContext = {
  formatter: mockFormatter,
  baseUri: 'openapi://',
};

// Sample Components Object Fixture
const sampleComponents: OpenAPIV3.ComponentsObject = {
  schemas: {
    User: { type: 'object', properties: { name: { type: 'string' } } },
    Error: { type: 'object', properties: { message: { type: 'string' } } },
  },
  parameters: {
    userIdParam: { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
  },
  responses: {
    NotFound: { description: 'Resource not found' },
  },
  // Intentionally empty type
  examples: {},
  // Intentionally missing type
  // securitySchemes: {}
};

const emptyComponents: OpenAPIV3.ComponentsObject = {};

describe('RenderableComponents (List Types)', () => {
  it('should list available component types correctly', () => {
    const renderable = new RenderableComponents(sampleComponents);
    const result = renderable.renderList(mockContext);

    expect(result).toHaveLength(1);
    expect(result[0].uriSuffix).toBe('components');
    expect(result[0].renderAsList).toBe(true);
    expect(result[0].isError).toBeUndefined();
    expect(result[0].data).toContain('Available Component Types:');
    // Check sorted types with descriptions
    expect(result[0].data).toMatch(/-\s+examples: Reusable examples of media type payloads\n/);
    expect(result[0].data).toMatch(
      /-\s+parameters: Reusable request parameters \(query, path, header, cookie\)\n/
    );
    expect(result[0].data).toMatch(/-\s+responses: Reusable API responses\n/);
    expect(result[0].data).toMatch(/-\s+schemas: Reusable data structures \(models\)\n/);
    expect(result[0].data).not.toContain('- securitySchemes'); // Missing type
    // Check hint with example
    expect(result[0].data).toContain(
      "Hint: Use 'openapi://components/{type}' to view details for a specific component type. (e.g., openapi://components/examples)"
    );
  });

  it('should handle empty components object', () => {
    const renderable = new RenderableComponents(emptyComponents);
    const result = renderable.renderList(mockContext);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      uriSuffix: 'components',
      isError: true, // Changed expectation: should be an error if no components
      errorText: 'No components found in the specification.',
      renderAsList: true,
    });
  });

  it('should handle components object with no valid types', () => {
    // Create object with only an extension property but no valid component types
    const invalidComponents = { 'x-custom': {} } as OpenAPIV3.ComponentsObject;
    const renderable = new RenderableComponents(invalidComponents);
    const result = renderable.renderList(mockContext);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      uriSuffix: 'components',
      isError: true,
      errorText: 'No valid component types found.',
      renderAsList: true,
    });
  });

  it('should handle undefined components object', () => {
    const renderable = new RenderableComponents(undefined);
    const result = renderable.renderList(mockContext);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      uriSuffix: 'components',
      isError: true,
      errorText: 'No components found in the specification.',
      renderAsList: true,
    });
  });

  it('renderDetail should delegate to renderList', () => {
    const renderable = new RenderableComponents(sampleComponents);
    const listResult = renderable.renderList(mockContext);
    const detailResult = renderable.renderDetail(mockContext);
    expect(detailResult).toEqual(listResult);
  });

  it('getComponentMap should return correct map', () => {
    const renderable = new RenderableComponents(sampleComponents);
    expect(renderable.getComponentMap('schemas')).toBe(sampleComponents.schemas);
    expect(renderable.getComponentMap('parameters')).toBe(sampleComponents.parameters);
    expect(renderable.getComponentMap('examples')).toBe(sampleComponents.examples);
    expect(renderable.getComponentMap('securitySchemes')).toBeUndefined();
  });
});

describe('RenderableComponentMap (List/Detail Names)', () => {
  const schemasMap = sampleComponents.schemas;
  const parametersMap = sampleComponents.parameters;
  const emptyMap = sampleComponents.examples;
  const schemasUriSuffix = 'components/schemas';
  const paramsUriSuffix = 'components/parameters';

  describe('renderList (List Names)', () => {
    it('should list component names correctly (schemas)', () => {
      const renderable = new RenderableComponentMap(schemasMap, 'schemas', schemasUriSuffix);
      const result = renderable.renderList(mockContext);
      expect(result).toHaveLength(1);
      expect(result[0].uriSuffix).toBe(schemasUriSuffix);
      expect(result[0].renderAsList).toBe(true);
      expect(result[0].isError).toBeUndefined();
      expect(result[0].data).toContain('Available schemas:');
      expect(result[0].data).toMatch(/-\s+Error\n/); // Sorted
      expect(result[0].data).toMatch(/-\s+User\n/);
      // Check hint with example
      expect(result[0].data).toContain(
        "Hint: Use 'openapi://components/schemas/{name}' to view details for a specific schema. (e.g., openapi://components/schemas/Error)"
      );
    });

    it('should list component names correctly (parameters)', () => {
      const renderable = new RenderableComponentMap(parametersMap, 'parameters', paramsUriSuffix);
      const result = renderable.renderList(mockContext);
      expect(result).toHaveLength(1);
      expect(result[0].uriSuffix).toBe(paramsUriSuffix);
      expect(result[0].data).toContain('Available parameters:');
      expect(result[0].data).toMatch(/-\s+userIdParam\n/);
      // Check hint with example
      expect(result[0].data).toContain(
        "Hint: Use 'openapi://components/parameters/{name}' to view details for a specific parameter. (e.g., openapi://components/parameters/userIdParam)"
      );
    });

    it('should handle empty component map', () => {
      const renderable = new RenderableComponentMap(emptyMap, 'examples', 'components/examples');
      const result = renderable.renderList(mockContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uriSuffix: 'components/examples',
        isError: true,
        errorText: 'No components of type "examples" found.',
        renderAsList: true,
      });
    });

    it('should handle undefined component map', () => {
      const renderable = new RenderableComponentMap(
        undefined,
        'securitySchemes',
        'components/securitySchemes'
      );
      const result = renderable.renderList(mockContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uriSuffix: 'components/securitySchemes',
        isError: true,
        errorText: 'No components of type "securitySchemes" found.',
        renderAsList: true,
      });
    });
  });

  describe('renderComponentDetail (Get Component Detail)', () => {
    it('should return detail for a single valid component', () => {
      const renderable = new RenderableComponentMap(schemasMap, 'schemas', schemasUriSuffix);
      const result = renderable.renderComponentDetail(mockContext, ['User']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: `${schemasUriSuffix}/User`,
        data: schemasMap?.User, // Expect raw component object
      });
    });

    it('should return details for multiple valid components', () => {
      const renderable = new RenderableComponentMap(schemasMap, 'schemas', schemasUriSuffix);
      const result = renderable.renderComponentDetail(mockContext, ['Error', 'User']);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        uriSuffix: `${schemasUriSuffix}/Error`,
        data: schemasMap?.Error,
      });
      expect(result).toContainEqual({
        uriSuffix: `${schemasUriSuffix}/User`,
        data: schemasMap?.User,
      });
    });

    it('should return error for non-existent component', () => {
      const renderable = new RenderableComponentMap(schemasMap, 'schemas', schemasUriSuffix);
      const result = renderable.renderComponentDetail(mockContext, ['NonExistent']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: `${schemasUriSuffix}/NonExistent`,
        data: null,
        isError: true,
        errorText: 'Component "NonExistent" of type "schemas" not found.',
        renderAsList: true,
      });
    });

    it('should handle mix of valid and invalid components', () => {
      const renderable = new RenderableComponentMap(schemasMap, 'schemas', schemasUriSuffix);
      const result = renderable.renderComponentDetail(mockContext, ['User', 'Invalid']);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        uriSuffix: `${schemasUriSuffix}/User`,
        data: schemasMap?.User,
      });
      expect(result).toContainEqual({
        uriSuffix: `${schemasUriSuffix}/Invalid`,
        data: null,
        isError: true,
        errorText: 'Component "Invalid" of type "schemas" not found.',
        renderAsList: true,
      });
    });

    it('should return error if component map is undefined', () => {
      const renderable = new RenderableComponentMap(
        undefined,
        'securitySchemes',
        'components/securitySchemes'
      );
      const result = renderable.renderComponentDetail(mockContext, ['apiKey']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uriSuffix: 'components/securitySchemes/apiKey',
        data: null,
        isError: true,
        errorText: 'Component map for type "securitySchemes" not found.',
        renderAsList: true,
      });
    });
  });

  describe('renderDetail (Interface Method)', () => {
    it('should delegate to renderList', () => {
      const renderable = new RenderableComponentMap(schemasMap, 'schemas', schemasUriSuffix);
      const listResult = renderable.renderList(mockContext);
      const detailResult = renderable.renderDetail(mockContext);
      expect(detailResult).toEqual(listResult);
    });
  });

  describe('getComponent', () => {
    it('should return correct component object', () => {
      const renderable = new RenderableComponentMap(schemasMap, 'schemas', schemasUriSuffix);
      expect(renderable.getComponent('User')).toBe(schemasMap?.User);
      expect(renderable.getComponent('Error')).toBe(schemasMap?.Error);
    });

    it('should return undefined for non-existent component', () => {
      const renderable = new RenderableComponentMap(schemasMap, 'schemas', schemasUriSuffix);
      expect(renderable.getComponent('NonExistent')).toBeUndefined();
    });

    it('should return undefined if component map is undefined', () => {
      const renderable = new RenderableComponentMap(
        undefined,
        'securitySchemes',
        'components/securitySchemes'
      );
      expect(renderable.getComponent('apiKey')).toBeUndefined();
    });
  });
});
