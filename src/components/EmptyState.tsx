import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <SunIllustration />
      <p className="mt-4 text-[22px] font-bold text-[#1B2340] dark:text-slate-50">{title}</p>
      <p className="mt-1 max-w-[260px] text-[14px] leading-relaxed text-[#8B93A7]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SunIllustration() {
  return (
    <svg width="168" height="140" viewBox="0 0 168 140" fill="none" aria-hidden>
      <ellipse cx="84" cy="118" rx="70" ry="14" fill="#E8EEF8" />
      <path d="M0 118c22-28 44-42 84-42s62 14 84 42" fill="#DDE6F5" />
      <path d="M12 118c18-20 38-32 72-32 34 0 54 12 72 32" fill="#C9D7F0" />
      <circle cx="84" cy="52" r="28" fill="#FFE08A" />
      <circle cx="84" cy="52" r="20" fill="#FFD24A" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 84 + Math.cos(rad) * 36;
        const y1 = 52 + Math.sin(rad) * 36;
        const x2 = 84 + Math.cos(rad) * 46;
        const y2 = 52 + Math.sin(rad) * 46;
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#FFD24A"
            strokeWidth="4"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function TipCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(28,41,72,0.06)] dark:bg-[#1b2238]">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF4D6] text-lg">
        💡
      </span>
      <div>
        <p className="text-sm font-semibold text-[#1B2340] dark:text-slate-50">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[#8B93A7]">{body}</p>
      </div>
    </div>
  );
}
