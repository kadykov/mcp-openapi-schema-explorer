import {
  ReadResourceTemplateCallback,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
// ResourceContents is the base type for a single item, not the array type needed here.
// We'll define the array structure inline based on TextResourceContentsSchema.

import { SpecLoaderService } from '../types.js';
import { IFormatter } from '../services/formatters.js';
import { RenderableDocument } from '../rendering/document.js';
import { RenderablePaths } from '../rendering/paths.js';
import { RenderableComponents } from '../rendering/components.js';
import { RenderContext, RenderResultItem } from '../rendering/types.js';
import { createErrorResult } from '../rendering/utils.js';
// Import shared handler utils
import { formatResults, isOpenAPIV3, FormattedResultItem } from './handler-utils.js'; // Already has .js

const BASE_URI = 'openapi://';

// Removed duplicated FormattedResultItem type - now imported from handler-utils
// Removed duplicated formatResults function - now imported from handler-utils

/**
 * Handles requests for top-level OpenAPI fields (info, servers, paths list, components list).
 * Corresponds to the `openapi://{field}` template.
 */
export class TopLevelFieldHandler {
  constructor(
    private specLoader: SpecLoaderService,
    private formatter: IFormatter
  ) {}

  getTemplate(): ResourceTemplate {
    // TODO: Add completion logic if needed
    return new ResourceTemplate(`${BASE_URI}{field}`, {
      list: undefined,
      complete: undefined,
    });
  }

  handleRequest: ReadResourceTemplateCallback = async (
    uri: URL,
    variables: Variables
    // matchedTemplate is not needed if we only handle one template
  ): Promise<{ contents: FormattedResultItem[] }> => {
    // Return type uses the defined array structure
    const field = variables.field as string;
    const context: RenderContext = { formatter: this.formatter, baseUri: BASE_URI };
    let resultItems: RenderResultItem[];

    try {
      const spec = await this.specLoader.getTransformedSpec({
        // Use 'schema' as placeholder resourceType for transformation context
        resourceType: 'schema',
        format: 'openapi',
      });

      // Use imported type guard
      if (!isOpenAPIV3(spec)) {
        throw new Error('Only OpenAPI v3 specifications are supported');
      }

      const renderableDoc = new RenderableDocument(spec);

      // Route based on the field name
      if (field === 'paths') {
        const pathsObj = renderableDoc.getPathsObject();
        resultItems = new RenderablePaths(pathsObj).renderList(context);
      } else if (field === 'components') {
        const componentsObj = renderableDoc.getComponentsObject();
        resultItems = new RenderableComponents(componentsObj).renderList(context);
      } else {
        // Handle other top-level fields (info, servers, tags, etc.)
        const fieldObject = renderableDoc.getTopLevelField(field);
        resultItems = renderableDoc.renderTopLevelFieldDetail(context, fieldObject, field);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error handling request ${uri.href}: ${message}`);
      resultItems = createErrorResult(field, message); // Use field as uriSuffix for error
    }

    // Format results into the final structure
    const contents: FormattedResultItem[] = formatResults(context, resultItems);
    // Return the object with the correctly typed contents array
    // Use imported formatResults
    return { contents };
  };

  // Removed duplicated isOpenAPIV3 type guard - now imported from handler-utils
} // Ensure class closing brace is present
