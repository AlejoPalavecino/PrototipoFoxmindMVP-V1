import { useState, useSyncExternalStore } from 'react';
import { createUrlNavigation } from './routing';

export function useUrlNavigation() {
  // Construction is read-only: abandoned renders/StrictMode never write history.
  const [navigation] = useState(() => createUrlNavigation(
    typeof window === 'undefined' ? undefined : window,
  ));
  const snapshot = useSyncExternalStore(
    navigation.subscribe,
    navigation.getSnapshot,
    navigation.getSnapshot,
  );
  return {
    ...snapshot, setView: navigation.setView, setRole: navigation.setRole,
    presentation: { session: navigation.presentation, transition: navigation.getTransition() },
  };
}
