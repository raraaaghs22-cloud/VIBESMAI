import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PlatformBadge, GradeBadge, StatusPill } from "@/components/Badges";
import { api, errMsg } from "@/lib/api";

const RUBRIC = [
  ["content_score", "Content & Context", 0.5, "bg-amber-500"],
  ["delivery_score", "Delivery & Subtitles", 0.3, "bg-indigo-500"],
  ["technical_score", "Technical & Tagging", 0.2, "bg-emerald-500"],
];
const grade = (n) => (n >= 85 ? "A" : n >= 70 ? "B" : n >= 55 ? "C" : "D");

const RubricInput = ({ k, label, w, bar, form, setForm }) => (
  <div className="rounded-xl border border-slate-200 p-3">
    <div className="flex items-center justify-between text-xs">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="font-mono text-slate-400">{w * 100}%</span>
    </div>
    <div className="mt-2 flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${bar} transition-[width]`} style={{ width: `${form[k] || 0}%` }} /></div>
      <Input data-testid={`input-${k}`} type="number" min={0} max={100} className="h-8 w-20 rounded-lg font-mono" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  </div>
);

const MetaBlock = ({ meta }) => {
  if (!meta) return null;
  const title = meta.oembed?.title || meta.page?.title;
  const desc = meta.page?.full_description || meta.page?.description;
  return (
    <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600" data-testid="block-metadata">
      <summary className="cursor-pointer font-semibold text-slate-700">Metadata yang dibaca AI</summary>
      {title && <p className="mt-2"><b>Judul:</b> {title}</p>}
      {meta.oembed?.author_name && <p><b>Akun:</b> {meta.oembed.author_name}</p>}
      {desc && <p className="mt-1 whitespace-pre-wrap"><b>Deskripsi:</b> {desc.slice(0, 600)}</p>}
      {meta.page?.duration_seconds && <p><b>Durasi:</b> {meta.page.duration_seconds} detik</p>}
      {meta.url_hint && <p><b>Petunjuk URL:</b> {meta.url_hint}</p>}
      {!title && !desc && <p className="mt-2 text-amber-700">Metadata terbatas — penilaian AI berdasarkan konteks URL saja.</p>}
    </details>
  );
};

export const ReviewSheet = ({ id, onClose, onChanged }) => {
  const [s, setS] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/admin/submissions/${id}`).then((r) => {
    setS(r.data);
    setForm({ content_score: r.data.content_score ?? "", delivery_score: r.data.delivery_score ?? "", technical_score: r.data.technical_score ?? "",
      strengths: r.data.strengths || "", weaknesses: r.data.weaknesses || "", teacher_notes: r.data.teacher_notes || "", published: !!r.data.published });
  });
  useEffect(() => { if (id) { setS(null); load(); } }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasScores = RUBRIC.every(([k]) => form[k] !== "" && form[k] !== undefined);
  const preview = hasScores ? Math.round(RUBRIC.reduce((a, [k, , w]) => a + Number(form[k]) * w, 0) * 10) / 10 : null;

  const save = async () => {
    setBusy(true);
    try {
      const body = { strengths: form.strengths, weaknesses: form.weaknesses, teacher_notes: form.teacher_notes, published: form.published };
      if (hasScores) RUBRIC.forEach(([k]) => (body[k] = Number(form[k])));
      await api.patch(`/admin/submissions/${id}`, body);
      toast.success("Perubahan disimpan");
      onChanged();
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const regrade = async () => {
    await api.post(`/admin/submissions/${id}/regrade`);
    toast.success("AI akan menilai ulang di latar belakang");
    onChanged();
    onClose();
  };
  const remove = async () => {
    if (!window.confirm("Hapus pengumpulan ini?")) return;
    await api.delete(`/admin/submissions/${id}`);
    toast.success("Pengumpulan dihapus");
    onChanged();
    onClose();
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent data-testid="sheet-review" className="w-full overflow-y-auto bg-[#FDFBF7] sm:max-w-xl">
        {!s ? <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-amber-600" /> : (
          <div className="space-y-5">
            <SheetHeader className="text-left">
              <div className="flex items-center gap-2"><PlatformBadge platform={s.platform} /><StatusPill status={s.status} /></div>
              <SheetTitle className="font-heading text-2xl font-extrabold">{s.full_name}</SheetTitle>
              <SheetDescription className="font-mono text-xs">Kelas {s.class_name} · Absen {s.attendance_number}</SheetDescription>
              <a href={s.video_url} target="_blank" rel="noreferrer" data-testid="link-review-video" className="inline-flex items-center gap-1 break-all text-xs text-amber-700 hover:underline">{s.video_url} <ExternalLink className="h-3 w-3 shrink-0" /></a>
            </SheetHeader>
            {s.status === "failed" && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700" data-testid="text-ai-error">AI gagal: {s.error}</p>}
            {s.ai && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" data-testid="block-ai-original">
                <Sparkles className="h-4 w-4 shrink-0" /> Draft AI asli: <b className="font-mono">{s.ai.final_score}</b> ({s.ai.grade}) · keyakinan data: {s.ai.data_confidence}
              </div>
            )}
            <MetaBlock meta={s.metadata} />
            <div className="space-y-2">
              {RUBRIC.map(([k, label, w, bar]) => <RubricInput key={k} k={k} label={label} w={w} bar={bar} form={form} setForm={setForm} />)}
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Nilai Akhir</span>
              <span className="flex items-center gap-3"><span className="font-mono text-3xl font-bold" data-testid="text-review-final">{preview ?? "—"}</span>{preview !== null && <GradeBadge grade={grade(preview)} />}</span>
            </div>
            <div className="space-y-2"><Label>Strengths / Kelebihan</Label><Textarea data-testid="textarea-strengths" rows={5} className="rounded-xl bg-white" value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} /></div>
            <div className="space-y-2"><Label>Weaknesses & Suggestions / Kekurangan & Saran</Label><Textarea data-testid="textarea-weaknesses" rows={5} className="rounded-xl bg-white" value={form.weaknesses} onChange={(e) => setForm({ ...form, weaknesses: e.target.value })} /></div>
            <div className="space-y-2"><Label>Catatan Guru (privat)</Label><Textarea data-testid="textarea-teacher-notes" rows={2} className="rounded-xl bg-white" value={form.teacher_notes} onChange={(e) => setForm({ ...form, teacher_notes: e.target.value })} /></div>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <span><span className="block text-sm font-semibold">Publikasikan nilai akhir</span><span className="text-xs text-slate-500">Siswa hanya melihat nilai akhir & grade, bukan catatan AI.</span></span>
              <Switch data-testid="switch-publish-score" checked={form.published} disabled={!hasScores} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            </label>
            <div className="flex flex-wrap gap-2 pb-6">
              <button data-testid="button-save-journal-edit" disabled={busy} onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
              </button>
              <button data-testid="button-retry-ai-grading" onClick={regrade} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Nilai ulang AI</button>
              <button data-testid="button-delete-submission" onClick={remove} className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
