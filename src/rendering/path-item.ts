import { OpenAPIV3 } from 'openapi-types';
import { RenderableSpecObject, RenderContext, RenderResultItem } from './types.js'; // Add .js
import { getOperationSummary, createErrorResult, generateListHint } from './utils.js'; // Add .js

/**
 * Wraps an OpenAPIV3.PathItemObject to make it renderable.
 * Handles rendering the list of methods for a specific path and
 * the details of specific operations (methods).
 */
export class RenderablePathItem implements RenderableSpecObject {
  constructor(
    private pathItem: OpenAPIV3.PathItemObject | undefined,
    private pathUriSuffix: string // e.g., 'paths/users'
  ) {}

  /**
   * Renders a token-efficient list of methods available for this path.
   * Corresponds to the `openapi://paths/{path}` URI.
   */
  renderList(context: RenderContext): RenderResultItem[] {
    if (!this.pathItem) {
      return createErrorResult(this.pathUriSuffix, 'Path item not found.');
    }

    // Correctly check if the lowercase key is one of the enum values
    const methods = Object.keys(this.pathItem).filter(key =>
      Object.values(OpenAPIV3.HttpMethods).includes(key.toLowerCase() as OpenAPIV3.HttpMethods)
    ) as OpenAPIV3.HttpMethods[];

    // Check if methods array is empty *after* filtering
    if (methods.length === 0) {
      // Return a specific non-error message indicating no methods were found
      return [
        {
          uriSuffix: this.pathUriSuffix,
          data: `No standard HTTP methods found for path: ${decodeURIComponent(
            this.pathUriSuffix.substring('paths/'.length) // Get original path for display
          )}`,
          renderAsList: true,
          // isError is implicitly false here
        },
      ];
    }

    // Generate hint first
    const hint = generateListHint(
      context,
      this.pathUriSuffix,
      'operation',
      `${this.pathUriSuffix}/{method}` // Detail pattern
    );
    // Hint includes leading newline, so start output with it directly
    let outputLines: string[] = [hint.trim(), '']; // Trim leading newline from hint for first line

    methods.sort().forEach(method => {
      const operation = this.getOperation(method);
      // Use summary or operationId (via getOperationSummary)
      const summaryText = getOperationSummary(operation);
      // Format as METHOD: Summary or just METHOD if no summary/opId
      outputLines.push(`${method.toUpperCase()}${summaryText ? `: ${summaryText}` : ''}`);
    });

    return [
      {
        uriSuffix: this.pathUriSuffix,
        data: outputLines.join('\n'), // Join lines into a single string
        renderAsList: true,
      },
    ];
  }

  /**
   * Renders the detail view for one or more specific operations (methods)
   * Renders the detail view. For a PathItem, this usually means listing
   * the methods, similar to renderList. The handler should call
   * `renderOperationDetail` for specific method details.
   */
  renderDetail(context: RenderContext): RenderResultItem[] {
    // Delegate to renderList as the primary view for a path item itself.
    return this.renderList(context);
  }

  /**
   * Renders the detail view for one or more specific operations (methods)
   * within this path item.
   * Corresponds to the `openapi://paths/{path}/{method*}` URI.
   * This is called by the handler after identifying the method(s).
   *
   * @param context - The rendering context.
   * @param methods - Array of method names (e.g., ['get', 'post']).
   * @returns An array of RenderResultItem representing the operation details.
   */
  renderOperationDetail(
    _context: RenderContext, // Context might be needed later
    methods: string[]
  ): RenderResultItem[] {
    if (!this.pathItem) {
      // Create error results for all requested methods if path item is missing
      return methods.map(method => ({
        uriSuffix: `${this.pathUriSuffix}/${method}`,
        data: null,
        isError: true,
        errorText: 'Path item not found.',
        renderAsList: true,
      }));
    }

    const results: RenderResultItem[] = [];

    for (const method of methods) {
      const operation = this.getOperation(method);
      const operationUriSuffix = `${this.pathUriSuffix}/${method}`;

      if (!operation) {
        results.push({
          uriSuffix: operationUriSuffix,
          data: null,
          isError: true,
          errorText: `Method "${method.toUpperCase()}" not found for path.`,
          renderAsList: true,
        });
      } else {
        // Return the raw operation object; handler will format it
        results.push({
          uriSuffix: operationUriSuffix,
          data: operation,
          // isError: false (default)
          // renderAsList: false (default)
        });
      }
    }
    return results;
  }

  /**
   * Gets the OperationObject for a specific HTTP method within this path item.
   * Performs case-insensitive lookup.
   * @param method - The HTTP method string (e.g., 'get', 'POST').
   * @returns The OperationObject or undefined if not found.
   */
  getOperation(method: string): OpenAPIV3.OperationObject | undefined {
    if (!this.pathItem) {
      return undefined;
    }
    const lowerMethod = method.toLowerCase();

    // Check if the key is a standard HTTP method defined in the enum
    if (Object.values(OpenAPIV3.HttpMethods).includes(lowerMethod as OpenAPIV3.HttpMethods)) {
      const operation = this.pathItem[lowerMethod as keyof OpenAPIV3.PathItemObject];
      // Basic check to ensure it looks like an operation object
      if (typeof operation === 'object' && operation !== null && 'responses' in operation) {
        // The check above narrows the type sufficiently, assertion is redundant
        return operation;
      }
    }
    return undefined; // Not a valid method or not an operation object
  }
}
