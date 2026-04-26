/**
 * PublicTopBar  -  slim header for public (unauthenticated) pages.
 * Contains logo and the avatar menu (globe icon when signed-out, avatar when signed-in).
 *
 * Uses real Auth.js session via createAsync.
 */
import { type Component } from "solid-js";
import { createAsync, useNavigate } from "@solidjs/router";
import { Leaf } from "lucide-solid";
import { AvatarMenu } from "./AvatarMenu";
import { getAuthSession, getAvailableProviders, signInWithProvider } from "~/lib/auth";

export const PublicTopBar: Component = () => {
  const navigate = useNavigate();
  const session = createAsync(() => getAuthSession());
  const providers = createAsync(() => getAvailableProviders());

  const avatarSession = () => {
    const s = session();
    if (!s?.user) return null;
    return {
      name: (s.user as any).name ?? (s.user as any).email ?? "User",
      email: (s.user as any).email ?? "",
      image: (s.user as any).image ?? undefined,
    };
  };

  return (
    <header class="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <a href="/" class="flex items-center gap-2">
        <Leaf class="w-5 h-5 text-green-600" />
        <span class="font-semibold text-sm">AOLF Club</span>
      </a>

      <AvatarMenu
        session={avatarSession()}
        userLocations={[]}
        activeSlug={null}
        providers={providers() ?? []}
        onSignIn={(provider) => signInWithProvider(provider)}
        onSignOut={() => {
          window.location.href = "/api/auth/signout";
        }}
        onSelectLocation={(slug) => navigate(`/leads`)}
      />
    </header>
  );
};
