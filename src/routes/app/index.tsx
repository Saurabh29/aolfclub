/**
 * /app — redirect to the main leads view.
 * Active location is resolved server-side from the user record, not the URL.
 */
import { Navigate } from "@solidjs/router";

export default function AppIndex() {
  return <Navigate href="/app/leads" />;
}
