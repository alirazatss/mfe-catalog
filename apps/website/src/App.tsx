import { Routes, Route } from "react-router";
import { Suspense, lazy } from "react";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-load pages
const HomePage = lazy(() => import("./components/HomePage"));
const LoginPage = lazy(() => import("./components/LoginPage"));
const NotFoundPage = lazy(() => import("./components/NotFoundPage"));

// Lazy-load MFE
const MFEWidget = lazy(async () => {
  const { loader } = await import("./config/remotes");
  const container = await loader.loadRemote("mfe-widget");
  const factory = await container.get("./App");
  const module = factory();
  return { default: module.default || module.App || module };
}) as any; // Type assertion needed for lazy-loaded MFE with props

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />} errorElement={<ErrorBoundary />}>
        <Route
          index
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <HomePage />
            </Suspense>
          }
        />

        <Route
          path="auth/login"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <LoginPage />
            </Suspense>
          }
        />

        <Route
          path="widget/*"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <MFEWidget basePath="/widget" router="memory" />
            </Suspense>
          }
        />

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
