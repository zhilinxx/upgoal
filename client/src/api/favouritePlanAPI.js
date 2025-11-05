import { API } from "./auth";

export const getFavourites = (userId) =>
  API.get(`/favourites/${userId}`);

export const checkFavourite = (userId, planId, sumAssured) => {
  return API.get(`/favourites/check/${userId}/${planId}`, {
    params: { sumAssured },
  });
}

export const addFavourite = (userId, planId, sumAssured) =>
  API.post(`/favourites/add`, { userId, planId, sumAssured });

export const removeFavourite = (userId, planId) =>
  API.post(`/favourites/remove`, { userId, planId });

export const removeMultipleFavourites = (userId, plans) =>
  API.post(`/favourites/removeMultiple`, { userId, plans });