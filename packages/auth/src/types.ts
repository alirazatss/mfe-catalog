/**
 * User object returned from backend after Keycloak authentication
 */
export interface User {
  id: string;
  email: string;
  name: string;
  roles?: string[];
  // Add other Keycloak user attributes as needed
}

/**
 * Login credentials sent to backend
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Response from backend /auth/login endpoint
 */
export interface LoginResponse {
  accessToken: string;
  user: User;
  expiresIn?: number; // Token lifetime in seconds (optional)
}

/**
 * Response from backend /auth/refresh endpoint
 */
export interface RefreshResponse {
  accessToken: string;
  expiresIn?: number;
}
