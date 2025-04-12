/**
 * Utility functions for building standardized MCP URIs for this server.
 */

const BASE_URI_SCHEME = 'openapi://';

/**
 * Encodes a string component for safe inclusion in a URI path segment.
 * Uses standard encodeURIComponent.
 * Encodes a path string for safe inclusion in a URI.
 * This specifically targets path strings which might contain characters
 * like '{', '}', etc., that need encoding when forming the URI path part.
 * Uses standard encodeURIComponent.
 * Encodes a path string for safe inclusion in a URI path segment.
 * This is necessary because the path segment comes from the user potentially
 * containing characters that need encoding (like '{', '}').
 * Uses standard encodeURIComponent.
 * @param path The path string to encode.
 * @returns The encoded path string, with leading slashes removed before encoding.
 */
export function encodeUriPathComponent(path: string): string {
  // Added export
  // Remove leading slashes before encoding
  const pathWithoutLeadingSlash = path.replace(/^\/+/, '');
  return encodeURIComponent(pathWithoutLeadingSlash);
}

// --- Full URI Builders ---

/**
 * Builds the URI for accessing a specific component's details.
 * Example: openapi://components/schemas/MySchema
 * @param type The component type (e.g., 'schemas', 'responses').
 * @param name The component name.
 * @returns The full component detail URI.
 */
export function buildComponentDetailUri(type: string, name: string): string {
  // Per user instruction, do not encode type or name here.
  return `${BASE_URI_SCHEME}components/${type}/${name}`;
}

/**
 * Builds the URI for listing components of a specific type.
 * Example: openapi://components/schemas
 * @param type The component type (e.g., 'schemas', 'responses').
 * @returns The full component map URI.
 */
export function buildComponentMapUri(type: string): string {
  // Per user instruction, do not encode type here.
  return `${BASE_URI_SCHEME}components/${type}`;
}

/**
 * Builds the URI for accessing a specific operation's details.
 * Example: openapi://paths/users/{userId}/GET
 * @param path The API path (e.g., '/users/{userId}').
 * @param method The HTTP method (e.g., 'GET', 'POST').
 * @returns The full operation detail URI.
 */
export function buildOperationUri(path: string, method: string): string {
  // Encode only the path component. Assume 'path' is raw/decoded.
  // Method is assumed to be safe or handled by SDK/client.
  return `${BASE_URI_SCHEME}paths/${encodeUriPathComponent(path)}/${method.toLowerCase()}`; // Standardize method to lowercase
}

/**
 * Builds the URI for listing methods available at a specific path.
 * Example: openapi://paths/users/{userId}
 * @param path The API path (e.g., '/users/{userId}').
 * @returns The full path item URI.
 */
export function buildPathItemUri(path: string): string {
  // Encode only the path component. Assume 'path' is raw/decoded.
  return `${BASE_URI_SCHEME}paths/${encodeUriPathComponent(path)}`;
}

/**
 * Builds the URI for accessing a top-level field (like 'info' or 'servers')
 * or triggering a list view ('paths', 'components').
 * Example: openapi://info, openapi://paths
 * @param field The top-level field name.
 * @returns The full top-level field URI.
 */
export function buildTopLevelFieldUri(field: string): string {
  // Per user instruction, do not encode field here.
  return `${BASE_URI_SCHEME}${field}`;
}

// --- URI Suffix Builders (for RenderResultItem) ---

/**
 * Builds the URI suffix for a specific component's details.
 * Example: components/schemas/MySchema
 */
export function buildComponentDetailUriSuffix(type: string, name: string): string {
  // Per user instruction, do not encode type or name here.
  return `components/${type}/${name}`;
}

/**
 * Builds the URI suffix for listing components of a specific type.
 * Example: components/schemas
 */
export function buildComponentMapUriSuffix(type: string): string {
  // Per user instruction, do not encode type here.
  return `components/${type}`;
}

/**
 * Builds the URI suffix for a specific operation's details.
 * Example: paths/users/{userId}/get
 */
export function buildOperationUriSuffix(path: string, method: string): string {
  // Encode only the path component for the suffix. Assume 'path' is raw/decoded.
  return `paths/${encodeUriPathComponent(path)}/${method.toLowerCase()}`;
}

/**
 * Builds the URI suffix for listing methods available at a specific path.
 * Example: paths/users/{userId}
 */
export function buildPathItemUriSuffix(path: string): string {
  // Encode only the path component for the suffix. Assume 'path' is raw/decoded.
  return `paths/${encodeUriPathComponent(path)}`;
}

/**
 * Builds the URI suffix for a top-level field.
 * Example: info, paths
 */
export function buildTopLevelFieldUriSuffix(field: string): string {
  // Per user instruction, do not encode field here.
  return field;
}
