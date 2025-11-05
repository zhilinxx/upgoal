import { useEffect, useState, useCallback } from "react";
import { getTheme, setThemeAPI } from "../api/themeAPI";

function applyDomTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
}

export default function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [loading, setLoading] = useState(true);

  // fetch from DB on mount
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data } = await getTheme();
        const t = data?.theme === "dark" ? "dark" : "light";
        if (!ignore) {
          setThemeState(t);
          applyDomTheme(t);
          localStorage.setItem("theme", t);
        }
      } catch {
        // fallback to current local value
        applyDomTheme(theme);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pessimistic update: write server first, then commit UI
  const setTheme = useCallback(async (next) => {
    const desired = next === "dark" ? "dark" : "light";
    const prev = theme;

    try {
      await setThemeAPI(desired);                 // <-- wait server OK
      setThemeState(desired);
      applyDomTheme(desired);
      localStorage.setItem("theme", desired);
    } catch (e) {
      console.error("Failed to save theme:", e);
      // optional: toast error here
      // revert UI (do nothing; it never changed)
      applyDomTheme(prev);
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  return { theme, setTheme, toggle, loading };
}
