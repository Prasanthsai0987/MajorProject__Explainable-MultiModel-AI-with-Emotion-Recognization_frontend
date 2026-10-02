import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "../components/layout/ProtectedRoute.css";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    user,
    loading,
    setGoogleToken,
  } = useAuth();

  // ============================================================
  // STEP 1 — Get JWT from backend and save it
  // ============================================================

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      toast.error("Google sign-in failed. Please try again.");
      navigate("/", { replace: true });
      return;
    }

    // Save JWT to localStorage through AuthContext
    setGoogleToken(token);

    // Remove token from browser URL
    window.history.replaceState(
      {},
      "",
      "/auth/callback"
    );
  }, [searchParams, setGoogleToken, navigate]);

  // ============================================================
  // STEP 2 — Wait for AuthContext to load user
  // ============================================================

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      toast.success(
        "Login Successful! Welcome back 👋"
      );

      navigate("/home", {
        replace: true,
      });
    }
  }, [loading, user, navigate]);

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  return (
    <div className="protected-loader">
      <div className="protected-spinner" />
    </div>
  );
}