import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import { SessionProvider } from "@solid-mediakit/auth/client";

export default function App() {
  return (
    <Router
      root={props => (
        <>
          <SessionProvider>
            <Suspense>{props.children}</Suspense>
          </SessionProvider>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}