export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

export interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
}

export interface OperationObject {
  summary?: string;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
}

export interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema: SchemaObject;
}

export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
}

export interface MediaTypeObject {
  schema: SchemaObject | ReferenceObject;
}

export interface ReferenceObject {
  $ref: string;
}

export interface SchemaObject {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string;
  enum?: string[];
  description?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject | ReferenceObject;
}

export function isReferenceObject(obj: unknown): obj is ReferenceObject {
  return typeof obj === 'object' && 
         obj !== null && 
         '$ref' in obj && 
         typeof (obj as ReferenceObject).$ref === 'string';
}

export function isSchemaObject(obj: unknown): obj is SchemaObject {
  return typeof obj === 'object' && 
         obj !== null && 
         !('$ref' in obj) &&
         (!('type' in obj) || 
          (obj as SchemaObject).type === undefined ||
          ['string', 'number', 'integer', 'boolean', 'array', 'object'].includes((obj as SchemaObject).type as string));
}
