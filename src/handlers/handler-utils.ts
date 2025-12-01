import { OpenAPIV3 } from 'openapi-types';
import { RenderContext, RenderResultItem } from '../rendering/types.js'; // Already has .js
// Remove McpError/ErrorCode import - use standard Error

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

/**
 * Safely retrieves a PathItemObject from the specification using a Map.
 * Throws an McpError if the path is not found.
 *
 * @param spec The OpenAPIV3 Document.
 * @param path The decoded path string (e.g., '/users/{id}').
 * @returns The validated PathItemObject.
 * @throws {McpError} If the path is not found in spec.paths.
 */
export function getValidatedPathItem(
  spec: OpenAPIV3.Document,
  path: string
): OpenAPIV3.PathItemObject {
  if (!spec.paths) {
    // Use standard Error
    throw new Error('Specification does not contain any paths.');
  }
  const pathsMap = new Map(Object.entries(spec.paths));
  const pathItem = pathsMap.get(path);

  if (!pathItem) {
    const errorMessage = `Path "${path}" not found in the specification.`;
    // Use standard Error
    throw new Error(errorMessage);
  }
  // We assume the spec structure is valid if the key exists
  return pathItem as OpenAPIV3.PathItemObject;
}

/**
 * Validates requested HTTP methods against a PathItemObject using a Map.
 * Returns the list of valid requested methods.
 * Throws an McpError if none of the requested methods are valid for the path item.
 *
 * @param pathItem The PathItemObject to check against.
 * @param requestedMethods An array of lowercase HTTP methods requested by the user.
 * @param pathForError The path string, used for creating informative error messages.
 * @returns An array of the requested methods that are valid for this path item.
 * @throws {McpError} If none of the requested methods are valid.
 */
export function getValidatedOperations(
  pathItem: OpenAPIV3.PathItemObject,
  requestedMethods: string[],
  pathForError: string
): string[] {
  const operationsMap = new Map<string, OpenAPIV3.OperationObject>();
  Object.entries(pathItem).forEach(([method, operation]) => {
    // Check if the key is a standard HTTP method before adding
    if (
      ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(
        method.toLowerCase()
      )
    ) {
      operationsMap.set(method.toLowerCase(), operation as OpenAPIV3.OperationObject);
    }
  });

  // Validate using lowercase versions, but preserve original case for return
  const requestedMethodsLower = requestedMethods.map(m => m.toLowerCase());
  const validLowerMethods = requestedMethodsLower.filter(m => operationsMap.has(m));

  if (validLowerMethods.length === 0) {
    const availableMethods = Array.from(operationsMap.keys()).join(', ');
    // Show original case in error message for clarity
    const errorMessage = `None of the requested methods (${requestedMethods.join(', ')}) are valid for path "${pathForError}". Available methods: ${availableMethods}`;
    // Use standard Error
    throw new Error(errorMessage);
  }

  // Return the methods from the *original* requestedMethods array
  // that correspond to the valid lowercase methods found.
  return requestedMethods.filter(m => validLowerMethods.includes(m.toLowerCase()));
}

/**
 * Safely retrieves the component map for a specific type (e.g., schemas, responses)
 * from the specification using a Map.
 * Throws an McpError if spec.components or the specific type map is not found.
 *
 * @param spec The OpenAPIV3 Document.
 * @param type The ComponentType string (e.g., 'schemas', 'responses').
 * @returns The validated component map object (e.g., spec.components.schemas).
 * @throws {McpError} If spec.components or the type map is not found.
 */
export function getValidatedComponentMap(
  spec: OpenAPIV3.Document,
  type: string // Keep as string for validation flexibility
): NonNullable<OpenAPIV3.ComponentsObject[keyof OpenAPIV3.ComponentsObject]> {
  if (!spec.components) {
    // Use standard Error
    throw new Error('Specification does not contain a components section.');
  }
  // Validate the requested type against the actual keys in spec.components
  const componentsMap = new Map(Object.entries(spec.components));
  // Add type assertion for clarity, although the check below handles undefined
  const componentMapObj = componentsMap.get(
    type
  ) as OpenAPIV3.ComponentsObject[keyof OpenAPIV3.ComponentsObject];

  if (!componentMapObj) {
    const availableTypes = Array.from(componentsMap.keys()).join(', ');
    const errorMessage = `Component type "${type}" not found in the specification. Available types: ${availableTypes}`;
    // Use standard Error
    throw new Error(errorMessage);
  }
  // We assume the spec structure is valid if the key exists
  return componentMapObj as NonNullable<
    OpenAPIV3.ComponentsObject[keyof OpenAPIV3.ComponentsObject]
  >;
}

/**
 * Validates requested component names against a specific component map (e.g., schemas).
 * Returns an array of objects containing the valid name and its corresponding detail object.
 * Throws an McpError if none of the requested names are valid for the component map.
 *
 * @param componentMap The specific component map object (e.g., spec.components.schemas).
 * @param requestedNames An array of component names requested by the user.
 * @param componentTypeForError The component type string, used for creating informative error messages.
 * @param detailsMap A Map created from the specific component map object (e.g., new Map(Object.entries(spec.components.schemas))).
 * @param requestedNames An array of component names requested by the user.
 * @param componentTypeForError The component type string, used for creating informative error messages.
 * @returns An array of { name: string, detail: V } for valid requested names, where V is the value type of the Map.
 * @throws {McpError} If none of the requested names are valid.
 */
// Modify to accept a Map directly
export function getValidatedComponentDetails<V extends object>(
  detailsMap: Map<string, V>, // Accept Map<string, V>
  requestedNames: string[],
  componentTypeForError: string
): { name: string; detail: V }[] {
  // No longer need to create the map inside the function
  const validDetails = requestedNames
    .map(name => {
      const detail = detailsMap.get(name); // detail will be V | undefined
      return detail ? { name, detail } : null;
    })
    // Type predicate ensures we filter out nulls and have the correct type
    .filter((item): item is { name: string; detail: V } => item !== null);

  if (validDetails.length === 0) {
    // Sort available names for deterministic error messages
    const availableNames = Array.from(detailsMap.keys()).sort().join(', ');
    const errorMessage = `None of the requested names (${requestedNames.join(', ')}) are valid for component type "${componentTypeForError}". Available names: ${availableNames}`;
    // Use standard Error
    throw new Error(errorMessage);
  }

  return validDetails;
}
