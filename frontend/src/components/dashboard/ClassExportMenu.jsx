import { useState } from "react";
import { Users, FileSpreadsheet, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CLASSES } from "@/lib/constants";

export const ClassExportMenu = ({ onExport }) => {
  const [cls, setCls] = useState(CLASSES[0]);
  const [open, setOpen] = useState(false);
  const run = (format) => { onExport(format, cls); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button data-testid="button-export-class" className="flex h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100">
          <Users className="h-4 w-4" /> Rekap Per Kelas
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 rounded-2xl p-4" data-testid="class-export-popover">
        <div>
          <p className="text-sm font-semibold text-slate-900">Ekspor satu kelas</p>
          <p className="text-xs text-slate-500">Untuk dibagikan ke wali kelas</p>
        </div>
        <select data-testid="class-export-select" value={cls} onChange={(e) => setCls(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {CLASSES.map((c) => <option key={c} value={c}>Kelas {c}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <button data-testid="button-export-class-csv" onClick={() => run("csv")} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4" /> CSV</button>
          <button data-testid="button-export-class-excel" onClick={() => run("xlsx")} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
