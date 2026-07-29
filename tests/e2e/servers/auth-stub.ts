#!/usr/bin/env node
/**
 * Minimal auth stub server for E2E tests.
 *
 * Provides:
 * - /auth/token (returns mock JWT)
 * - /auth/refresh (returns new mock JWT)
 * - /auth/validate (returns 200 if valid token header)
 *
 * Designed to test auth-specific journeys without mocking window.__MFE_AUTH__.
 *
 * REQ-TI-E-3
 */

import * as http from "http";

const PORT = process.env.E2E_AUTH_PORT || 4275;

interface AuthResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

const MOCK_TOKEN = "mock-jwt-token-12345";
const MOCK_USER = {
  id: "test-user-1",
  email: "test@example.com",
  roles: ["user"],
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // /auth/token - initial login
  if (url.pathname === "/auth/token" && req.method === "POST") {
    const response: AuthResponse = {
      token: MOCK_TOKEN,
      expiresIn: 3600,
      user: MOCK_USER,
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
    return;
  }

  // /auth/refresh - token refresh
  if (url.pathname === "/auth/refresh" && req.method === "POST") {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing or invalid token" }));
      return;
    }

    const response: AuthResponse = {
      token: `${MOCK_TOKEN}-refreshed`,
      expiresIn: 3600,
      user: MOCK_USER,
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
    return;
  }

  // /auth/validate - validate token
  if (url.pathname === "/auth/validate" && req.method === "GET") {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ valid: false }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ valid: true, user: MOCK_USER }));
    return;
  }

  // /health - health check for Playwright
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Auth stub server listening on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /auth/token - Get token`);
  console.log(`  POST /auth/refresh - Refresh token`);
  console.log(`  GET /auth/validate - Validate token`);
  console.log(`  GET /health - Health check`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  server.close(() => {
    console.log("Auth stub server stopped");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down...");
  server.close(() => {
    console.log("Auth stub server stopped");
    process.exit(0);
  });
});
