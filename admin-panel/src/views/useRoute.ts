import { useEffect, useState } from "react";

/** Tiny hash-router subscription. The full router lives in shell/. */
export function useHash(): string {
  const [hash, setHash] = useState<string>(() =>
    typeof window === "undefined" ? "" : window.location.hash.slice(1) || "/",
  );
  useEffect(() => {
    const onHash = () =>
      setHash(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

export function navigateTo(path: string): void {
  if (typeof window === "undefined") return;
  if (path.startsWith("#")) path = path.slice(1);
  if (window.location.hash.slice(1) === path) return;
  window.location.hash = path;
}
