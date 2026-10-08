const Stat = ({ label, value, accent, testId }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p data-testid={testId} className={`mt-2 font-mono text-3xl font-bold ${accent}`}>{value ?? "—"}</p>
  </div>
);

export const StatsRow = ({ stats }) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
    <Stat label="Total Kiriman" value={stats?.total} accent="text-slate-900" testId="stat-total" />
    <Stat label="Dinilai AI" value={stats?.graded} accent="text-emerald-700" testId="stat-graded" />
    <Stat label="Antre / Proses" value={stats?.pending} accent="text-sky-700" testId="stat-pending" />
    <Stat label="Dipublikasikan" value={stats?.published} accent="text-amber-700" testId="stat-published" />
    <Stat label="Rata-rata" value={stats?.avg_score} accent="text-slate-900" testId="stat-avg" />
  </div>
);
