import { Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import Layout from "./components/Layout.js";
import LoadingSpinner from "./components/LoadingSpinner.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { useAuth } from "./providers/AuthProvider.js";
import { tokenManager } from "@mfe-runtine/auth";

// Lazy-load pages
const HomePage = lazy(() => import("./components/HomePage.js"));
const Login = lazy(() => import("./pages/Login.js").then((m) => ({ default: m.Login })));
const NotFoundPage = lazy(() => import("./components/NotFoundPage.js"));

// Lazy-load MFE
const MFEWidget = lazy(async () => {
  const { loader } = await import("./config/remotes.js");
  const container = await loader.loadRemote("mfe-widget");
  const factory = await container.get("./App");
  const module = factory();
  return { default: module.default || module.App || module };
}) as any; // Type assertion needed for lazy-loaded MFE with props

export default function App() {
  const { isAuthenticated, user } = useAuth();

  // Expose auth methods globally for MFEs
  useEffect(() => {
    (window as any).__AUTH__ = {
      getAccessToken: () => tokenManager.getAccessToken(),
      isAuthenticated: () => tokenManager.isAuthenticated(),
    };
  }, []);

  return (
    <Routes>
      <Route element={<Layout />} errorElement={<ErrorBoundary />}>
        {/* Public route - Home */}
        <Route
          index
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <HomePage />
            </Suspense>
          }
        />

        {/* Public route - Login */}
        <Route
          path="login"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <Login />
            </Suspense>
          }
        />

        {/* Protected route - MFE Widget */}
        <Route
          path="widget/*"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <MFEWidget
                  basePath="/widget"
                  router="memory"
                  isAuthenticated={isAuthenticated}
                  user={user}
                />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
