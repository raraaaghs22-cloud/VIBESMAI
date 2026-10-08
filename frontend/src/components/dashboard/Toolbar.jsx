import { FileSpreadsheet, FileText, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { api, errMsg } from "@/lib/api";

import { ClassExportMenu } from "./ClassExportMenu";

const download = async (format, class_name) => {
  try {
    const r = await api.get("/admin/export", { params: { format, ...(class_name && { class_name }) }, responseType: "blob" });
    const name = (r.headers["content-disposition"] || "").match(/filename="(.+)"/)?.[1] || `rekap.${format}`;
    const url = URL.createObjectURL(r.data);
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
    toast.success(class_name ? `Rekap Kelas ${class_name} diunduh` : "Rekap semua kelas diunduh");
  } catch (e) { toast.error(errMsg(e, "Ekspor gagal")); }
};

const Btn = ({ testId, onClick, children, dark }) => (
  <button data-testid={testId} onClick={onClick} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${dark ? "bg-slate-900 text-white hover:bg-slate-700" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>
);

export const Toolbar = ({ resultsPublic, setResultsPublic, selected, onBulk }) => (
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
      <Switch data-testid="switch-toggle-results-public" checked={resultsPublic} onCheckedChange={setResultsPublic} />
      <span className="text-sm"><b>Halaman nilai siswa (/results)</b> <span className="text-slate-500">{resultsPublic ? "dibuka untuk siswa" : "ditutup"}</span></span>
    </label>
    <div className="flex flex-wrap gap-2">
      {selected.length > 0 && (
        <>
          <Btn testId="button-bulk-publish" onClick={() => onBulk(true)}><Eye className="h-4 w-4" /> Publikasikan ({selected.length})</Btn>
          <Btn testId="button-bulk-unpublish" onClick={() => onBulk(false)}><EyeOff className="h-4 w-4" /> Jadikan draft</Btn>
        </>
      )}
      <ClassExportMenu onExport={download} />
      <Btn testId="button-export-csv" onClick={() => download("csv")}><FileText className="h-4 w-4" /> Export CSV</Btn>
      <Btn testId="button-export-excel" dark onClick={() => download("xlsx")}><FileSpreadsheet className="h-4 w-4" /> Export Excel</Btn>
    </div>
  </div>
);
