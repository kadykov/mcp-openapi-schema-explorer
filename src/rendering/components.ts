import { OpenAPIV3 } from 'openapi-types';
import { RenderableSpecObject, RenderContext, RenderResultItem } from './types.js'; // Add .js
import { createErrorResult, generateListHint } from './utils.js'; // Add .js

// Define valid component types based on OpenAPIV3.ComponentsObject keys
export type ComponentType = keyof OpenAPIV3.ComponentsObject;
export const VALID_COMPONENT_TYPES: ComponentType[] = [
  'schemas',
  'responses',
  'parameters',
  'examples',
  'requestBodies',
  'headers',
  'securitySchemes',
  'links',
  'callbacks',
  // 'pathItems' is technically allowed but we handle paths separately
];

// Simple descriptions for component types
const componentTypeDescriptions: Record<ComponentType, string> = {
  schemas: 'Reusable data structures (models)',
  responses: 'Reusable API responses',
  parameters: 'Reusable request parameters (query, path, header, cookie)',
  examples: 'Reusable examples of media type payloads',
  requestBodies: 'Reusable request body definitions',
  headers: 'Reusable header definitions for responses',
  securitySchemes: 'Reusable security scheme definitions (e.g., API keys, OAuth2)',
  links: 'Reusable descriptions of links between responses and operations',
  callbacks: 'Reusable descriptions of callback operations',
  // pathItems: 'Reusable path item definitions (rarely used directly here)' // Excluded as per comment above
};
// Use a Map for safer lookups against prototype pollution
const componentDescriptionsMap = new Map(Object.entries(componentTypeDescriptions));

/**
 * Wraps an OpenAPIV3.ComponentsObject to make it renderable.
 * Handles listing the available component types.
 */
export class RenderableComponents implements RenderableSpecObject {
  constructor(private components: OpenAPIV3.ComponentsObject | undefined) {}

  /**
   * Renders a list of available component types found in the spec.
   * Corresponds to the `openapi://components` URI.
   */
  renderList(context: RenderContext): RenderResultItem[] {
    if (!this.components || Object.keys(this.components).length === 0) {
      return createErrorResult('components', 'No components found in the specification.');
    }

    const availableTypes = Object.keys(this.components).filter((key): key is ComponentType =>
      VALID_COMPONENT_TYPES.includes(key as ComponentType)
    );

    if (availableTypes.length === 0) {
      return createErrorResult('components', 'No valid component types found.');
    }

    let listText = 'Available Component Types:\n\n';
    availableTypes.sort().forEach(type => {
      const description = componentDescriptionsMap.get(type) ?? 'Unknown component type'; // Removed unnecessary 'as ComponentType'
      listText += `- ${type}: ${description}\n`;
    });

    // Use the new hint generator structure, providing the first type as an example
    const firstTypeExample = availableTypes.length > 0 ? availableTypes[0] : undefined;
    listText += generateListHint(context, {
      itemType: 'componentType',
      firstItemExample: firstTypeExample,
    });

    return [
      {
        uriSuffix: 'components',
        data: listText,
        renderAsList: true,
      },
    ];
  }

  /**
   * Detail view for the main 'components' object isn't meaningful.
   */
  renderDetail(context: RenderContext): RenderResultItem[] {
    return this.renderList(context);
  }

  /**
   * Gets the map object for a specific component type.
   * @param type - The component type (e.g., 'schemas').
   * @returns The map (e.g., ComponentsObject['schemas']) or undefined.
   */
  getComponentMap(type: ComponentType):
    | Record<
        string,
        | OpenAPIV3.SchemaObject
        | OpenAPIV3.ResponseObject
        | OpenAPIV3.ParameterObject
        | OpenAPIV3.ExampleObject
        | OpenAPIV3.RequestBodyObject
        | OpenAPIV3.HeaderObject
        | OpenAPIV3.SecuritySchemeObject
        | OpenAPIV3.LinkObject
        | OpenAPIV3.CallbackObject
        | OpenAPIV3.ReferenceObject // Include ReferenceObject
      >
    | undefined {
    // Use Map for safe access
    if (!this.components) {
      return undefined;
    }
    const componentsMap = new Map(Object.entries(this.components));
    // Cast needed as Map.get returns the value type or undefined
    return componentsMap.get(type) as ReturnType<RenderableComponents['getComponentMap']>;
  }
}

