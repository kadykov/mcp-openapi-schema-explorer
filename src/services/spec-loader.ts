import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPI } from 'openapi-types';

/**
 * Service for loading and caching OpenAPI specifications
 */
export class SpecLoader {
  private specData: OpenAPI.Document | null = null;

  constructor(private specPath: string) {}

  /**
   * Load and parse the OpenAPI specification from file
   * Resolves all $refs and validates the spec
   */
  async loadSpec(): Promise<OpenAPI.Document> {
    try {
      // Parse and validate the spec using SwaggerParser
      const validatedSpec = await SwaggerParser.validate(this.specPath);
      this.specData = validatedSpec;
      return validatedSpec;
    } catch (error) {
      throw new Error(
        `Failed to load OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the loaded specification
   */
  getSpec(): OpenAPI.Document {
    if (!this.specData) {
      throw new Error('OpenAPI spec not loaded. Call loadSpec() first.');
    }
    return this.specData;
  }
}

/**
 * Create and initialize a new SpecLoader instance
 */
export async function createSpecLoader(specPath: string): Promise<SpecLoader> {
  const loader = new SpecLoader(specPath);
  await loader.loadSpec();
  return loader;
}
