import { OpenAPIV3 } from 'openapi-types';

export interface EndpointSuccessResponse {
  method: string;
  path: string;
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses: { [key: string]: OpenAPIV3.ResponseObject };
}

export interface EndpointErrorResponse {
  method: string;
  path: string;
  error: string;
}

export type EndpointResponse = EndpointSuccessResponse | EndpointErrorResponse;

export function isEndpointErrorResponse(obj: unknown): obj is EndpointErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as EndpointErrorResponse).error === 'string'
  );
}

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export interface ResourceResponse {
  contents: ResourceContent[];
}

// Types for Schema Resource E2E tests
export type SchemaSuccessResponse = OpenAPIV3.SchemaObject; // Use type alias

export interface SchemaErrorResponse {
  name: string;
  error: string;
}

export type SchemaResponse = SchemaSuccessResponse | SchemaErrorResponse;

export function isSchemaErrorResponse(obj: unknown): obj is SchemaErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as SchemaErrorResponse).name === 'string' && // Check for name property
    typeof (obj as SchemaErrorResponse).error === 'string'
  );
}
