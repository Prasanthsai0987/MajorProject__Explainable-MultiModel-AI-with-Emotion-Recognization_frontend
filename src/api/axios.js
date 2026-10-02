import axios from "axios";


const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:10000",

  timeout: 30000,

  headers: {
    "Content-Type": "application/json",
  },
});


// ============================================================
// REQUEST INTERCEPTOR
// Attach JWT to every authenticated request
// ============================================================

api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem("voxiq_token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


// ============================================================
// RESPONSE INTERCEPTOR
// Handle expired/invalid JWT
// ============================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {

    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/api/auth/login")
    ) {

      localStorage.removeItem(
        "voxiq_token"
      );
    }

    return Promise.reject(error);
  }
);


export default api;