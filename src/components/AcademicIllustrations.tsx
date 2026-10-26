import React from 'react';

export const HeroStudyDeskArtwork: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-indigo-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-sm">
      {/* Subtle architectural grid background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* Left: Illustrated A4 Handwritten Study Sheet */}
        <div className="sm:col-span-7 bg-white text-slate-900 rounded-lg p-5 shadow-md border border-slate-200">
          <div className="flex items-center justify-between border-b border-rose-200 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
              <span className="text-xs font-bold tracking-tight text-indigo-950">
                CS-301 · Data Structures &amp; Algorithms
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">Page 04 / 18</span>
          </div>

          {/* Simulated Handwritten & Highlighted Notes SVG */}
          <svg
            viewBox="0 0 360 175"
            className="w-full h-auto"
            role="img"
            aria-label="Illustration of neatly handwritten college notes with diagrams"
          >
            {/* Ruled paper horizontal lines */}
            {[24, 48, 72, 96, 120, 144, 168].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="360"
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
            ))}
            {/* Red margin line */}
            <line x1="34" y1="0" x2="34" y2="175" stroke="#FECDD3" strokeWidth="1.5" />

            {/* Yellow Highlighter Block */}
            <rect x="44" y="8" width="175" height="14" rx="2" fill="#FEF08A" />
            <text
              x="48"
              y="19"
              fill="#1E293B"
              fontSize="10"
              fontWeight="700"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              Theorem 2.4: Dijkstra Shortest Path
            </text>

            {/* Simulated neat handwriting lines */}
            <path
              d="M 46 38 Q 75 34 105 38 T 165 37 T 220 39"
              fill="none"
              stroke="#334155"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 46 62 Q 85 59 125 62 T 195 61"
              fill="none"
              stroke="#475569"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Emerald Highlight Box for Complexity Formula */}
            <rect
              x="44"
              y="78"
              width="155"
              height="34"
              rx="4"
              fill="#ECFDF5"
              stroke="#6EE7B7"
              strokeWidth="1.2"
            />
            <text
              x="54"
              y="93"
              fill="#065F46"
              fontSize="9"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              Time: O((V + E) log V)
            </text>
            <text
              x="54"
              y="106"
              fill="#047857"
              fontSize="8.5"
              fontFamily="JetBrains Mono, monospace"
            >
              Space: O(V) min-priority queue
            </text>

            {/* Right-side Graph Node Diagram */}
            <rect
              x="225"
              y="28"
              width="125"
              height="110"
              rx="6"
              fill="#EEF2FF"
              stroke="#C7D2FE"
              strokeWidth="1.2"
            />
            <line x1="255" y1="55" x2="315" y2="55" stroke="#4F46E5" strokeWidth="1.8" />
            <line x1="255" y1="55" x2="285" y2="105" stroke="#4F46E5" strokeWidth="1.8" />
            <line x1="315" y1="55" x2="285" y2="105" stroke="#6366F1" strokeWidth="1.8" strokeDasharray="3 2" />

            <circle cx="255" cy="55" r="11" fill="#4F46E5" />
            <text x="252" y="58" fill="#FFFFFF" fontSize="8" fontWeight="700">
              A
            </text>

            <circle cx="315" cy="55" r="11" fill="#2563EB" />
            <text x="312" y="58" fill="#FFFFFF" fontSize="8" fontWeight="700">
              B
            </text>

            <circle cx="285" cy="105" r="11" fill="#059669" />
            <text x="282" y="108" fill="#FFFFFF" fontSize="8" fontWeight="700">
              C
            </text>

            <text
              x="245"
              y="130"
              fill="#3730A3"
              fontSize="8"
              fontWeight="600"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              Fig 1.2: Weighted DAG
            </text>

            {/* Bottom summary handwriting */}
            <path
              d="M 46 136 Q 90 133 135 136 T 205 135"
              fill="none"
              stroke="#334155"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M 46 160 Q 110 157 175 160 T 290 159"
              fill="none"
              stroke="#64748B"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Right: Feature Callouts & Visual Stack */}
        <div className="sm:col-span-5 space-y-3.5">
          <div className="rounded-lg bg-white/10 border border-white/15 p-3.5">
            <div className="text-xs font-semibold text-amber-300">
              300 DPI Scanned &amp; Couriered
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              Handwritten &amp; LaTeX Digital Notes
            </div>
            <p className="text-xs text-indigo-100/80 mt-1 leading-relaxed">
              Prepared on ruled or unruled A4 sheets with color-coded diagrams, theorems, and
              worked university examples.
            </p>
          </div>

          <div className="rounded-lg bg-emerald-500/15 border border-emerald-400/30 p-3.5">
            <div className="text-xs font-semibold text-emerald-300">
              Razorpay UPI Verified Checkout
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              Instant Price Estimator &amp; Receipts
            </div>
            <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
              Pay securely via Google Pay, PhonePe, Paytm, or BHIM UPI with cryptographic backend
              verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ServiceCategoryBanner: React.FC<{ slug: string; category: string }> = ({
  slug,
  category,
}) => {
  // Choose distinct color theme and bespoke SVG illustration per service slug
  const getTheme = () => {
    switch (slug) {
      case 'handwritten-notes':
        return {
          bg: 'bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100',
          border: 'border-indigo-100',
          accent: '#4F46E5',
          secondary: '#93C5FD',
          kickerColor: 'text-indigo-700',
          iconType: 'notebook',
        };
      case 'digital-notes-pdfs':
        return {
          bg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100',
          border: 'border-emerald-100',
          accent: '#059669',
          secondary: '#6EE7B7',
          kickerColor: 'text-emerald-700',
          iconType: 'pdf',
        };
      case 'chapter-summaries':
        return {
          bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100',
          border: 'border-amber-100',
          accent: '#D97706',
          secondary: '#FCD34D',
          kickerColor: 'text-amber-800',
          iconType: 'summary',
        };
      case 'topic-wise-notes':
        return {
          bg: 'bg-gradient-to-br from-violet-50 via-purple-50 to-slate-100',
          border: 'border-violet-100',
          accent: '#7C3AED',
          secondary: '#C4B5FD',
          kickerColor: 'text-violet-700',
          iconType: 'flowchart',
        };
      case 'practical-record-writing':
        return {
          bg: 'bg-gradient-to-br from-cyan-50 via-sky-50 to-slate-100',
          border: 'border-cyan-100',
          accent: '#0284C7',
          secondary: '#7DD3FC',
          kickerColor: 'text-sky-700',
          iconType: 'lab',
        };
      case 'assignment-formatting-typing':
        return {
          bg: 'bg-gradient-to-br from-rose-50 via-pink-50 to-slate-100',
          border: 'border-rose-100',
          accent: '#E11D48',
          secondary: '#FDA4AF',
          kickerColor: 'text-rose-700',
          iconType: 'formatting',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100',
          border: 'border-blue-100',
          accent: '#2563EB',
          secondary: '#93C5FD',
          kickerColor: 'text-blue-700',
          iconType: 'roadmap',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`w-full h-36 rounded-lg ${theme.bg} border ${theme.border} p-4 flex items-center justify-between overflow-hidden relative`}
    >
      <div className="z-10 space-y-1 max-w-[55%]">
        <div className={`text-[11px] font-bold tracking-tight ${theme.kickerColor}`}>
          {category}
        </div>
        <div className="text-xs text-slate-600 font-medium leading-snug">
          University syllabus-aligned · Quality reviewed
        </div>
      </div>

      {/* Custom Domain SVG Graphic */}
      <svg
        viewBox="0 0 140 100"
        className="w-32 h-24 shrink-0 drop-shadow-xs"
        aria-hidden="true"
      >
        {theme.iconType === 'notebook' && (
          <g>
            <rect
              x="20"
              y="10"
              width="95"
              height="80"
              rx="6"
              fill="#FFFFFF"
              stroke={theme.accent}
              strokeWidth="2"
            />
            <line x1="36" y1="10" x2="36" y2="90" stroke="#FDA4AF" strokeWidth="1.5" />
            <rect x="44" y="22" width="55" height="8" rx="2" fill="#FEF08A" />
            <line x1="44" y1="40" x2="102" y2="40" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" />
            <line x1="44" y1="54" x2="94" y2="54" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            <line x1="44" y1="68" x2="86" y2="68" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            {[22, 38, 54, 70].map((y) => (
              <circle key={y} cx="20" cy={y} r="3" fill={theme.accent} />
            ))}
          </g>
        )}

        {theme.iconType === 'pdf' && (
          <g>
            <rect
              x="25"
              y="8"
              width="90"
              height="82"
              rx="6"
              fill="#FFFFFF"
              stroke={theme.accent}
              strokeWidth="2"
            />
            <rect x="37" y="20" width="38" height="14" rx="3" fill={theme.accent} />
            <text x="44" y="30" fill="#FFFFFF" fontSize="8" fontWeight="700" fontFamily="monospace">
              PDF
            </text>
            <rect x="37" y="42" width="66" height="6" rx="2" fill={theme.secondary} />
            <rect x="37" y="54" width="52" height="6" rx="2" fill="#E2E8F0" />
            <rect x="37" y="66" width="60" height="12" rx="3" fill="#ECFDF5" stroke={theme.accent} strokeWidth="1" />
          </g>
        )}

        {theme.iconType === 'summary' && (
          <g>
            <rect
              x="22"
              y="12"
              width="96"
              height="76"
              rx="6"
              fill="#FFFFFF"
              stroke={theme.accent}
              strokeWidth="2"
            />
            <circle cx="40" cy="32" r="6" fill={theme.secondary} />
            <line x1="54" y1="32" x2="102" y2="32" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="40" cy="52" r="6" fill={theme.secondary} />
            <line x1="54" y1="52" x2="96" y2="52" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="40" cy="70" r="6" fill={theme.secondary} />
            <line x1="54" y1="70" x2="88" y2="70" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {theme.iconType === 'flowchart' && (
          <g>
            <rect x="45" y="10" width="50" height="22" rx="5" fill={theme.accent} />
            <line x1="70" y1="32" x2="40" y2="58" stroke={theme.accent} strokeWidth="2" />
            <line x1="70" y1="32" x2="100" y2="58" stroke={theme.accent} strokeWidth="2" />
            <rect
              x="16"
              y="58"
              width="48"
              height="24"
              rx="5"
              fill="#FFFFFF"
              stroke={theme.accent}
              strokeWidth="2"
            />
            <rect
              x="76"
              y="58"
              width="48"
              height="24"
              rx="5"
              fill="#FFFFFF"
              stroke={theme.accent}
              strokeWidth="2"
            />
          </g>
        )}

        {theme.iconType === 'lab' && (
          <g>
            <rect
              x="20"
              y="10"
              width="100"
              height="80"
              rx="6"
              fill="#FFFFFF"
              stroke={theme.accent}
              strokeWidth="2"
            />
            {/* Lab Flask / Apparatus schematic */}
            <path
              d="M 48 26 L 48 42 L 34 68 L 68 68 L 54 42 L 54 26 Z"
              fill={theme.secondary}
              stroke={theme.accent}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line x1="78" y1="34" x2="106" y2="34" stroke={theme.accent} strokeWidth="2" />
            <line x1="78" y1="48" x2="106" y2="48" stroke="#64748B" strokeWidth="2" />
            <line x1="78" y1="62" x2="106" y2="62" stroke="#64748B" strokeWidth="2" />
          </g>
        )}

        {theme.iconType === 'formatting' && (
          <g>
            <rect
              x="24"
              y="8"
              width="92"
              height="84"
              rx="5"
              fill="#FFFFFF"
              stroke={theme.accent}
              strokeWidth="2"
            />
            <rect x="36" y="20" width="68" height="8" rx="2" fill={theme.accent} />
            {/* Two-column IEEE/APA layout */}
            <rect x="36" y="36" width="31" height="42" rx="2" fill={theme.secondary} />
            <rect x="73" y="36" width="31" height="42" rx="2" fill="#E2E8F0" />
          </g>
        )}

        {theme.iconType === 'roadmap' && (
          <g>
            <rect
              x="18"
              y="12"
              width="104"
              height="76"
              rx="6"
              fill="#FFFFFF"
              stroke={theme.accent}
              strokeWidth="2"
            />
            <path
              d="M 34 66 L 58 44 L 80 54 L 106 28"
              fill="none"
              stroke={theme.accent}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="34" cy="66" r="4.5" fill={theme.accent} />
            <circle cx="58" cy="44" r="4.5" fill={theme.accent} />
            <circle cx="80" cy="54" r="4.5" fill={theme.accent} />
            <circle cx="106" cy="28" r="5" fill="#059669" />
          </g>
        )}
      </svg>
    </div>
  );
};
