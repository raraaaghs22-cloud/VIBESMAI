import { NavLink, Link } from "react-router-dom";
import { Music2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

const LangToggle = () => {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-full border border-amber-900/10 bg-white p-0.5 text-xs font-bold">
      {["id", "en"].map((l) => (
        <button
          key={l}
          data-testid={`button-lang-${l}`}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 uppercase transition-colors ${lang === l ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
};

const navCls = ({ isActive }) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "bg-amber-100 text-amber-900" : "text-slate-600 hover:text-slate-900"}`;

export default function PublicShell({ children, showResults = true }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-[#FDFBF7] grain">
      <header className="sticky top-0 z-40 border-b border-amber-900/10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/submit" className="flex items-center gap-2" data-testid="link-home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white">
              <Music2 className="h-5 w-5" />
            </span>
            <span className="hidden font-heading text-sm font-extrabold tracking-tight text-slate-900 sm:block">Seni Musik XI</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/submit" className={navCls} data-testid="nav-submit">{t.navSubmit}</NavLink>
            {showResults && <NavLink to="/results" className={navCls} data-testid="nav-results">{t.navResults}</NavLink>}
          </nav>
          <LangToggle />
        </div>
      </header>
      <main>{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-slate-400 sm:px-6">
        <Link to="/login" className="hover:text-slate-600" data-testid="link-teacher-login">Teacher / Guru</Link>
      </footer>
    </div>
  );
}
