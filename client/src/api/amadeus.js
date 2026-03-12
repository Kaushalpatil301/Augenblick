import api from "./axios";

export const searchAmadeusCities = (keyword) =>
  api.get(`/amadeus/cities?keyword=${encodeURIComponent(keyword)}`);

export const getHotelsByCity = (cityCode) =>
  api.get(`/amadeus/hotels?cityCode=${encodeURIComponent(cityCode)}`);

export const getHotelOffers = (
  hotelIds,
  checkInDate,
  checkOutDate,
  adults = 1,
) =>
  api.get(
    `/amadeus/hotel-offers?hotelIds=${encodeURIComponent(hotelIds)}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}`,
  );

export const getPointsOfInterest = (latitude, longitude, radius = 10000) =>
  api.get(
    `/amadeus/pois?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
  );
