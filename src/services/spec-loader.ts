import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPI } from 'openapi-types';
import { ReferenceTransformService, TransformContext } from './reference-transform.js';

/**
 * Service for loading and transforming OpenAPI specifications
 */
export class SpecLoaderService {
  private specData: OpenAPI.Document | null = null;

  constructor(
    private specPath: string,
    private referenceTransform: ReferenceTransformService
  ) {}

  /**
   * Load and parse the OpenAPI specification from file
   * Only parses the spec without resolving $refs
   */
  async loadSpec(): Promise<OpenAPI.Document> {
    try {
      // Parse spec without resolving refs
      const parsedSpec = await SwaggerParser.parse(this.specPath);
      this.specData = parsedSpec;
      return parsedSpec;
    } catch (error) {
      throw new Error(
        `Failed to load OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the loaded specification
   */
  async getSpec(): Promise<OpenAPI.Document> {
    if (!this.specData) {
      await this.loadSpec();
    }
    return this.specData!;
  }

  /**
   * Get transformed specification with MCP resource references
   */
  async getTransformedSpec(context: TransformContext): Promise<OpenAPI.Document> {
    const spec = await this.getSpec();
    return this.referenceTransform.transformDocument(spec, context);
  }
}

/**
 * Create and initialize a new SpecLoaderService instance
 */
export async function createSpecLoader(
  specPath: string,
  referenceTransform: ReferenceTransformService
): Promise<SpecLoaderService> {
  const loader = new SpecLoaderService(specPath, referenceTransform);
  await loader.loadSpec();
  return loader;
}
