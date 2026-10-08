import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Loader2, ShieldX } from "lucide-react";
import { api } from "@/lib/api";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(location.state?.user || null);
  const [checked, setChecked] = useState(!!location.state?.user);

  useEffect(() => {
    if (location.state?.user) return;
    api
      .get("/auth/me")
      .then((r) => { setUser(r.data); setChecked(true); })
      .catch(() => navigate("/login", { replace: true }));
  }, [location.state, navigate]);

  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7]"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>;
  if (!user.is_admin) {
    return (
      <div data-testid="banner-not-admin" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FDFBF7] px-6 text-center">
        <ShieldX className="h-10 w-10 text-rose-500" />
        <p className="font-heading text-xl font-bold text-slate-900">Akun {user.email} bukan akun guru.</p>
        <p className="text-sm text-slate-500">Dashboard hanya dapat diakses oleh admin.</p>
        <button data-testid="button-logout-nonadmin" onClick={() => api.post("/auth/logout").then(() => navigate("/login"))} className="rounded-xl border px-4 py-2 text-sm">Keluar</button>
        <Link to="/submit" className="text-sm text-amber-700">Ke halaman pengumpulan</Link>
      </div>
    );
  }
  return children(user);
}
