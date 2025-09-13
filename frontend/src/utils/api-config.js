// API Configuration utility
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
};

export const getWebSocketUrl = () => {
  const baseUrl = getApiBaseUrl();
  // Remove /api suffix and return base URL for SignalR hubs
  return baseUrl.replace("/api", "");
};

export default {
  getApiBaseUrl,
  getWebSocketUrl
};