import { Link, useNavigate } from "react-router-dom";
import { LogOut, Music2 } from "lucide-react";
import { api } from "@/lib/api";

export const DashHeader = ({ user }) => {
  const navigate = useNavigate();
  const logout = async () => {
    await api.post("/auth/logout");
    navigate("/login");
  };
  return (
    <header className="sticky top-0 z-40 border-b border-amber-900/10 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white"><Music2 className="h-5 w-5" /></span>
          <span className="font-heading text-sm font-extrabold text-slate-900">Jurnal Guru · Seni Musik XI</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-right text-xs sm:block">
            <span className="block font-semibold text-slate-900" data-testid="text-admin-name">{user.name}</span>
            <span className="text-slate-400">{user.email}</span>
          </span>
          {user.picture && <img src={user.picture} alt="" className="h-9 w-9 rounded-full" />}
          <button data-testid="button-logout" onClick={logout} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Logout"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
  );
};
