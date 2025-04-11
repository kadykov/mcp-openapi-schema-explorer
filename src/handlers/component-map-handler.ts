import {
  ReadResourceTemplateCallback,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { SpecLoaderService } from '../types.js';
import { IFormatter } from '../services/formatters.js';
import {
  RenderableComponentMap,
  ComponentType,
  VALID_COMPONENT_TYPES,
} from '../rendering/components.js';
import { RenderContext, RenderResultItem } from '../rendering/types.js';
import { createErrorResult } from '../rendering/utils.js';
// Import shared handler utils
import {
  formatResults,
  isOpenAPIV3,
  FormattedResultItem,
  getValidatedComponentMap, // Import the helper
} from './handler-utils.js'; // Already has .js

const BASE_URI = 'openapi://';

// Removed duplicated FormattedResultItem type - now imported from handler-utils
// Removed duplicated formatResults function - now imported from handler-utils
// Removed duplicated isOpenAPIV3 function - now imported from handler-utils

/**
 * Handles requests for listing component names of a specific type.
 * Corresponds to the `openapi://components/{type}` template.
 */
export class ComponentMapHandler {
  constructor(
    private specLoader: SpecLoaderService,
    private formatter: IFormatter // Needed for context
  ) {}

  getTemplate(): ResourceTemplate {
    // TODO: Add completion logic if needed
    return new ResourceTemplate(`${BASE_URI}components/{type}`, {
      list: undefined,
      complete: undefined,
    });
  }

  handleRequest: ReadResourceTemplateCallback = async (
    uri: URL,
    variables: Variables
  ): Promise<{ contents: FormattedResultItem[] }> => {
    const type = variables.type as string;
    const mapUriSuffix = `components/${type}`;
    const context: RenderContext = { formatter: this.formatter, baseUri: BASE_URI };
    let resultItems: RenderResultItem[];

    try {
      if (!VALID_COMPONENT_TYPES.includes(type as ComponentType)) {
        throw new Error(`Invalid component type: ${type}`);
      }
      const componentType = type as ComponentType;

      const spec = await this.specLoader.getTransformedSpec({
        resourceType: 'schema', // Use 'schema' for now
        format: 'openapi',
      });

      // Use imported type guard
      if (!isOpenAPIV3(spec)) {
        throw new Error('Only OpenAPI v3 specifications are supported');
      }

      // --- Use helper to get validated component map ---
      const componentMapObj = getValidatedComponentMap(spec, componentType);

      // Instantiate RenderableComponentMap with the validated map
      const renderableMap = new RenderableComponentMap(
        componentMapObj, // componentMapObj retrieved safely via helper
        componentType,
        mapUriSuffix
      );
      resultItems = renderableMap.renderList(context);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error handling request ${uri.href}: ${message}`);
      resultItems = createErrorResult(mapUriSuffix, message);
    }

    // Use imported formatResults
    const contents = formatResults(context, resultItems);
    return { contents };
  };
}
