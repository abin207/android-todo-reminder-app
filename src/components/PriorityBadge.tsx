import { PRIORITY_META, type Priority } from "@/types/task";

/**
 * Priority indicator. Colour is never the only signal: the priority word is
 * always present for accessibility.
 */
export function PriorityBadge({
  priority,
  size = "sm",
}: {
  priority: Priority;
  size?: "sm" | "md";
}) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
      } ${meta.chip}`}
    >
      {meta.label}
    </span>
  );
}
