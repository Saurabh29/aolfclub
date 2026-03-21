/**
 * PublicTopBar — slim header for public (unauthenticated) pages.
 * Contains logo and the 🌐 avatar menu (sign-in entry point).
 *
 * Auth is stubbed — replace STUB_SESSION and STUB_LOCATIONS for real auth.
 */
import { type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { AvatarMenu } from "./AvatarMenu";

// ── STUBS (remove when real auth is wired) ──────────────────────────────────
const STUB_SESSION = null; // null = unauthenticated
const STUB_LOCATIONS: [] = [];
// ────────────────────────────────────────────────────────────────────────────

export const PublicTopBar: Component = () => {
  const navigate = useNavigate();

  return (
    <header class="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <a href="/" class="flex items-center gap-2">
        <span class="text-xl">🌿</span>
        <span class="font-semibold text-sm">AOLF Club</span>
      </a>

      <AvatarMenu
        session={STUB_SESSION}
        userLocations={STUB_LOCATIONS}
        activeSlug={null}
        onSignIn={() => {
          // TODO: trigger GitHub OAuth
          alert("Auth not yet wired — add auth provider here");
        }}
        onSignOut={() => navigate("/")}
        onSelectLocation={(slug) => navigate(`/app/${slug}/leads`)}
      />
    </header>
  );
};
