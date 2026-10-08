import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASSES, PLATFORMS, STATUS } from "@/lib/constants";

const F = ({ value, onChange, placeholder, items, testId }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger data-testid={testId} className="h-10 w-full rounded-xl bg-white sm:w-40"><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{placeholder}</SelectItem>
      {items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
    </SelectContent>
  </Select>
);

export const FilterBar = ({ filters, setFilters }) => {
  const set = (k) => (v) => setFilters({ ...filters, [k]: v });
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-[220px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input data-testid="input-search-journal" placeholder="Cari nama siswa…" className="h-10 rounded-xl bg-white pl-9" value={filters.q} onChange={(e) => set("q")(e.target.value)} />
      </div>
      <F testId="filter-class-dropdown" value={filters.class_name} onChange={set("class_name")} placeholder="Semua kelas" items={CLASSES.map((c) => [c, `Kelas ${c}`])} />
      <F testId="filter-platform-dropdown" value={filters.platform} onChange={set("platform")} placeholder="Semua platform" items={Object.entries(PLATFORMS).map(([k, p]) => [k, p.label])} />
      <F testId="filter-status-dropdown" value={filters.status} onChange={set("status")} placeholder="Semua status" items={Object.entries(STATUS).map(([k, s]) => [k, s.label])} />
      <F testId="filter-published-dropdown" value={filters.published} onChange={set("published")} placeholder="Publikasi: semua" items={[["true", "Dipublikasikan"], ["false", "Draft privat"]]} />
    </div>
  );
};
