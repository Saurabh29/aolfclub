import { createSignal, onMount, onCleanup } from "solid-js";

/**
 * useMediaQuery - Reactive media query hook
 * 
 * @param query - CSS media query
 * @returns Signal that updates when media query matches
 * 
 * @example
 * ```tsx
 * const isDesktop = useMediaQuery("(min-width: 768px)");
 * ```
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = createSignal(false);

  onMount(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener("change", handler);

    onCleanup(() => {
      mediaQuery.removeEventListener("change", handler);
    });
  });

  return matches;
}
