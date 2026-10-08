import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { DashHeader } from "@/components/dashboard/DashHeader";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Toolbar } from "@/components/dashboard/Toolbar";
import { JournalTable } from "@/components/dashboard/JournalTable";
import { ReviewSheet } from "@/components/dashboard/ReviewSheet";

const INIT = { q: "", class_name: "all", platform: "all", status: "all", published: "all" };

export default function Dashboard({ user }) {
  const [filters, setFilters] = useState(INIT);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [resultsPublic, setRP] = useState(false);
  const [selected, setSelected] = useState([]);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== "all"));
    const [r, st] = await Promise.all([api.get("/admin/submissions", { params }), api.get("/admin/stats")]);
    setRows(r.data);
    setStats(st.data);
  }, [filters]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get("/admin/settings").then((r) => setRP(r.data.results_public)); }, []);
  useEffect(() => {
    if (!rows.some((r) => ["pending", "processing"].includes(r.status))) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [rows, load]);

  const toggleRP = async (v) => {
    setRP(v);
    await api.put("/admin/settings", { results_public: v });
    toast.success(v ? "Halaman nilai dibuka untuk siswa" : "Halaman nilai ditutup");
  };
  const bulk = async (published) => {
    try {
      const r = await api.post("/admin/publish", { ids: selected, published });
      toast.success(`${r.data.updated} pengumpulan diperbarui`);
      setSelected([]);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <DashHeader user={user} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="fade-up">
          <span className="overline">Creative Video Project · Musik di Sekitar Kita</span>
          <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Jurnal Pengumpulan 12 Kelas</h1>
        </div>
        <StatsRow stats={stats} />
        <Toolbar resultsPublic={resultsPublic} setResultsPublic={toggleRP} selected={selected} onBulk={bulk} />
        <FilterBar filters={filters} setFilters={setFilters} />
        <JournalTable rows={rows} selected={selected} setSelected={setSelected} onOpen={setOpenId} />
      </main>
      <ReviewSheet id={openId} onClose={() => setOpenId(null)} onChanged={load} />
    </div>
  );
}
