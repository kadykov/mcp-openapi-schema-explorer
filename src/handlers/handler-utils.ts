import { OpenAPIV3 } from 'openapi-types';
import { RenderContext, RenderResultItem } from '../rendering/types.js'; // Already has .js

// Define the structure expected for each item in the contents array
export type FormattedResultItem = {
  uri: string;
  mimeType?: string;
  text: string;
  isError?: boolean;
};

/**
 * Formats RenderResultItem array into an array compatible with the 'contents'
 * property of ReadResourceResultSchema (specifically TextResourceContents).
 */
export function formatResults(
  context: RenderContext,
  items: RenderResultItem[]
): FormattedResultItem[] {
  // Add type check for formatter existence in context
  if (!context.formatter) {
    throw new Error('Formatter is missing in RenderContext for formatResults');
  }
  return items.map(item => {
    const uri = `${context.baseUri}${item.uriSuffix}`;
    let text: string;
    let mimeType: string;

    if (item.isError) {
      text = item.errorText || 'An unknown error occurred.';
      mimeType = 'text/plain';
    } else if (item.renderAsList) {
      text = typeof item.data === 'string' ? item.data : 'Invalid list data';
      mimeType = 'text/plain';
    } else {
      // Detail view: format using the provided formatter
      try {
        text = context.formatter.format(item.data);
        mimeType = context.formatter.getMimeType();
      } catch (formatError: unknown) {
        text = `Error formatting data for ${uri}: ${
          formatError instanceof Error ? formatError.message : String(formatError)
        }`;
        mimeType = 'text/plain';
        // Ensure isError is true if formatting fails
        item.isError = true;
        item.errorText = text; // Store the formatting error message
      }
    }

    // Construct the final object, prioritizing item.isError
    const finalItem: FormattedResultItem = {
      uri: uri,
      mimeType: mimeType,
      text: item.isError ? item.errorText || 'An unknown error occurred.' : text,
      isError: item.isError ?? false, // Default to false if not explicitly set
    };
    // Ensure mimeType is text/plain for errors
    if (finalItem.isError) {
      finalItem.mimeType = 'text/plain';
    }

    return finalItem;
  });
}

/**
 * Type guard to check if an object is an OpenAPIV3.Document.
 */
export function isOpenAPIV3(spec: unknown): spec is OpenAPIV3.Document {
  return (
    typeof spec === 'object' &&
    spec !== null &&
    'openapi' in spec &&
    typeof (spec as { openapi: unknown }).openapi === 'string' &&
    (spec as { openapi: string }).openapi.startsWith('3.')
  );
}
