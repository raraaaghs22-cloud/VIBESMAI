import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Send, Link2 } from "lucide-react";
import PublicShell from "@/components/PublicShell";
import { PlatformBadge } from "@/components/Badges";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASSES, detectPlatform } from "@/lib/constants";
import { useLang, SUCCESS_MSG } from "@/lib/i18n";
import { api, errMsg } from "@/lib/api";

const HERO = "https://images.unsplash.com/photo-1511379938547-c1f69419868d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const EMPTY = { full_name: "", class_name: "", attendance_number: "", video_url: "" };

const Requirements = () => {
  const { t } = useLang();
  return (
    <ul className="mt-6 flex flex-wrap gap-2">
      {t.req.map((r) => (
        <li key={r} className="rounded-full border border-amber-900/10 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">{r}</li>
      ))}
    </ul>
  );
};

const Success = ({ onAgain }) => {
  const { t } = useLang();
  return (
    <div data-testid="banner-submit-success" className="fade-up flex flex-col items-start gap-4 py-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-8 w-8" />
      </span>
      <p className="font-heading text-xl font-bold leading-snug text-slate-900">{SUCCESS_MSG}</p>
      <button data-testid="button-submit-another" onClick={onAgain} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
        {t.again}
      </button>
    </div>
  );
};

export default function SubmitPage() {
  const { t } = useLang();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const platform = detectPlatform(form.video_url.trim());
  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  useEffect(() => setError(""), [form]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.class_name || !form.attendance_number || !form.video_url.trim()) return setError(t.fillAll);
    if (!platform) return setError(t.linkInvalid);
    setBusy(true);
    try {
      await api.post("/submissions", { ...form, attendance_number: Number(form.attendance_number) });
      setDone(true);
      setForm(EMPTY);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-16">
        <div className="fade-up">
          <span className="overline">{t.overline}</span>
          <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">{t.project}</h1>
          <p className="mt-5 max-w-md text-base text-slate-600">{t.intro}</p>
          <Requirements />
          <div className="relative mt-8 hidden overflow-hidden rounded-3xl lg:block">
            <img src={HERO} alt="Music instruments" className="h-64 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
          </div>
        </div>
        <div className="fade-up rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(120,53,15,0.35)] sm:p-8" style={{ animationDelay: "120ms" }}>
          {done ? (
            <Success onAgain={() => setDone(false)} />
          ) : (
            <form onSubmit={submit} className="space-y-5" data-testid="form-submit-assignment">
              <div className="space-y-2">
                <Label htmlFor="name">{t.name}</Label>
                <Input id="name" data-testid="input-full-name" className="h-11 rounded-xl" placeholder={t.namePh} value={form.full_name} onChange={set("full_name")} maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.klass}</Label>
                  <Select value={form.class_name} onValueChange={set("class_name")}>
                    <SelectTrigger data-testid="select-class-name" className="h-11 rounded-xl"><SelectValue placeholder={t.klassPh} /></SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => <SelectItem key={c} value={c} data-testid={`option-class-${c.replace(" ", "-")}`}>Kelas {c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="absen">{t.absen}</Label>
                  <Input id="absen" type="number" min={1} max={60} data-testid="input-attendance-number" className="h-11 rounded-xl font-mono" placeholder="1–40" value={form.attendance_number} onChange={set("attendance_number")} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="link">{t.link}</Label>
                  {platform && <span className="flex items-center gap-1.5 text-xs text-slate-500">{t.detected} <PlatformBadge platform={platform} testId="badge-detected-platform" /></span>}
                </div>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="link" type="text" inputMode="url" data-testid="input-video-url" className="h-11 rounded-xl pl-9 font-mono text-sm" placeholder={t.linkPh} value={form.video_url} onChange={set("video_url")} />
                </div>
                {form.video_url.trim().length > 8 && !platform && <p className="text-xs text-rose-600" data-testid="text-link-invalid">{t.linkInvalid}</p>}
              </div>
              {error && <p data-testid="text-submit-error" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <button type="submit" disabled={busy} data-testid="button-submit-assignment" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 font-semibold text-white transition-[background-color,transform] hover:bg-amber-700 active:scale-[0.98] disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {busy ? t.sending : t.submit}
              </button>
            </form>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
