import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sessionId = new URLSearchParams(location.hash.slice(1)).get("session_id");
    api
      .post("/auth/session", {}, { headers: { "X-Session-ID": sessionId } })
      .then((r) => navigate("/dashboard", { replace: true, state: { user: r.data } }))
      .catch(() => navigate("/login", { replace: true }));
  }, [location.hash, navigate]);

  return null;
}
