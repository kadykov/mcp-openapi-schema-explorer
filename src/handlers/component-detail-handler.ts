import {
  ReadResourceTemplateCallback,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { SpecLoaderService } from '../types.js';
import { IFormatter } from '../services/formatters.js';
import { RenderableDocument } from '../rendering/document.js';
import {
  RenderableComponentMap,
  ComponentType,
  VALID_COMPONENT_TYPES,
} from '../rendering/components.js';
import { RenderContext, RenderResultItem } from '../rendering/types.js';
import { createErrorResult } from '../rendering/utils.js';
// Import shared handler utils
import { formatResults, isOpenAPIV3, FormattedResultItem } from './handler-utils.js'; // Already has .js

const BASE_URI = 'openapi://';

// Removed duplicated FormattedResultItem type - now imported from handler-utils
// Removed duplicated formatResults function - now imported from handler-utils
// Removed duplicated isOpenAPIV3 function - now imported from handler-utils

/**
 * Handles requests for specific component details.
 * Corresponds to the `openapi://components/{type}/{name*}` template.
 */
export class ComponentDetailHandler {
  constructor(
    private specLoader: SpecLoaderService,
    private formatter: IFormatter
  ) {}

  getTemplate(): ResourceTemplate {
    // TODO: Add completion logic if needed
    return new ResourceTemplate(`${BASE_URI}components/{type}/{name*}`, {
      list: undefined,
      complete: undefined,
    });
  }

  handleRequest: ReadResourceTemplateCallback = async (
    uri: URL,
    variables: Variables
  ): Promise<{ contents: FormattedResultItem[] }> => {
    const type = variables.type as string;
    // Correct variable access key: 'name', not 'name*'
    const nameVar = variables['name']; // Can be string or string[]
    const mapUriSuffix = `components/${type}`;
    const context: RenderContext = { formatter: this.formatter, baseUri: BASE_URI };
    let resultItems: RenderResultItem[];

    try {
      if (!VALID_COMPONENT_TYPES.includes(type as ComponentType)) {
        throw new Error(`Invalid component type: ${type}`);
      }
      const componentType = type as ComponentType;

      // Normalize names: Handle string for single value, array for multiple.
      let names: string[] = [];
      if (Array.isArray(nameVar)) {
        names = nameVar.map(n => String(n).trim()); // Ensure elements are strings
      } else if (typeof nameVar === 'string') {
        names = [nameVar.trim()]; // Treat as single item array
      }
      names = names.filter(n => n.length > 0); // Remove empty strings

      if (names.length === 0) {
        throw new Error('No valid component name specified.');
      }

      const spec = await this.specLoader.getTransformedSpec({
        resourceType: 'schema', // Use 'schema' for now
        format: 'openapi',
      });

      // Use imported type guard
      if (!isOpenAPIV3(spec)) {
        throw new Error('Only OpenAPI v3 specifications are supported');
      }

      const renderableDoc = new RenderableDocument(spec);
      const componentMapObj = renderableDoc.getComponentsObject()?.[componentType];

      // Instantiate RenderableComponentMap and call its renderComponentDetail
      const renderableMap = new RenderableComponentMap(
        componentMapObj,
        componentType,
        mapUriSuffix
      );
      resultItems = renderableMap.renderComponentDetail(context, names);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error handling request ${uri.href}: ${message}`);
      // Create a single error item representing the overall request failure
      resultItems = createErrorResult(
        uri.href.substring(BASE_URI.length), // Use request URI suffix
        message
      );
    }

    // Use imported formatResults
    const contents = formatResults(context, resultItems);
    return { contents };
  };
}
