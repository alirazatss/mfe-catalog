/**
 * Shared prop types used across auth-ui components.
 */

import type { User, LoginCredentials } from "@mfe-runtime/auth";

export type { User, LoginCredentials };

export interface AdditionalField {
  /** Name posted to the backend (e.g., "department") */
  name: string;
  /** Label shown to the user */
  label: string;
  /** Input type (default: "text") */
  type?: "text" | "email" | "tel" | "number";
  /** Whether the field is required (default: false) */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

export interface LoginSuccessPayload {
  user: User;
  /** Return URL parsed from the `?returnUrl=` query param, if present */
  returnUrl: string | null;
}

/**
 * Callback invoked when login succeeds. Consumers typically navigate the user.
 */
export type OnLoginSuccess = (payload: LoginSuccessPayload) => void;

/**
 * Callback invoked when login fails. Consumers may show a toast or log.
 */
export type OnLoginError = (error: Error) => void;
