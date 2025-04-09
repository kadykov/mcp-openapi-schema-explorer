import { OpenAPIV3 } from 'openapi-types';

export interface TransformContext {
  resourceType: 'endpoint' | 'schema';
  format: 'openapi' | 'asyncapi' | 'graphql';
  path?: string;
  method?: string;
}

export interface ReferenceObject {
  $ref: string;
}

export interface TransformedReference {
  $ref: string;
}

export interface ReferenceTransform<T> {
  transformRefs(document: T, context: TransformContext): T;
}

export class ReferenceTransformService {
  private transformers = new Map<string, ReferenceTransform<unknown>>();

  registerTransformer<T>(format: string, transformer: ReferenceTransform<T>): void {
    this.transformers.set(format, transformer as ReferenceTransform<unknown>);
  }

  transformDocument<T>(document: T, context: TransformContext): T {
    const transformer = this.transformers.get(context.format) as ReferenceTransform<T>;
    if (!transformer) {
      throw new Error(`No transformer registered for format: ${context.format}`);
    }
    return transformer.transformRefs(document, context);
  }
}

export class OpenAPITransformer implements ReferenceTransform<OpenAPIV3.Document> {
  // Handle nested objects recursively
  private transformObject(obj: unknown, _context: TransformContext): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformObject(item, _context));
    }

    // Handle references
    if (this.isReferenceObject(obj)) {
      return this.transformReference(obj.$ref);
    }

    // Recursively transform object properties
    const result: Record<string, unknown> = {};
    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          Object.defineProperty(result, key, {
            value: this.transformObject(value, _context),
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }
      }
    }
    return result;
  }

  private isReferenceObject(obj: unknown): obj is ReferenceObject {
    return typeof obj === 'object' && obj !== null && '$ref' in obj;
  }

  private transformReference(ref: string): TransformedReference {
    // Handle only internal references for now
    if (!ref.startsWith('#/')) {
      return { $ref: ref }; // Keep external refs as-is
    }

    const parts = ref.split('/');
    // Handle schema references
    if (parts[1] === 'components' && parts[2] === 'schemas') {
      const schemaName = parts[3];
      return {
        $ref: `openapi://schema/${schemaName}`,
      };
    }

    // Keep other internal references as-is for now
    return { $ref: ref };
  }

  transformRefs(document: OpenAPIV3.Document, context: TransformContext): OpenAPIV3.Document {
    const transformed = this.transformObject(document, context);
    return transformed as OpenAPIV3.Document;
  }
}
