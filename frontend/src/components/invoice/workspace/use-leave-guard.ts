import { useEffect, useRef } from "react";
import { useBlocker } from "react-router";

/** Blocks in-app navigation and tab close while there are unsaved changes. */
export function useLeaveGuard(isDirty: boolean) {
  // Lets our own redirects (after create or delete) past the guard.
  const allowed = useRef(false);
  const dirtyRef = useRef(isDirty);
  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowed.current &&
      dirtyRef.current &&
      currentLocation.pathname + currentLocation.search !==
        nextLocation.pathname + nextLocation.search,
  );

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return {
    blocker,
    allowLeave: () => {
      allowed.current = true;
    },
    /** Closes the leave dialog, e.g. so failed fields are visible. */
    cancelLeave: () => {
      if (blocker.state === "blocked") blocker.reset();
    },
  };
}
