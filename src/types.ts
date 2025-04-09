import { OpenAPI } from 'openapi-types';
import type { TransformContext } from './services/reference-transform.js';

/** Common HTTP methods used in OpenAPI specs */
export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'patch';

/** Interface for spec loader */
export interface SpecLoaderService {
  getSpec(): Promise<OpenAPI.Document>;
  getTransformedSpec(context: TransformContext): Promise<OpenAPI.Document>;
}

// Re-export transform types
export type { TransformContext };

// Re-export OpenAPI types
export type { OpenAPI };
