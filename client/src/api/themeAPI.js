import api from "./budgetAPI";

const getUserId = () => Number(localStorage.getItem("userId"));

export const getTheme = () => {
  const userId = getUserId();
  return api.get("/theme", { params: { userId } });
};

export const setThemeAPI = (theme) => {
  const userId = getUserId();
  // send the simplest payload the server expects
  return api.put("/theme", { userId, theme }); // theme: 'light' | 'dark'
};
