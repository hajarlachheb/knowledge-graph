"use client";

interface KnowlediaLogoProps {
  /** Icon only (no wordmark). Good for collapsed sidebar or favicon. */
  iconOnly?: boolean;
  /** Size: "sm" (sidebar), "md" (mobile header), "lg" (landing). */
  size?: "sm" | "md" | "lg";
  /** Use white fill for dark backgrounds (e.g. landing left panel). */
  variant?: "default" | "light";
  className?: string;
}

const sizeMap = {
  sm: { icon: 32, text: "text-[15px]" },
  md: { icon: 28, text: "text-xl" },
  lg: { icon: 32, text: "text-2xl" },
};

export default function KnowlediaLogo({
  iconOnly = false,
  size = "sm",
  variant = "default",
  className = "",
}: KnowlediaLogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size];
  const isLight = variant === "light";
  const iconColor = isLight ? "currentColor" : "#4f46e5"; // brand-600 fallback if not using Tailwind in SVG
  const textClass = isLight ? "text-white" : "text-gray-900";

  return (
    <span
      className={`inline-flex items-center gap-2 shrink-0 ${className}`}
      aria-label="Knowledia"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={isLight ? "text-white" : "text-brand-600"}
        aria-hidden
      >
        {/* Lightbulb (idea / knowledge) */}
        <path
          d="M16 6a6 6 0 0 1 4.5 10 4 4 0 0 1 1.5 3v2a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-2a4 4 0 0 1 1.5-3A6 6 0 0 1 16 6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M14 22v2h4v-2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 26h8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Highlight */}
        <path
          d="M16 8a4 4 0 0 0-2.8 1.2"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity={isLight ? 0.6 : 0.4}
        />
      </svg>
      {!iconOnly && (
        <span className={`font-semibold tracking-tight ${textSize} ${textClass}`}>
          Knowledia
        </span>
      )}
    </span>
  );
}
