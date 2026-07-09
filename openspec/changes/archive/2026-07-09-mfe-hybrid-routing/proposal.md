## Why

As micro-frontends grow in complexity, they need their own internal routing (e.g., product list, detail, edit pages). Currently, we have no routing layer—the host loads MFEs as isolated widgets. A hybrid routing architecture allows the shell to own top-level routes (`/products`, `/checkout`) while MFEs manage their sub-routes (`/products/:id`, `/checkout/cart`), enabling both centralized navigation and MFE autonomy. This is future-proof: simple MFEs work without routing, complex MFEs get sub-routes, and all MFEs can run standalone for development/testing.

## What Changes

- Add React Router to host application for top-level navigation
- Create routing infrastructure that passes `basePath` to MFEs
- Update MFE contract to support optional internal routing
- Implement lazy loading of MFEs via dynamic loader + React Router
- Add shared navigation utilities (cross-MFE navigation via events)
- Support standalone MFE development (basePath="/")
- Add route guards for authentication/authorization at shell level
- Create route configuration system that scales with new MFEs
- Document routing patterns and best practices

## Capabilities

### New Capabilities

- `hybrid-routing`: Shell owns top-level routes, MFEs own sub-routes with basePath contract
- `route-guards`: Authentication and authorization checks at shell route level
- `cross-mfe-navigation`: Safe navigation across MFE boundaries via shared event bus

### Modified Capabilities

- `module-federation-host`: Host application now includes routing layer and lazy-loads MFEs based on routes
- `dynamic-loader`: Loader integrates with React Router for route-based loading and code splitting

## Impact

**Code Changes:**

- `apps/website/` - Add React Router, route configuration, layout components, route guards
- `apps/mfe-widget/` - Update to accept `basePath` prop, add internal routing (example)
- `packages/` - New shared package for routing utilities (optional)

**Dependencies:**

- Add `react-router-dom` to host and MFEs
- Add `react` and `react-dom` to catalog (already present)

**Developer Experience:**

- MFEs can now have multiple pages/views
- Developers can run MFEs standalone with basePath="/"
- Navigation between MFEs is centralized and safe
- Deep linking works across all MFEs

**Future Scalability:**

- Easy to add new MFEs (just add route definition)
- MFEs can evolve from simple widgets to complex apps
- Authentication/authorization scales via route guards
- URL structure is predictable and SEO-friendly
