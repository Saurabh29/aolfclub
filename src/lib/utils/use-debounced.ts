/**
 * useDebounced
 *
 * Returns a debounced accessor that mirrors the source signal but only
 * propagates updates after `delayMs` of inactivity. Use to avoid firing
 * a server query on every keystroke.
 *
 *   const [text, setText] = createSignal("");
 *   const debounced = useDebounced(text, 300);
 *   createEffect(() => fetchSearch(debounced()));
 */
import {
  createSignal,
  createEffect,
  onCleanup,
  type Accessor,
} from "solid-js";

export function useDebounced<T>(
  source: Accessor<T>,
  delayMs = 300,
): Accessor<T> {
  const [value, setValue] = createSignal<T>(source());

  createEffect(() => {
    const next = source();
    const id = setTimeout(() => setValue(() => next), delayMs);
    onCleanup(() => clearTimeout(id));
  });

  return value;
}
