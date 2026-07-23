# `_legacy/` — Deprecated shell code

Everything under this directory was part of the **fat-shell** era. It has been
replaced by the thin vanilla-TypeScript shell in `apps/shells/website/src/main.ts` +
`apps/shells/website/src/shell/*`.

## Why is it still here?

We keep this code around for **one release cycle** because:

1. Follow-up changes (`extract-auth-ui-package`, `mfe-lifecycle-contract`, `chrome-mfe-header`)
   port pieces of this logic into their proper homes. Having the source handy
   makes the port trivial.
2. If we discover a bug in the thin-shell that the old code handled, we can
   compare implementations quickly.

## When will it be deleted?

Deletion happens as part of the follow-up changes:

| File / directory                         | Destination                                             | Change                        |
| ---------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| `providers/AuthProvider.tsx`             | `packages/auth-ui/src/AuthProvider.tsx`                 | `extract-auth-ui-package`     |
| `components/LoginPage.tsx`               | `packages/auth-ui/src/LoginPage.tsx`                    | `extract-auth-ui-package`     |
| `components/ProtectedRoute.tsx`          | `packages/auth-ui/src/ProtectedRoute.tsx`               | `extract-auth-ui-package`     |
| `components/Layout.tsx`                  | `apps/mfes/mfe-header/src/Header.tsx` (rewritten)       | `chrome-mfe-header`           |
| `components/NavigationEventListener.tsx` | subsumed by the shell's vanilla listener                | this change                   |
| `components/HomePage.tsx`                | future home MFE (out of scope for now)                  | later change                  |
| `components/NotFoundPage.tsx`            | `index.html` template `shell-template-not-found`        | this change                   |
| `components/ErrorBoundary.tsx`           | `graceful-failure-boundaries` change                    | `graceful-failure-boundaries` |
| `components/LoadingSpinner.tsx`          | future MFE-owned loading UI                             | MFEs bring their own          |
| `pages/Login.tsx`                        | login page in `@mfe-runtine/auth-ui`                    | `extract-auth-ui-package`     |
| `providers/*`                            | superseded by `window.__MFE_AUTH__` bridge              | this change                   |
| `config/remotes.ts`                      | replaced by `apps/shells/website/src/shell/manifest.ts` | this change                   |
| `hooks/*`                                | absorbed into MFE-side utilities                        | this change                   |
| `RemoteWidgetLoader.ts`, `counter.ts`    | dead — remove                                           | this change                   |
| `App.tsx`, `main.tsx`                    | replaced by vanilla `main.ts`                           | this change                   |
| `utils/navigation.ts`                    | future `navigation-bridge` change fold-in               | `navigation-bridge`           |

## Do not import from here

New code MUST NOT import anything from `_legacy/`. If you need something that
lives here, promote it into its proper new home first.

## Test files

Some tests under `_legacy/` may still pass (they test the old components). They
are excluded from the shell's `vitest.config.ts` via the `_legacy/**` pattern.
