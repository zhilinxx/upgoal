import pool from "../config/db.js";

export async function getThemeByUserId(userId) {
  const [rows] = await pool.execute(
    "SELECT `theme` FROM `user` WHERE `user_id` = ? LIMIT 1",
    [Number(userId)]
  );
  if (!rows?.length) return null;
  return rows[0].theme; // tinyint 0|1
}

export async function updateThemeByUserId(userId, themeInt) {
  const [r] = await pool.execute(
    "UPDATE `user` SET `theme` = ? WHERE `user_id` = ?",
    [Number(themeInt), Number(userId)]
  );
  return r.affectedRows; // helpful for debugging
}
