import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Music2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { startGoogleLogin } from "@/lib/auth";

const IMG = "https://images.unsplash.com/photo-1668620428264-6378ce10b69c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function LoginPage() {
  const navigate = useNavigate();
  useEffect(() => {
    api.get("/auth/me").then((r) => r.data.is_admin && navigate("/dashboard", { replace: true })).catch(() => {});
  }, [navigate]);

  return (
    <div className="grid min-h-screen bg-[#FDFBF7] lg:grid-cols-2">
      <div className="flex flex-col justify-between p-6 sm:p-12">
        <Link to="/submit" className="flex items-center gap-2" data-testid="link-login-home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white"><Music2 className="h-5 w-5" /></span>
          <span className="font-heading text-sm font-extrabold text-slate-900">Seni Musik XI</span>
        </Link>
        <div className="fade-up max-w-md py-16">
          <span className="overline">Jurnal Guru</span>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Masuk ke dashboard penilaian.</h1>
          <p className="mt-4 text-slate-600">Tinjau draft nilai AI, edit, publikasikan, dan ekspor rekap 12 kelas.</p>
          <button data-testid="button-google-login" onClick={startGoogleLogin} className="mt-8 flex h-12 items-center gap-3 rounded-xl bg-slate-900 px-6 font-semibold text-white transition-[background-color,transform] hover:bg-slate-800 active:scale-[0.98]">
            <svg className="h-5 w-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Masuk dengan Google
          </button>
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" /> Hanya akun guru (admin) yang dapat mengakses dashboard.</p>
        </div>
        <p className="text-xs text-slate-400">Creative Video Project · Musik di Sekitar Kita</p>
      </div>
      <div className="relative hidden lg:block">
        <img src={IMG} alt="Filming music performance" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/40 to-transparent" />
      </div>
    </div>
  );
}
