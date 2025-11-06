import { getThemeByUserId, updateThemeByUserId } from "../repositories/themeRepository.js";

function normalizeThemeToInt(input) {
  if (input === 1 || input === "1" || input === "dark") return 1;
  return 0;
}

export async function fetchUserTheme(userId) {
  const t = await getThemeByUserId(userId);
  if (t === null || t === undefined) return 0; // default light
  return Number(t) === 1 ? 1 : 0;
}

export async function setUserTheme(userId, theme) {
  const asInt = normalizeThemeToInt(theme);
  const rows = await updateThemeByUserId(userId, asInt);
  if (rows === 0) throw new Error("No row updated (wrong user_id?)");
  return asInt;
}
