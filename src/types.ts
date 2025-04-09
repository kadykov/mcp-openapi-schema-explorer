import { OpenAPI } from 'openapi-types';

/** Common HTTP methods used in OpenAPI specs */
export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'patch';

/** Interface for spec loader */
export interface SpecLoaderService {
  getSpec(): OpenAPI.Document;
}

// Re-export OpenAPI types
export type { OpenAPI };
