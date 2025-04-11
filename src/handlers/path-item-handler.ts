import {
  ReadResourceTemplateCallback,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { SpecLoaderService } from '../types.js';
import { IFormatter } from '../services/formatters.js';
import { RenderableDocument } from '../rendering/document.js';
import { RenderablePathItem } from '../rendering/path-item.js';
import { RenderContext, RenderResultItem } from '../rendering/types.js';
import { createErrorResult } from '../rendering/utils.js';
// Import shared handler utils
import { formatResults, isOpenAPIV3, FormattedResultItem } from './handler-utils.js'; // Already has .js

const BASE_URI = 'openapi://';

// Removed duplicated FormattedResultItem type - now imported from handler-utils
// Removed duplicated formatResults function - now imported from handler-utils
// Removed duplicated isOpenAPIV3 function - now imported from handler-utils

/**
 * Handles requests for listing methods for a specific path.
 * Corresponds to the `openapi://paths/{path}` template.
 */
export class PathItemHandler {
  constructor(
    private specLoader: SpecLoaderService,
    private formatter: IFormatter // Although unused in list view, needed for context
  ) {}

  getTemplate(): ResourceTemplate {
    // TODO: Add completion logic if needed
    return new ResourceTemplate(`${BASE_URI}paths/{path}`, {
      list: undefined,
      complete: undefined,
    });
  }

  handleRequest: ReadResourceTemplateCallback = async (
    uri: URL,
    variables: Variables
  ): Promise<{ contents: FormattedResultItem[] }> => {
    const encodedPath = variables.path as string;
    const pathUriSuffix = `paths/${encodedPath}`;
    const context: RenderContext = { formatter: this.formatter, baseUri: BASE_URI };
    let resultItems: RenderResultItem[];

    try {
      const spec = await this.specLoader.getTransformedSpec({
        resourceType: 'schema', // Use 'schema' for now
        format: 'openapi',
      });

      // Use imported type guard
      if (!isOpenAPIV3(spec)) {
        throw new Error('Only OpenAPI v3 specifications are supported');
      }

      const renderableDoc = new RenderableDocument(spec);
      // Use robust path normalization from old implementation
      const lookupPath = '/' + decodeURIComponent(encodedPath || '').replace(/^\/+/, '');
      const pathItemObj = renderableDoc.getPathsObject()?.[lookupPath];

      // Instantiate RenderablePathItem and call its renderList
      const renderablePathItem = new RenderablePathItem(pathItemObj, pathUriSuffix);
      resultItems = renderablePathItem.renderList(context);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error handling request ${uri.href}: ${message}`);
      resultItems = createErrorResult(pathUriSuffix, message);
    }

    // Use imported formatResults
    const contents = formatResults(context, resultItems);
    return { contents };
  };
}
