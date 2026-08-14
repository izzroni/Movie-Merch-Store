import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true, // Keep this if you plan to use cookies later; otherwise, safe to remove
});

// Request Interceptor: Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await axios.post("http://localhost:5000/api/refresh-token", null, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const newToken = response.data.token;
        localStorage.setItem("token", newToken); // Update stored token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest); // Retry the original request
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        localStorage.removeItem("token");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("isCourier");
        localStorage.removeItem("user");
        window.location.href = "/login"; // Force redirect to login
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;