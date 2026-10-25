import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:10000",

  // Allow extra time for Render cold starts
  timeout: 90000,

  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// REQUEST INTERCEPTOR
// Attach JWT to authenticated requests
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("voxiq_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR
// Handle expired JWTs and network timeouts
// ============================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {
    // Handle expired or invalid JWT
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/api/auth/login")
    ) {
      localStorage.removeItem("voxiq_token");
    }

    // Provide a clearer message for slow/unavailable servers
    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      error.message =
        "The server is taking longer than expected to respond. Please wait a moment and try again.";
    }

    return Promise.reject(error);
  }
);

export default api;