import {
  buildComponentDetailUri,
  buildComponentMapUri,
  buildOperationUri,
  buildPathItemUri,
  buildTopLevelFieldUri,
  buildComponentDetailUriSuffix,
  buildComponentMapUriSuffix,
  buildOperationUriSuffix,
  buildPathItemUriSuffix,
  buildTopLevelFieldUriSuffix,
} from '../../../../src/utils/uri-builder';

describe('URI Builder Utilities', () => {
  // --- Full URI Builders ---

  test('buildComponentDetailUri builds correct URI', () => {
    expect(buildComponentDetailUri('schemas', 'MySchema')).toBe(
      'openapi://components/schemas/MySchema'
    );
    expect(buildComponentDetailUri('responses', 'NotFound')).toBe(
      'openapi://components/responses/NotFound'
    );
    // Test with characters that might need encoding if rules change (but currently don't)
    expect(buildComponentDetailUri('parameters', 'user-id')).toBe(
      'openapi://components/parameters/user-id'
    );
  });

  test('buildComponentMapUri builds correct URI', () => {
    expect(buildComponentMapUri('schemas')).toBe('openapi://components/schemas');
    expect(buildComponentMapUri('parameters')).toBe('openapi://components/parameters');
  });

  test('buildOperationUri builds correct URI and encodes path (no leading slash)', () => {
    expect(buildOperationUri('/users', 'get')).toBe('openapi://paths/users/get'); // No leading slash encoded
    expect(buildOperationUri('/users/{userId}', 'post')).toBe(
      'openapi://paths/users%2F%7BuserId%7D/post' // Path encoded, no leading %2F
    );
    expect(buildOperationUri('/pets/{petId}/uploadImage', 'post')).toBe(
      'openapi://paths/pets%2F%7BpetId%7D%2FuploadImage/post' // Path encoded, no leading %2F
    );
    expect(buildOperationUri('users', 'get')).toBe('openapi://paths/users/get'); // Handles no leading slash input
    expect(buildOperationUri('users/{userId}', 'post')).toBe(
      'openapi://paths/users%2F%7BuserId%7D/post' // Handles no leading slash input
    );
    expect(buildOperationUri('/users', 'GET')).toBe('openapi://paths/users/get'); // Method lowercased
  });

  test('buildPathItemUri builds correct URI and encodes path (no leading slash)', () => {
    expect(buildPathItemUri('/users')).toBe('openapi://paths/users'); // No leading slash encoded
    expect(buildPathItemUri('/users/{userId}')).toBe('openapi://paths/users%2F%7BuserId%7D'); // Path encoded, no leading %2F
    expect(buildPathItemUri('/pets/{petId}/uploadImage')).toBe(
      'openapi://paths/pets%2F%7BpetId%7D%2FuploadImage' // Path encoded, no leading %2F
    );
    expect(buildPathItemUri('users')).toBe('openapi://paths/users'); // Handles no leading slash input
    expect(buildPathItemUri('users/{userId}')).toBe('openapi://paths/users%2F%7BuserId%7D'); // Handles no leading slash input
  });

  test('buildTopLevelFieldUri builds correct URI', () => {
    expect(buildTopLevelFieldUri('info')).toBe('openapi://info');
    expect(buildTopLevelFieldUri('paths')).toBe('openapi://paths');
    expect(buildTopLevelFieldUri('components')).toBe('openapi://components');
  });

  // --- URI Suffix Builders ---

  test('buildComponentDetailUriSuffix builds correct suffix', () => {
    expect(buildComponentDetailUriSuffix('schemas', 'MySchema')).toBe(
      'components/schemas/MySchema'
    );
    expect(buildComponentDetailUriSuffix('responses', 'NotFound')).toBe(
      'components/responses/NotFound'
    );
  });

  test('buildComponentMapUriSuffix builds correct suffix', () => {
    expect(buildComponentMapUriSuffix('schemas')).toBe('components/schemas');
    expect(buildComponentMapUriSuffix('parameters')).toBe('components/parameters');
  });

  test('buildOperationUriSuffix builds correct suffix and encodes path (no leading slash)', () => {
    expect(buildOperationUriSuffix('/users', 'get')).toBe('paths/users/get'); // No leading slash encoded
    expect(buildOperationUriSuffix('/users/{userId}', 'post')).toBe(
      'paths/users%2F%7BuserId%7D/post' // Path encoded, no leading %2F
    );
    expect(buildOperationUriSuffix('users/{userId}', 'post')).toBe(
      'paths/users%2F%7BuserId%7D/post' // Handles no leading slash input
    );
    expect(buildOperationUriSuffix('/users', 'GET')).toBe('paths/users/get'); // Method lowercased
  });

  test('buildPathItemUriSuffix builds correct suffix and encodes path (no leading slash)', () => {
    expect(buildPathItemUriSuffix('/users')).toBe('paths/users'); // No leading slash encoded
    expect(buildPathItemUriSuffix('/users/{userId}')).toBe('paths/users%2F%7BuserId%7D'); // Path encoded, no leading %2F
    expect(buildPathItemUriSuffix('users/{userId}')).toBe('paths/users%2F%7BuserId%7D'); // Handles no leading slash input
  });

  test('buildTopLevelFieldUriSuffix builds correct suffix', () => {
    expect(buildTopLevelFieldUriSuffix('info')).toBe('info');
    expect(buildTopLevelFieldUriSuffix('paths')).toBe('paths');
  });
});
