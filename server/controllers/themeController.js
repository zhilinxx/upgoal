import { fetchUserTheme, setUserTheme } from "../services/themeService.js";

export async function getTheme(req, res) {
  try {
    const userId = req.user?.id ?? Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: "Missing user id" });

    const themeInt = await fetchUserTheme(userId);
    return res.json({ theme: themeInt === 1 ? "dark" : "light", themeInt });
  } catch (err) {
    console.error("getTheme error:", err);
    return res.status(500).json({ error: "Failed to fetch theme" });
  }
}

export async function updateTheme(req, res) {
  try {
    const userId = req.user?.id ?? Number(req.body.userId);
    const { theme } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing user id" });
    if (theme === undefined) return res.status(400).json({ error: "Missing theme" });

    console.log("[updateTheme] userId=", userId, "theme=", theme);
    const themeInt = await setUserTheme(userId, theme);
    return res.json({ ok: true, theme: themeInt === 1 ? "dark" : "light", themeInt });
  } catch (err) {
    console.error("updateTheme error:", err);
    return res.status(500).json({ error: "Failed to update theme" });
  }
}
