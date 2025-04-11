import { OpenAPIV3 } from 'openapi-types';
import { RenderableSpecObject, RenderContext, RenderResultItem } from './types.js'; // Add .js

/**
 * Wraps an OpenAPIV3.PathsObject to make it renderable.
 * Handles rendering the list of all paths and methods.
 */
export class RenderablePaths implements RenderableSpecObject {
  constructor(private paths: OpenAPIV3.PathsObject | undefined) {}

  /**
   * Renders a token-efficient list of all paths and their methods.
   * Corresponds to the `openapi://paths` URI.
   */
  renderList(context: RenderContext): RenderResultItem[] {
    if (!this.paths || Object.keys(this.paths).length === 0) {
      return [
        {
          uriSuffix: 'paths',
          data: 'No paths found in the specification.',
          renderAsList: true,
        },
      ];
    }

    // Generate hint first and prepend "Hint: "
    const hintText = `Use '${context.baseUri}paths/{encoded_path}' to list methods for a specific path, or '${context.baseUri}paths/{encoded_path}/{method}' to view details for a specific operation.`;
    let outputLines: string[] = [`Hint: ${hintText}`, '']; // Start with hint and a blank line

    const pathEntries = Object.entries(this.paths).sort(([pathA], [pathB]) =>
      pathA.localeCompare(pathB)
    );

    for (const [path, pathItem] of pathEntries) {
      if (!pathItem) continue;

      // Create a list of valid, sorted, uppercase methods for the current path
      const methods: string[] = [];
      for (const key in pathItem) {
        const lowerKey = key.toLowerCase();
        if (Object.values(OpenAPIV3.HttpMethods).includes(lowerKey as OpenAPIV3.HttpMethods)) {
          // Check if it's a valid operation object before adding the method
          const operation = pathItem[key as keyof OpenAPIV3.PathItemObject];
          if (typeof operation === 'object' && operation !== null && 'responses' in operation) {
            methods.push(lowerKey.toUpperCase());
          }
        }
      }
      methods.sort(); // Sort methods alphabetically

      // Format the line: METHODS /path
      const methodsString = methods.length > 0 ? methods.join(' ') : '(No methods)';
      outputLines.push(`${methodsString} ${path}`);
    }

    return [
      {
        uriSuffix: 'paths',
        data: outputLines.join('\n'), // Join lines into a single string
        renderAsList: true, // This result is always plain text
      },
    ];
  }

  /**
   * Renders the detail view. For the Paths object level, this isn't
   * typically used directly. Details are requested per path or operation.
   */
  renderDetail(context: RenderContext): RenderResultItem[] {
    // Delegate to renderList as the primary view for the collection of paths
    return this.renderList(context);
  }

  /**
   * Gets the PathItemObject for a specific path.
   * @param path - The decoded path string.
   * @returns The PathItemObject or undefined if not found.
   */
  getPathItem(path: string): OpenAPIV3.PathItemObject | undefined {
    // Use Map for safe access
    if (!this.paths) {
      return undefined;
    }
    const pathsMap = new Map(Object.entries(this.paths));
    return pathsMap.get(path); // Map.get returns ValueType | undefined
  }
}
