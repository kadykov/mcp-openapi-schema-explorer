import { OpenAPIV3 } from 'openapi-types';
import { RenderableSpecObject, RenderContext, RenderResultItem } from './types.js'; // Add .js
// No longer need ResourceContents here

// Placeholder for other renderable objects we'll create
// import { RenderablePaths } from './paths.js'; // Add .js
// import { RenderableComponents } from './components.js'; // Add .js

/**
 * Wraps an OpenAPIV3.Document to make it renderable.
 * Handles rendering for top-level fields like 'info', 'servers', etc.
 * Delegates list rendering for 'paths' and 'components' to respective objects.
 */
export class RenderableDocument implements RenderableSpecObject {
  // TODO: Add RenderablePaths and RenderableComponents instances
  // private renderablePaths: RenderablePaths;
  // private renderableComponents: RenderableComponents;

  constructor(private document: OpenAPIV3.Document) {
    // Initialize renderable wrappers for paths and components here
    // this.renderablePaths = new RenderablePaths(document.paths);
    // this.renderableComponents = new RenderableComponents(document.components);
  }

  /**
   * Renders a list view. For the document level, this is intended
   * to be called only when the requested field is 'paths' or 'components'.
   * The actual routing/delegation will happen in the handler based on the field.
   */
  renderList(_context: RenderContext): RenderResultItem[] {
    // Prefix context with _
    // This method should ideally not be called directly on the document
    // without specifying 'paths' or 'components' as the field.
    // The handler for openapi://{field} will delegate to the appropriate
    // sub-object's renderList.
    // Returning an error result item.
    return [
      {
        uriSuffix: 'error',
        data: null, // No specific data for this error
        isError: true,
        errorText:
          'Error: List rendering is only supported for specific fields like "paths" or "components" at the top level.',
        renderAsList: true, // Errors often shown as plain text
      },
    ];
  }

  /**
   * Renders the detail view. For the document level, this should not be called
   * directly without specifying a field. The handler should call
   * `renderTopLevelFieldDetail` instead.
   */
  renderDetail(_context: RenderContext): RenderResultItem[] {
    // Prefix context with _
    // This method implementation fulfills the interface requirement,
    // but direct detail rendering of the whole document isn't meaningful here.
    return [
      {
        uriSuffix: 'error',
        data: null,
        isError: true,
        errorText:
          'Error: Detail rendering requires specifying a top-level field (e.g., "info", "servers").',
        renderAsList: true, // Errors often shown as plain text
      },
    ];
  }

  /**
   * Renders the detail view for a *specific* top-level field (e.g., 'info', 'servers').
   * This is called by the handler after identifying the field.
   *
   * @param context - The rendering context.
   * @param fieldObject - The actual top-level field object to render (e.g., document.info).
   * @param fieldName - The name of the field being rendered (e.g., 'info').
   * @returns An array of RenderResultItem representing the detail view.
   */
  renderTopLevelFieldDetail(
    context: RenderContext,
    fieldObject: unknown,
    fieldName: string
  ): RenderResultItem[] {
    // Ensure fieldObject is provided (handler should validate fieldName exists)
    if (fieldObject === undefined || fieldObject === null) {
      return [
        {
          uriSuffix: fieldName,
          data: null,
          isError: true,
          errorText: `Error: Field "${fieldName}" not found in the OpenAPI document.`,
          renderAsList: true,
        },
      ];
    }

    // Avoid rendering structural fields that have dedicated list views
    if (fieldName === 'paths' || fieldName === 'components') {
      return [
        {
          uriSuffix: fieldName,
          data: null,
          isError: true,
          errorText: `Error: Field "${fieldName}" should be accessed via its list view (${context.baseUri}${fieldName}). Use the list view first.`,
          renderAsList: true,
        },
      ];
    }

    try {
      // For successful detail rendering, return the data object itself.
      // The handler will format it using the context.formatter.
      return [
        {
          uriSuffix: fieldName,
          data: fieldObject, // Pass the raw data
          // isError defaults to false
          // renderAsList defaults to false (meaning use detail formatter)
        },
      ];
    } catch (error: unknown) {
      // Handle potential errors during data access or initial checks
      // Formatting errors will be caught by the handler later
      return [
        {
          uriSuffix: fieldName,
          data: null,
          isError: true,
          errorText: `Error preparing field "${fieldName}" for rendering: ${
            error instanceof Error ? error.message : String(error)
          }`,
          renderAsList: true,
        },
      ];
    }
  } // End of renderTopLevelFieldDetail

  // --- Helper methods to access specific parts ---

  getPathsObject(): OpenAPIV3.PathsObject | undefined {
    return this.document.paths;
  }

  getComponentsObject(): OpenAPIV3.ComponentsObject | undefined {
    return this.document.components;
  }

  getTopLevelField(fieldName: string): unknown {
    // Define allowed top-level OpenAPI document properties
    const allowedFields: Array<keyof OpenAPIV3.Document> = [
      'openapi',
      'info',
      'servers',
      'paths',
      'components',
      'security',
      'tags',
      'externalDocs',
    ];

    // Only allow access to documented OpenAPI properties
    if (allowedFields.includes(fieldName as keyof OpenAPIV3.Document)) {
      return this.document[fieldName as keyof OpenAPIV3.Document];
    }
    return undefined;
  }
} // End of RenderableDocument class
