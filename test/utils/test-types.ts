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
