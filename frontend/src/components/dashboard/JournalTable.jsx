import { Eye, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadge, GradeBadge, StatusPill } from "@/components/Badges";
import { fmtDate } from "@/lib/constants";

const Row = ({ s, selected, toggle, onOpen }) => (
  <tr data-testid={`row-submission-${s.id}`} className="border-t border-slate-100 transition-colors hover:bg-amber-50/40">
    <td className="px-4 py-3"><Checkbox data-testid={`checkbox-select-${s.id}`} checked={selected} onCheckedChange={() => toggle(s.id)} /></td>
    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.class_name}<span className="text-slate-300"> / </span>{String(s.attendance_number).padStart(2, "0")}</td>
    <td className="px-4 py-3">
      <p className="font-semibold text-slate-900">{s.full_name}</p>
      <p className="text-xs text-slate-400">{fmtDate(s.submitted_at)}</p>
    </td>
    <td className="px-4 py-3">
      <a href={s.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5" data-testid={`link-video-${s.id}`}>
        <PlatformBadge platform={s.platform} /> <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
      </a>
    </td>
    <td className="px-4 py-3"><StatusPill status={s.status} testId={`status-${s.id}`} /></td>
    <td className="px-4 py-3 font-mono font-bold text-slate-900" data-testid={`score-${s.id}`}>{s.final_score ?? "—"}</td>
    <td className="px-4 py-3"><GradeBadge grade={s.grade} /></td>
    <td className="px-4 py-3">
      {s.published ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">Publik</span> : <span className="text-xs text-slate-400">Draft privat</span>}
      {s.manually_edited && <span className="ml-1.5 text-[10px] font-bold uppercase text-slate-400">edit</span>}
    </td>
    <td className="px-4 py-3 text-right">
      <button data-testid={`button-review-ai-submission-${s.id}`} onClick={() => onOpen(s.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700">
        <Eye className="h-3.5 w-3.5" /> Tinjau
      </button>
    </td>
  </tr>
);

export const JournalTable = ({ rows, selected, setSelected, onOpen }) => {
  const toggle = (id) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const allOn = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table data-testid="table-teacher-journal" className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <tr>
            <th className="px-4 py-3"><Checkbox data-testid="checkbox-select-all" checked={allOn} onCheckedChange={() => setSelected(allOn ? [] : rows.map((r) => r.id))} /></th>
            <th className="px-4 py-3">Kelas/Absen</th>
            <th className="px-4 py-3">Siswa</th>
            <th className="px-4 py-3">Video</th>
            <th className="px-4 py-3">Status AI</th>
            <th className="px-4 py-3">Nilai</th>
            <th className="px-4 py-3">Grade</th>
            <th className="px-4 py-3">Publikasi</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => <Row key={s.id} s={s} selected={selected.includes(s.id)} toggle={toggle} onOpen={onOpen} />)}
          {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400" data-testid="text-journal-empty">Belum ada pengumpulan.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};
