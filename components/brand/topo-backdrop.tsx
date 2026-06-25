/**
 * TopoBackdrop — the PMO++ brand signature: subtle topographic contour
 * lines, evoking the Survey of Israel's mapping identity. Decorative only
 * (aria-hidden). Drop it inside a `relative overflow-hidden` container; it
 * fills the parent behind the content. Uses the `.topo-line` token so the
 * stroke adapts to light/dark and the brand hue.
 */
export function TopoBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
    >
      <g className="topo-line" strokeWidth={1.5}>
        <path d="M-20 30 C 70 -5, 150 60, 230 20 S 380 50, 420 10" />
        <path d="M-20 62 C 70 27, 150 92, 230 52 S 380 82, 420 42" />
        <path d="M-20 94 C 70 59, 150 124, 230 84 S 380 114, 420 74" />
        <path d="M-20 126 C 70 91, 150 156, 230 116 S 380 146, 420 106" />
        <path d="M-20 158 C 70 123, 150 188, 230 148 S 380 178, 420 138" />
        <path d="M-20 190 C 70 155, 150 220, 230 180 S 380 210, 420 170" />
        <path d="M-20 222 C 70 187, 150 252, 230 212 S 380 242, 420 202" />
      </g>
    </svg>
  );
}
