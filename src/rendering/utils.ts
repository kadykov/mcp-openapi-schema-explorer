// NOTE: This block replaces the previous import block to ensure types/interfaces are defined correctly.
import { OpenAPIV3 } from 'openapi-types';
import { RenderContext, RenderResultItem } from './types.js'; // Add .js
import {
  buildComponentDetailUriSuffix,
  buildComponentMapUriSuffix,
  buildOperationUriSuffix,
  // buildPathItemUriSuffix, // Not currently used by generateListHint
} from '../utils/uri-builder.js'; // Added .js extension

// Define possible types for list items to guide hint generation
type ListItemType = 'componentType' | 'componentName' | 'pathMethod';

// Define context needed for generating the correct detail URI suffix
interface HintContext {
  itemType: ListItemType;
  firstItemExample?: string; // Example value from the first item in the list
  // For componentName hints, the parent component type is needed
  parentComponentType?: string;
  // For pathMethod hints, the parent path is needed
  parentPath?: string;
}

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
 * Helper to generate a standard hint text for list views, using the centralized URI builders.
 * @param renderContext - The rendering context containing the base URI.
 * @param hintContext - Context about the type of items being listed and their parent context.
 * @returns The hint string.
 */
export function generateListHint(renderContext: RenderContext, hintContext: HintContext): string {
  let detailUriSuffixPattern: string;
  let itemTypeName: string; // User-friendly name for the item type in the hint text
  let exampleUriSuffix: string | undefined; // To hold the generated example URI

  switch (hintContext.itemType) {
    case 'componentType':
      // Listing component types (e.g., schemas, responses) at openapi://components
      // Hint should point to openapi://components/{type}
      detailUriSuffixPattern = buildComponentMapUriSuffix('{type}'); // Use placeholder
      itemTypeName = 'component type';
      if (hintContext.firstItemExample) {
        exampleUriSuffix = buildComponentMapUriSuffix(hintContext.firstItemExample);
      }
      break;
    case 'componentName':
      // Listing component names (e.g., MySchema, User) at openapi://components/{type}
      // Hint should point to openapi://components/{type}/{name}
      if (!hintContext.parentComponentType) {
        console.warn('generateListHint called for componentName without parentComponentType');
        return ''; // Avoid generating a broken hint
      }
      // Use the actual parent type and a placeholder for the name
      detailUriSuffixPattern = buildComponentDetailUriSuffix(
        hintContext.parentComponentType,
        '{name}'
      );
      itemTypeName = hintContext.parentComponentType.slice(0, -1); // e.g., 'schema' from 'schemas'
      if (hintContext.firstItemExample) {
        exampleUriSuffix = buildComponentDetailUriSuffix(
          hintContext.parentComponentType,
          hintContext.firstItemExample
        );
      }
      break;
    case 'pathMethod':
      // Listing methods (e.g., get, post) at openapi://paths/{path}
      // Hint should point to openapi://paths/{path}/{method}
      if (!hintContext.parentPath) {
        console.warn('generateListHint called for pathMethod without parentPath');
        return ''; // Avoid generating a broken hint
      }
      // Use the actual parent path and a placeholder for the method
      detailUriSuffixPattern = buildOperationUriSuffix(hintContext.parentPath, '{method}');
      itemTypeName = 'operation'; // Or 'method'? 'operation' seems clearer
      if (hintContext.firstItemExample) {
        // Ensure the example method is valid if needed, though usually it's just 'get', 'post' etc.
        exampleUriSuffix = buildOperationUriSuffix(
          hintContext.parentPath,
          hintContext.firstItemExample
        );
      }
      break;
    default:
      // Explicitly cast to string to avoid potential 'never' type issue in template literal
      console.warn(`Unknown itemType in generateListHint: ${String(hintContext.itemType)}`);
      return ''; // Avoid generating a hint if context is unknown
  }

  // Construct the full hint URI pattern using the base URI
  const fullHintPattern = `${renderContext.baseUri}${detailUriSuffixPattern}`;
  const fullExampleUri = exampleUriSuffix
    ? `${renderContext.baseUri}${exampleUriSuffix}`
    : undefined;

  let hintText = `\nHint: Use '${fullHintPattern}' to view details for a specific ${itemTypeName}.`;
  if (fullExampleUri) {
    hintText += ` (e.g., ${fullExampleUri})`;
  }

  return hintText;
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
