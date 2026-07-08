# Production Deployment Guide for Microfrontends

This guide explains how to deploy the microfrontend architecture to production with proper URL configuration.

## Table of Contents

1. [Overview](#overview)
2. [URL Configuration Strategies](#url-configuration-strategies)
3. [Environment Variables](#environment-variables)
4. [Deployment Architectures](#deployment-architectures)
5. [CI/CD Configuration](#cicd-configuration)
6. [Best Practices](#best-practices)

## Overview

In production, remote microfrontends are typically deployed to:

- CDN (e.g., CloudFront, Cloudflare, Fastly)
- Static hosting (e.g., S3, Azure Blob Storage, Google Cloud Storage)
- Web server (e.g., Nginx, Apache)
- Same origin as host (different paths)

## URL Configuration Strategies

### 1. Environment Variables (Build-Time)

**Pros**: Simple, secure, different configs per environment  
**Cons**: Requires rebuild to change URLs

The host application now uses environment variables:

```typescript
// vite.config.ts
const getRemoteUrl = (envVar: string, fallback: string): string => {
  return process.env[envVar] || fallback;
};

// In federation config
entry: getRemoteUrl("VITE_REMOTE_WIDGET_URL", "http://localhost:5174/assets/remoteEntry.js");
```

**Environment files:**

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

**Usage:**

```bash
# Development
pnpm run dev

# Build for staging
pnpm run build --mode staging

# Build for production
pnpm run build --mode production
```

### 2. Runtime Configuration API

**Pros**: Change URLs without rebuild, dynamic multi-tenant support  
**Cons**: Requires backend API, additional HTTP request

Create a configuration endpoint that returns remote URLs:

```typescript
// GET /api/config/remotes
{
  "remoteWidget": "https://cdn.example.com/remote-widget/v1.2.3/assets/remoteEntry.js",
  "remoteAuth": "https://cdn.example.com/remote-auth/v2.0.0/assets/remoteEntry.js"
}
```

Use the `getRemoteConfig()` helper in `src/config/remotes.ts` to fetch this at runtime.

### 3. Base URL Detection

**Pros**: Works automatically for same-origin deployments  
**Cons**: Only works if all apps deployed to same domain

The configuration helper automatically detects:

```typescript
if (window.location.hostname !== "localhost") {
  const baseUrl = window.location.origin;
  return {
    remoteWidget: `${baseUrl}/remotes/remote-widget/assets/remoteEntry.js`,
  };
}
```

## Deployment Architectures

### Architecture 1: CDN with Versioning (Recommended)

```
CDN (CloudFront/Cloudflare)
├── /host/v1.0.0/
│   ├── index.html
│   ├── assets/
│   └── remoteEntry.js (host)
└── /remote-widget/v1.2.3/
    ├── assets/
    └── remoteEntry.js (remote)
```

**Configuration:**

```bash
# .env.production
VITE_REMOTE_WIDGET_URL=https://cdn.example.com/remote-widget/v1.2.3/assets/remoteEntry.js
```

**Benefits:**

- Fast global delivery
- Version control (can run multiple versions)
- Immutable deployments
- Easy rollback

### Architecture 2: Same Origin, Different Paths

```
https://app.example.com/
├── /                    # Host application
│   ├── index.html
│   └── assets/
└── /remotes/
    ├── /remote-widget/
    │   └── assets/remoteEntry.js
    └── /remote-auth/
        └── assets/remoteEntry.js
```

**Configuration:**

```bash
# .env.production
VITE_REMOTE_WIDGET_URL=/remotes/remote-widget/assets/remoteEntry.js
```

**Benefits:**

- No CORS issues
- Simpler authentication
- Single domain SSL certificate

### Architecture 3: Subdomain per Remote

```
Host:   https://app.example.com
Remote: https://widget.example.com/assets/remoteEntry.js
Remote: https://auth.example.com/assets/remoteEntry.js
```

**Configuration:**

```bash
# .env.production
VITE_REMOTE_WIDGET_URL=https://widget.example.com/assets/remoteEntry.js
```

**Benefits:**

- Clear separation
- Independent scaling
- Team ownership per subdomain

### Architecture 4: Multi-Environment Setup

```
Development:  http://localhost:5174/assets/remoteEntry.js
Staging:      https://staging-widget.example.com/assets/remoteEntry.js
Production:   https://widget.example.com/assets/remoteEntry.js
```

**Configuration:**

```bash
# .env.development
VITE_REMOTE_WIDGET_URL=http://localhost:5174/assets/remoteEntry.js

# .env.staging
VITE_REMOTE_WIDGET_URL=https://staging-widget.example.com/assets/remoteEntry.js

# .env.production
VITE_REMOTE_WIDGET_URL=https://widget.example.com/assets/remoteEntry.js
```

## CI/CD Configuration

### GitHub Actions Example

```yaml
# .github/workflows/deploy-host.yml
name: Deploy Host Application

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "22"

      - name: Install dependencies
        run: pnpm install

      - name: Build host for production
        env:
          VITE_REMOTE_WIDGET_URL: https://cdn.example.com/remote-widget/latest/assets/remoteEntry.js
        run: pnpm run build:host

      - name: Deploy to S3
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Sync to S3
        run: |
          aws s3 sync apps/website/dist s3://my-host-bucket/
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} --paths "/*"
```

### Remote Widget Deployment

```yaml
# .github/workflows/deploy-remote-widget.yml
name: Deploy Remote Widget

on:
  push:
    branches: [main]
    paths:
      - "apps/remote-widget/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Get version
        id: version
        run: echo "VERSION=$(node -p "require('./apps/remote-widget/package.json').version")" >> $GITHUB_OUTPUT

      - name: Build remote widget
        run: pnpm run build:remote

      - name: Deploy to CDN
        run: |
          # Upload to versioned path
          aws s3 sync apps/remote-widget/dist s3://my-cdn-bucket/remote-widget/${{ steps.version.outputs.VERSION }}/

          # Update 'latest' pointer
          aws s3 sync apps/remote-widget/dist s3://my-cdn-bucket/remote-widget/latest/
```

## Docker Deployment

### Host Dockerfile

```dockerfile
# apps/website/Dockerfile
FROM node:22-alpine as builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
ARG VITE_REMOTE_WIDGET_URL
ENV VITE_REMOTE_WIDGET_URL=$VITE_REMOTE_WIDGET_URL

RUN pnpm run build:host

FROM nginx:alpine
COPY --from=builder /app/apps/website/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build and run:**

```bash
docker build \
  --build-arg VITE_REMOTE_WIDGET_URL=https://cdn.example.com/remote-widget/latest/assets/remoteEntry.js \
  -t host-app:latest \
  -f apps/website/Dockerfile .

docker run -p 80:80 host-app:latest
```

## Nginx Configuration

### Serving Remote Modules

```nginx
# nginx.conf for remote widget
server {
    listen 80;
    server_name widget.example.com;

    root /usr/share/nginx/html;
    index index.html;

    # Enable CORS for remote modules
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type' always;

    # Cache remoteEntry.js for short time (5 minutes)
    location = /assets/remoteEntry.js {
        expires 5m;
        add_header Cache-Control "public, max-age=300";
    }

    # Cache other assets for longer (1 year)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Best Practices

### 1. Versioning Strategy

**Semantic versioning for remotes:**

```
https://cdn.example.com/remote-widget/v1.2.3/assets/remoteEntry.js
https://cdn.example.com/remote-widget/v1.2.4/assets/remoteEntry.js
https://cdn.example.com/remote-widget/latest/assets/remoteEntry.js (alias)
```

**Benefits:**

- Multiple versions can run simultaneously
- Gradual rollout (canary deployments)
- Easy rollback to previous version

### 2. Cache Strategy

```
remoteEntry.js     -> Cache: 5 minutes  (update frequently)
Other assets       -> Cache: 1 year     (immutable, versioned URLs)
index.html (host)  -> Cache: no-cache   (always fresh)
```

### 3. CORS Configuration

Remote modules must have CORS enabled:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 4. Health Checks

Create health check endpoints:

```typescript
// /api/health
{
  "status": "healthy",
  "remotes": {
    "remoteWidget": {
      "url": "https://cdn.example.com/remote-widget/v1.2.3/assets/remoteEntry.js",
      "status": "available",
      "lastChecked": "2026-07-08T11:30:00Z"
    }
  }
}
```

### 5. Monitoring

Monitor remote loading failures:

```typescript
// In RemoteWidgetLoader.ts
window.addEventListener("error", (event) => {
  if (event.message.includes("remoteEntry")) {
    // Send to monitoring service
    console.error("Remote module failed to load:", event);
    // Track in analytics
  }
});
```

### 6. Graceful Degradation

Always provide fallback UI when remote fails:

```typescript
// Already implemented in RemoteWidgetLoader.ts
catch (error) {
  // Show error boundary with helpful message
  container.innerHTML = `<div>...</div>`;
}
```

## Environment-Specific Examples

### Local Development

```bash
VITE_REMOTE_WIDGET_URL=http://localhost:5174/assets/remoteEntry.js
```

### Staging

```bash
VITE_REMOTE_WIDGET_URL=https://staging-cdn.example.com/remote-widget/latest/assets/remoteEntry.js
```

### Production

```bash
VITE_REMOTE_WIDGET_URL=https://cdn.example.com/remote-widget/v1.2.3/assets/remoteEntry.js
```

### Production with Fallback

```bash
VITE_REMOTE_WIDGET_URL=https://cdn-primary.example.com/remote-widget/v1.2.3/assets/remoteEntry.js
VITE_REMOTE_WIDGET_FALLBACK_URL=https://cdn-backup.example.com/remote-widget/v1.2.3/assets/remoteEntry.js
```

## Troubleshooting

### Remote Module Not Loading

1. Check CORS headers on remote server
2. Verify URL is accessible (check network tab)
3. Check browser console for errors
4. Verify remote was built and deployed
5. Check cache settings (try hard refresh)

### Version Mismatch

Use a version manifest to ensure compatibility:

```json
// /api/manifest
{
  "host": "1.0.0",
  "remotes": {
    "remoteWidget": {
      "version": "1.2.3",
      "minHostVersion": "1.0.0",
      "maxHostVersion": "2.0.0"
    }
  }
}
```

## Security Considerations

1. **HTTPS Only**: Never load remotes over HTTP in production
2. **Content Security Policy**: Configure CSP headers to allow remote scripts
3. **Subresource Integrity**: Consider using SRI for remote modules
4. **Authentication**: Protect sensitive remotes behind authentication
5. **Rate Limiting**: Prevent abuse of remote module endpoints

## Summary

The microfrontend architecture now supports:

- ✅ Environment-based configuration
- ✅ Runtime URL configuration
- ✅ Multiple deployment patterns
- ✅ Version management
- ✅ Error handling and fallbacks
- ✅ Production-ready setup

Choose the deployment architecture that best fits your infrastructure and team structure.