// =====================================================================

/**
 * Wraps a map of components of a specific type (e.g., all schemas).
 * Handles listing component names and rendering component details.
 */
export class RenderableComponentMap implements RenderableSpecObject {
  constructor(
    private componentMap: ReturnType<RenderableComponents['getComponentMap']>,
    private componentType: ComponentType, // e.g., 'schemas'
    private mapUriSuffix: string // e.g., 'components/schemas'
  ) {}

  /**
   * Renders a list of component names for the specific type.
   * Corresponds to the `openapi://components/{type}` URI.
   */
  renderList(context: RenderContext): RenderResultItem[] {
    if (!this.componentMap || Object.keys(this.componentMap).length === 0) {
      return createErrorResult(
        this.mapUriSuffix,
        `No components of type "${this.componentType}" found.`
      );
    }

    const names = Object.keys(this.componentMap).sort();
    let listText = `Available ${this.componentType}:\n\n`;
    names.forEach(name => {
      listText += `- ${name}\n`;
    });

    // Use the new hint generator structure, providing parent type and first name as example
    const firstNameExample = names.length > 0 ? names[0] : undefined;
    listText += generateListHint(context, {
      itemType: 'componentName',
      parentComponentType: this.componentType,
      firstItemExample: firstNameExample,
    });

    return [
      {
        uriSuffix: this.mapUriSuffix,
        data: listText,
        renderAsList: true,
      },
    ];
  }

  /**
   * Renders the detail view for one or more specific named components
   * Renders the detail view. For a component map, this usually means listing
   * the component names, similar to renderList. The handler should call
   * `renderComponentDetail` for specific component details.
   */
  renderDetail(context: RenderContext): RenderResultItem[] {
    // Delegate to renderList as the primary view for a component map itself.
    return this.renderList(context);
  }

  /**
   * Renders the detail view for one or more specific named components
   * within this map.
   * Corresponds to the `openapi://components/{type}/{name*}` URI.
   * This is called by the handler after identifying the name(s).
   *
   * @param _context - The rendering context (might be needed later).
   * @param names - Array of component names.
   * @returns An array of RenderResultItem representing the component details.
   */
  renderComponentDetail(_context: RenderContext, names: string[]): RenderResultItem[] {
    if (!this.componentMap) {
      // Create error results for all requested names if map is missing
      return names.map(name => ({
        uriSuffix: `${this.mapUriSuffix}/${name}`,
        data: null,
        isError: true,
        errorText: `Component map for type "${this.componentType}" not found.`,
        renderAsList: true,
      }));
    }

    const results: RenderResultItem[] = [];
    for (const name of names) {
      const component = this.getComponent(name);
      const componentUriSuffix = `${this.mapUriSuffix}/${name}`;

      if (!component) {
        results.push({
          uriSuffix: componentUriSuffix,
          data: null,
          isError: true,
          errorText: `Component "${name}" of type "${this.componentType}" not found.`,
          renderAsList: true,
        });
      } else {
        // Return the raw component object; handler will format it
        results.push({
          uriSuffix: componentUriSuffix,
          data: component,
        });
      }
    }
    return results;
  }

  /**
   * Gets a specific component object by name.
   * @param name - The name of the component.
   * @returns The component object (or ReferenceObject) or undefined.
   */
  getComponent(
    name: string
  ):
    | OpenAPIV3.SchemaObject
    | OpenAPIV3.ResponseObject
    | OpenAPIV3.ParameterObject
    | OpenAPIV3.ExampleObject
    | OpenAPIV3.RequestBodyObject
    | OpenAPIV3.HeaderObject
    | OpenAPIV3.SecuritySchemeObject
    | OpenAPIV3.LinkObject
    | OpenAPIV3.CallbackObject
    | OpenAPIV3.ReferenceObject
    | undefined {
    // Use Map for safe access
    if (!this.componentMap) {
      return undefined;
    }
    const detailsMap = new Map(Object.entries(this.componentMap));
    // No cast needed, Map.get returns the correct type (ValueType | undefined)
    return detailsMap.get(name);
  }
}
