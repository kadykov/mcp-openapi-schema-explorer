import * as swagger2openapi from 'swagger2openapi';
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
   * Load, potentially convert (from v2), and parse the OpenAPI specification.
   */
  async loadSpec(): Promise<OpenAPI.Document> {
    const options = {
      patch: true, // Fix minor errors in the spec
      warnOnly: true, // Add warnings for non-patchable errors instead of throwing
      origin: this.specPath, // Helps with resolving relative references if needed
      source: this.specPath,
    };

    try {
      let result;
      // Check if specPath is a URL
      if (this.specPath.startsWith('http://') || this.specPath.startsWith('https://')) {
        result = await swagger2openapi.convertUrl(this.specPath, options);
      } else {
        result = await swagger2openapi.convertFile(this.specPath, options);
      }

      // swagger2openapi returns the result in result.openapi
      if (!result || !result.openapi) {
        throw new Error('Conversion or parsing failed to produce an OpenAPI document.');
      }

      // TODO: Check result.options?.warnings for potential issues?

      this.specData = result.openapi as OpenAPI.Document; // Assuming result.openapi is compatible
      return this.specData;
    } catch (error) {
      // Improve error message clarity
      let message = `Failed to load/convert OpenAPI spec from ${this.specPath}: `;
      if (error instanceof Error) {
        message += error.message;
        // Include stack trace if available and helpful?
        // console.error(error.stack);
      } else {
        message += String(error);
      }
      throw new Error(message);
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
