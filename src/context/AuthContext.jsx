import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { authAPI } from "../api/auth";


const AuthContext =
  createContext(null);


export function AuthProvider({
  children,
}) {

  const [user, setUser] =
    useState(null);

  const [token, setToken] =
    useState(
      () =>
        localStorage.getItem(
          "voxiq_token"
        )
    );

  const [loading, setLoading] =
    useState(true);


  // ==========================================================
  // RESTORE SESSION
  // ==========================================================

  useEffect(() => {

    if (!token) {

      setUser(null);
      setLoading(false);

      return;
    }


    authAPI.getMe()

      .then((data) => {
        setUser(data);
      })

      .catch(() => {

        localStorage.removeItem(
          "voxiq_token"
        );

        setToken(null);
        setUser(null);
      })

      .finally(() => {
        setLoading(false);
      });

  }, [token]);


  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = async (
    email,
    password
  ) => {

    const data =
      await authAPI.login(
        email,
        password
      );

    localStorage.setItem(
      "voxiq_token",
      data.access_token
    );

    setToken(
      data.access_token
    );

    setUser(data.user);

    return data;
  };


  // ==========================================================
  // REGISTER
  // ==========================================================

  const register = async (
    name,
    email,
    password
  ) => {

    const data =
      await authAPI.register(
        name,
        email,
        password
      );

    localStorage.setItem(
      "voxiq_token",
      data.access_token
    );

    setToken(
      data.access_token
    );

    setUser(data.user);

    return data;
  };


  // ==========================================================
  // GOOGLE
  // ==========================================================

  const loginWithGoogle = () => {
    authAPI.googleOAuth();
  };


  const setGoogleToken = (
    newToken
  ) => {

    localStorage.setItem(
      "voxiq_token",
      newToken
    );

    setToken(newToken);
  };


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = () => {

    localStorage.removeItem(
      "voxiq_token"
    );

    setToken(null);
    setUser(null);
  };


  const value = {
    user,
    token,
    loading,
    login,
    register,
    loginWithGoogle,
    setGoogleToken,
    logout,
  };


  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}


export const useAuth = () => {

  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>"
    );
  }

  return ctx;
};