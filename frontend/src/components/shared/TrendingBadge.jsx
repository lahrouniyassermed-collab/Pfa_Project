export default function TrendingBadge({ rank }) {
  if (rank === 1) return (
    <div className="absolute top-2 left-2 z-10 flex flex-col items-center">
      <div className="relative flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-black px-2 py-1 rounded-full shadow-lg"
           style={{ boxShadow: '0 0 12px rgba(251,191,36,0.6)' }}>
        <span className="text-sm">👑</span>
        <span>#1</span>
      </div>
    </div>
  )

  return (
    <div className="absolute top-2 left-2 z-10">
      <div className="flex flex-col items-center gap-0.5">
        {/* Flamme SVG animée */}
        <svg width="22" height="28" viewBox="0 0 22 28" className="flame-anim" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`fg${rank}`} cx="50%" cy="80%" r="60%">
              <stop offset="0%"   stopColor="#fde68a" />
              <stop offset="40%"  stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>
          </defs>
          <path
            d="M11 1 C11 1 17 7 17 13 C17 16 15 17.5 13.5 16.5 C14.5 14 13 11 11 10 C11 10 13 14 10 16.5 C8.5 17.5 5 16 5 13 C5 9 8 5 11 1Z
               M11 10 C11 10 14 13 12 16 C11.5 17 10.5 17.5 10 17 C10.5 15 9.5 13 8.5 12.5 C9.5 14 9 16.5 11 17 C13 17.5 14.5 15.5 14 13 C13.5 11.5 12 10.5 11 10Z"
            fill={`url(#fg${rank})`}
          />
        </svg>
        <span className="text-white text-[9px] font-bold bg-black/50 rounded px-1 leading-tight backdrop-blur-sm">
          Cette semaine
        </span>
      </div>
      <style>{`
        .flame-anim {
          animation: flicker 1.8s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 6px rgba(249,115,22,0.7));
        }
        @keyframes flicker {
          0%   { transform: scaleX(1)   scaleY(1)    rotate(-1deg); }
          25%  { transform: scaleX(0.96) scaleY(1.04) rotate(1deg);  }
          50%  { transform: scaleX(1.02) scaleY(0.98) rotate(-0.5deg);}
          75%  { transform: scaleX(0.98) scaleY(1.03) rotate(1.5deg);}
          100% { transform: scaleX(1)   scaleY(1)    rotate(0deg);  }
        }
      `}</style>
    </div>
  )
}
