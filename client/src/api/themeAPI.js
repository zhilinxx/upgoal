import { API } from "./auth";

const getUserId = () => Number(localStorage.getItem("userId"));

export const getTheme = () => {
  const userId = getUserId();
  return API.get("/theme", { params: { userId } });
};

export const setThemeAPI = (theme) => {
  const userId = getUserId();
  // send the simplest payload the server expects
  return API.put("/theme", { userId, theme }); // theme: 'light' | 'dark'
};
