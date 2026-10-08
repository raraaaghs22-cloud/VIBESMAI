export const CLASSES = Array.from({ length: 12 }, (_, i) => `XI ${i + 1}`);

export const PLATFORMS = {
  youtube: { label: "YouTube", cls: "bg-red-600 text-white" },
  tiktok: { label: "TikTok", cls: "bg-slate-900 text-white" },
  instagram: { label: "Instagram", cls: "bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 text-white" },
  facebook: { label: "Facebook", cls: "bg-blue-600 text-white" },
};

const PATTERNS = {
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/i,
  tiktok: /(^|\.)tiktok\.com$/i,
  instagram: /(^|\.)(instagram\.com|instagr\.am)$/i,
  facebook: /(^|\.)(facebook\.com|fb\.watch|fb\.com)$/i,
};

export const detectPlatform = (raw) => {
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return Object.keys(PATTERNS).find((k) => PATTERNS[k].test(url.hostname)) || null;
  } catch {
    return null;
  }
};

export const GRADE_CLS = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-sky-50 text-sky-700 border-sky-200",
  C: "bg-amber-50 text-amber-800 border-amber-200",
  D: "bg-rose-50 text-rose-700 border-rose-200",
  "N/A": "bg-slate-100 text-slate-500 border-slate-200",
};

export const STATUS = {
  pending: { label: "Antre AI", cls: "bg-slate-100 text-slate-600" },
  processing: { label: "AI menilai", cls: "bg-sky-50 text-sky-700" },
  graded: { label: "Draft dinilai", cls: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Gagal", cls: "bg-rose-50 text-rose-700" },
};

export const fmtDate = (iso) =>
  new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
