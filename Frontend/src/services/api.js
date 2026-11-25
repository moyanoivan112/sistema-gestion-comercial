import axios from "axios";

const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    const hostname = window.location.hostname;
    return `http://${hostname}:5000/api`;
  }
  return "/api";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const esIntentoLogin = url.includes("/auth/login");

    if (status === 401 && !esIntentoLogin) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("organizacion");
      localStorage.removeItem("nombre_iglesia");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
