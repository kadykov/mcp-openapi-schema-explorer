import { OpenAPIV3 } from 'openapi-types';
import { RenderResultItem } from './types.js'; // Add .js

/**
 * Safely retrieves the summary from an Operation object.
 * Handles cases where the operation might be undefined or lack a summary.
 *
 * @param operation - The Operation object or undefined.
 * @returns The operation summary or operationId string, truncated if necessary, or null if neither is available.
 */
export function getOperationSummary(
  operation: OpenAPIV3.OperationObject | undefined
): string | null {
  // Return summary or operationId without truncation
  return operation?.summary || operation?.operationId || null;
}

/**
 * Helper to generate a standard hint text for list views.
 * @param context - The rendering context.
 * @param currentUriSuffix - The suffix for the current list view (e.g., 'paths', 'components/schemas').
 * @param itemType - A descriptive name for the items being listed (e.g., 'path', 'schema').
 * @param detailUriPattern - The pattern for accessing item details (e.g., 'paths/{encoded_path}/{method}', 'components/schemas/{name}').
 * @returns The hint string.
 */
export function generateListHint(
  context: { baseUri: string },
  _currentUriSuffix: string, // Prefix with _ as it's not directly used in the string
  itemType: string,
  detailUriPattern: string // This pattern should already include the necessary path/type prefix
): string {
  // The detailUriPattern should be relative to the baseUri, e.g., 'paths/{encoded_path}/{method}' or 'components/schemas/{name}'
  return `\nHint: Use '${context.baseUri}${detailUriPattern}' to view details for a specific ${itemType}.`;
}

/**
 * Helper to generate a standard error item for RenderResultItem arrays.
 * @param uriSuffix - The URI suffix for the error context.
 * @param message - The error message.
 * @returns A RenderResultItem array containing the error.
 */
export function createErrorResult(uriSuffix: string, message: string): RenderResultItem[] {
  return [
    {
      uriSuffix: uriSuffix,
      data: null,
      isError: true,
      errorText: message,
      renderAsList: true, // Errors are typically plain text
    },
  ];
}
