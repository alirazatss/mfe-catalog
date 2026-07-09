import type { User } from '../types.js';

/**
 * Mock user for testing
 */
export const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
};

/**
 * Mock API response helper
 */
export function mockApiResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Mock error response
 */
export function mockErrorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
