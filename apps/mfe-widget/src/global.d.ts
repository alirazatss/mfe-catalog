export {};

declare global {
  interface Window {
    __AUTH__?: {
      isAuthenticated: boolean;
      user?: {
        id: string;
        email: string;
        name: string;
      };
      getAccessToken: () => string | null;
    };
  }
}
