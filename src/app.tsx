import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, ErrorBoundary } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <Router
      root={props => (
        <ErrorBoundary
          fallback={(err, reset) => (
            <div class="flex flex-col items-center justify-center h-svh gap-4 text-sm">
              <p class="text-destructive font-medium">Something went wrong</p>
              <p class="text-muted-foreground max-w-md text-center">
                {err?.message || "An unexpected error occurred."}
              </p>
              <div class="flex gap-2">
                <button
                  class="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
                  onClick={reset}
                >
                  Try again
                </button>
                <a href="/" class="px-4 py-2 rounded-md border border-border text-sm">
                  Go home
                </a>
              </div>
            </div>
          )}
        >
          <Suspense>{props.children}</Suspense>
        </ErrorBoundary>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
