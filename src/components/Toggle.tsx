export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-[48px] shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#4F7CFF]" : "bg-slate-200 dark:bg-slate-600"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[20px]" : ""
        }`}
      />
    </button>
  );
}
