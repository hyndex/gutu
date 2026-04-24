import "./tokens.css";

export type Theme = "light" | "dark";
export type Density = "comfortable" | "compact" | "dense";

const THEME_KEY = "gutu.theme";
const DENSITY_KEY = "gutu.density";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "light";
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode or disabled storage — theme still applies for session */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "light" ? "dark" : "light";
  setTheme(next);
  return next;
}

export function getDensity(): Density {
  if (typeof document === "undefined") return "comfortable";
  return (
    (document.documentElement.getAttribute("data-density") as Density) ||
    "comfortable"
  );
}

export function setDensity(density: Density): void {
  document.documentElement.setAttribute("data-density", density);
  try {
    localStorage.setItem(DENSITY_KEY, density);
  } catch {
    /* no-op */
  }
}
