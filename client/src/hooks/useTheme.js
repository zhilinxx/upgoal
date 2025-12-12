import { useEffect, useState, useCallback } from "react";
import { getTheme, setThemeAPI } from "../api/themeAPI";

function applyDomTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
}

export default function useTheme() {
  // Initial theme from localStorage
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [loading, setLoading] = useState(true);

  // Keep DOM + localStorage in sync whenever theme state changes
  useEffect(() => {
    applyDomTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // On mount, sync from DB ONLY if user is logged in
  useEffect(() => {
    let ignore = false;

    const userId = localStorage.getItem("userId");
    if (!userId) {
      // no logged-in user: just use localStorage / default
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await getTheme();
        const t = data?.theme === "dark" ? "dark" : "light";

        if (!ignore) {
          setThemeState(t);
        }
      } catch (e) {
        console.error("Failed to fetch theme from server:", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Change theme: if logged in, also persist to server
  const setTheme = useCallback(
    async (next) => {
      const desired = next === "dark" ? "dark" : "light";
      const prev = theme;
      const userId = localStorage.getItem("userId");

      // If no user logged in: just change local state (no API)
      if (!userId) {
        setThemeState(desired);
        return;
      }

      try {
        await setThemeAPI(desired); 
        setThemeState(desired);    
      } catch (e) {
        console.error("Failed to save theme:", e);
        setThemeState(prev);
      }
    },
    [theme]
  );

  const toggle = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  return { theme, setTheme, toggle, loading };
}
