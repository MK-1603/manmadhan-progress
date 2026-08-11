/**
 * Safe Canonical Formatter for Enums, Statuses, Milestone States and Request Types.
 * Guarantees zero runtime crashes on null, undefined, numeric or malformed strings.
 * Formats "UNDER_REVIEW" -> "Under Review", "IN_PROGRESS" -> "In Progress"
 */
export function formatEnumLabel(val?: string | number | null, fallback = "Unknown"): string {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  if (!str) return fallback;

  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Safe Milestone State Color Badge Class Map
 */
export function getMilestoneStateBadgeClass(state?: string | null): string {
  const norm = (state || "").toUpperCase();
  switch (norm) {
    case "APPROVED":
    case "COMPLETED":
    case "ACTIVE":
      return "bg-[#65C466]/10 text-[#65C466] border border-[#65C466]/20";
    case "AVAILABLE":
    case "IN_PROGRESS":
    case "DRAFT":
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "PLANNING":
      return "bg-[#E3AA18]/10 text-[#E3AA18] border border-[#E3AA18]/20";
    case "CHANGES_REQUESTED":
    case "REJECTED":
    case "CANCELLED":
    case "AT_RISK":
    case "OFF_TRACK":
      return "bg-[#E05252]/10 text-[#E05252] border border-[#E05252]/20";
    case "LOCKED":
    default:
      return "bg-[#242424] text-[#858585] border border-[#292929]";
  }
}
