
import api from "./axios";

// ==========================================================
// LOGIN
// ==========================================================
export const authAPI = {
  login: async (email, password) => {
    const form = new URLSearchParams();

    form.append("username", email);
    form.append("password", password);

    const res = await api.post(
      "/api/auth/login",
      form,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return res.data;
  },

  // ==========================================================
  // REGISTER
  // ==========================================================
  register: async (name, email, password) => {
    const res = await api.post(
      "/api/auth/register",
      {
        name,
        email,
        password,
      }
    );

    return res.data;
  },

  // ==========================================================
  // CURRENT USER
  // ==========================================================
  getMe: async () => {
    const res = await api.get("/api/auth/me");
    return res.data;
  },

  // ==========================================================
  // GOOGLE OAUTH
  // ==========================================================
  googleOAuth: () => {
    const backendUrl = (
      import.meta.env.VITE_API_URL ||
      "http://localhost:10000"
    ).replace(/\/+$/, "");

    window.location.href = `${backendUrl}/api/auth/google`;
  },
};