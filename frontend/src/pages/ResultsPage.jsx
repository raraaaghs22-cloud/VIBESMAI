import { useEffect, useState } from "react";
import { Loader2, Lock, Search } from "lucide-react";
import PublicShell from "@/components/PublicShell";
import { PlatformBadge, GradeBadge } from "@/components/Badges";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASSES, fmtDate } from "@/lib/constants";
import { useLang } from "@/lib/i18n";
import { api, errMsg } from "@/lib/api";

const ResultCard = ({ r, i }) => {
  const { t } = useLang();
  return (
    <div data-testid="card-student-result" className="fade-up flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5" style={{ animationDelay: `${i * 60}ms` }}>
      <div className="min-w-0">
        <p className="truncate font-heading font-bold text-slate-900">{r.full_name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700">{t.submitted}</span>
          <PlatformBadge platform={r.platform} />
          <span>{t.submittedAt} {fmtDate(r.submitted_at)}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t.finalScore}</p>
        {r.published ? (
          <div className="mt-1 flex items-center justify-end gap-2" data-testid="text-result-score">
            <span className="font-mono text-2xl font-bold text-slate-900">{r.final_score}</span>
            <GradeBadge grade={r.grade} />
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500" data-testid="text-result-unpublished">{t.notPublished}</p>
        )}
      </div>
    </div>
  );
};

export default function ResultsPage() {
  const { t } = useLang();
  const [enabled, setEnabled] = useState(null);
  const [klass, setKlass] = useState("");
  const [absen, setAbsen] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/public/settings").then((r) => setEnabled(r.data.results_public)).catch(() => setEnabled(false));
  }, []);

  const search = async (e) => {
    e.preventDefault();
    if (!klass || !absen) return setError(t.fillAll);
    setBusy(true);
    setError("");
    try {
      const r = await api.get("/public/results", { params: { class_name: klass, attendance_number: Number(absen) } });
      setResults(r.data);
    } catch (err) {
      if (err?.response?.status === 403) setEnabled(false);
      else setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
        <span className="overline">{t.overline}</span>
        <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{t.resultsTitle}</h1>
        <p className="mt-4 max-w-xl text-base text-slate-600">{t.resultsIntro}</p>
        {enabled === null && <Loader2 className="mt-10 h-6 w-6 animate-spin text-amber-600" />}
        {enabled === false && (
          <div data-testid="banner-results-disabled" className="mt-10 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{t.disabled}</p>
          </div>
        )}
        {enabled && (
          <>
            <form onSubmit={search} className="mt-10 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
              <div className="space-y-2">
                <Label>{t.klass}</Label>
                <Select value={klass} onValueChange={setKlass}>
                  <SelectTrigger data-testid="select-results-class" className="h-11 rounded-xl"><SelectValue placeholder={t.klassPh} /></SelectTrigger>
                  <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>Kelas {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-absen">{t.absen}</Label>
                <Input id="r-absen" type="number" min={1} data-testid="input-results-attendance" className="h-11 rounded-xl font-mono" value={absen} onChange={(e) => setAbsen(e.target.value)} />
              </div>
              <button type="submit" data-testid="button-search-results" disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {t.search}
              </button>
            </form>
            {error && <p className="mt-4 text-sm text-rose-600" data-testid="text-results-error">{error}</p>}
            <div className="mt-6 space-y-3" data-testid="list-results">
              {results?.length === 0 && <p className="text-sm text-slate-500" data-testid="text-no-results">{t.noResults}</p>}
              {results?.map((r, i) => <ResultCard key={i} r={r} i={i} />)}
            </div>
          </>
        )}
      </section>
    </PublicShell>
  );
}
