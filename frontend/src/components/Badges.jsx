import { PLATFORMS, GRADE_CLS, STATUS } from "@/lib/constants";

export const PlatformBadge = ({ platform, testId }) => {
  const p = PLATFORMS[platform];
  if (!p) return null;
  return (
    <span data-testid={testId} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.cls}`}>
      {p.label}
    </span>
  );
};

export const GradeBadge = ({ grade, testId }) =>
  grade ? (
    <span data-testid={testId} className={`inline-flex h-7 min-w-7 items-center px-1 justify-center rounded-lg border font-mono text-sm font-bold ${GRADE_CLS[grade]}`}>
      {grade}
    </span>
  ) : (
    <span className="text-slate-300">—</span>
  );

export const StatusPill = ({ status, testId }) => {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {status === "processing" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />}
      {s.label}
    </span>
  );
};
