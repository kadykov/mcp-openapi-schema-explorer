import { IFormatter } from '../services/formatters';
// We don't need ResourceContents/ResourceContent here anymore

/**
 * Intermediate result structure returned by render methods.
 * Contains the core data needed to build the final ResourceContent.
 */
export interface RenderResultItem {
  /** The raw data object to be formatted. */
  data: unknown;
  /** The suffix to append to the base URI (e.g., 'info', 'paths/users', 'components/schemas/User'). */
  uriSuffix: string;
  /** Optional flag indicating an error for this specific item. */
  isError?: boolean;
  /** Optional error message if isError is true. */
  errorText?: string;
  /** Optional flag to indicate this should be rendered as a list (text/plain). */
  renderAsList?: boolean;
}

/**
 * Context required for rendering OpenAPI specification objects.
 */
export interface RenderContext {
  /** Formatter instance for handling output (JSON/YAML). */
  formatter: IFormatter;
  /** Base URI for generating resource links (e.g., "openapi://"). */
  baseUri: string;
}

/**
 * Represents an OpenAPI specification object that can be rendered
 * in different formats (list or detail).
 */
export interface RenderableSpecObject {
  /**
   * Generates data for a token-efficient list representation.
   * @param context - The rendering context.
   * @returns An array of RenderResultItem.
   */
  renderList(context: RenderContext): RenderResultItem[];

  /**
   * Generates data for a detailed representation.
   * @param context - The rendering context.
   * @returns An array of RenderResultItem.
   */
  renderDetail(context: RenderContext): RenderResultItem[];
}

/**
 * Type guard to check if an object implements RenderableSpecObject.
 * @param obj - The object to check.
 * @returns True if the object implements RenderableSpecObject, false otherwise.
 */
export function isRenderableSpecObject(obj: unknown): obj is RenderableSpecObject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as RenderableSpecObject).renderList === 'function' &&
    typeof (obj as RenderableSpecObject).renderDetail === 'function'
  );
}
