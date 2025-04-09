# Active Context

## Current Focus
Code refactoring and improved testing coverage

## Recent Progress
1. Successfully refactored the codebase:
   - Separated concerns into multiple files (handlers, services)
   - Improved type safety with OpenAPI types
   - Simplified resource output to JSON format
   - Unit tests for all components

2. Code Organization:
   - `src/handlers/endpoint.ts`: Endpoint resource handler
   - `src/services/spec-loader.ts`: OpenAPI spec loading using swagger-parser
   - `src/config.ts`: Configuration management
   - `src/types.ts`: Shared type definitions

3. Code Improvements:
   - Using OpenAPI v3 types from swagger-parser
   - Better error handling
   - Proper type checking
   - Cleaner resource response structure

4. Test Coverage:
   - Unit tests for all components
   - End-to-end tests updated for JSON format
   - Test helpers and fixtures
   - Config validation tests

## Implementation Status
1. Resource Handler Structure:
   ```typescript
   class EndpointHandler {
     getTemplate(): ResourceTemplate
     handleRequest(uri: URL, params: { method: string; path: string }): Promise<ResourceResponse>
   }
   ```

2. Response Format:
   - JSON output for better parsing
   - Complete operation details
   - Proper type definitions
   - Consistent structure

3. Code Features:
   - OpenAPI spec validation
   - Type-safe implementation
   - Modular design
   - Easy extensibility

## Next Actions
1. Add path listing resource
2. Implement schema dereferencing
3. Add operation listing by path
4. Add schema examples in documentation
5. Consider path parameter validation

## Immediate Tasks
- [ ] Implement path listing (`openapi://paths/list`)
- [ ] Add swagger-parser schema dereferencing
- [ ] Add operation list by path
- [ ] Add parameter validation
