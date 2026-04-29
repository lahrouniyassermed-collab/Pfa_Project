const A = '#e8824a'
const TEXT = '#f5f0e8'

export default function Stepper({ steps, currentStep }) {
  const items = []
  steps.forEach((step, index) => {
    items.push({ type: 'step', ...step })
    if (index < steps.length - 1) {
      items.push({ type: 'connector', id: `c-${step.id}`, prevCompleted: step.id < currentStep })
    }
  })

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-10 mb-6 sm:mb-10">
      {/* Circles + connectors */}
      <div className="flex items-center">
        {items.map((item) => {
          if (item.type === 'connector') {
            return (
              <div
                key={item.id}
                className="flex-1 h-px mx-1 sm:mx-2 relative overflow-hidden"
                style={{ background: 'rgba(245,240,232,0.08)' }}
              >
                <div
                  className="absolute inset-0 transition-all duration-700 ease-out"
                  style={{
                    background: `linear-gradient(to right, ${A}, rgba(232,130,74,0.4))`,
                    transform: `scaleX(${item.prevCompleted ? 1 : 0})`,
                    transformOrigin: 'left',
                  }}
                />
              </div>
            )
          }

          const isActive = item.id === currentStep
          const isCompleted = item.id < currentStep

          return (
            <div
              key={item.id}
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
              style={{
                background: isCompleted
                  ? A
                  : isActive
                  ? `linear-gradient(135deg, ${A}, #f09a6a)`
                  : 'rgba(245,240,232,0.06)',
                border: isActive || isCompleted ? 'none' : '1.5px solid rgba(245,240,232,0.16)',
                color: isActive || isCompleted ? '#0a1408' : 'rgba(245,240,232,0.3)',
                boxShadow: isActive ? `0 0 20px rgba(232,130,74,0.55)` : 'none',
              }}
            >
              {isCompleted ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <polyline points="1.5,6 4.5,9 10.5,2.5" stroke="#0a1408" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="text-[10px] sm:text-xs font-semibold">{item.id}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Labels — masqués sur mobile (le badge "Étape X/5" compense) */}
      <div className="hidden sm:flex items-start mt-2">
        {items.map((item) => {
          if (item.type === 'connector') {
            return <div key={item.id} className="flex-1 mx-1 sm:mx-2" />
          }

          const isActive = item.id === currentStep
          const isCompleted = item.id < currentStep

          return (
            <div key={`label-${item.id}`} className="w-9 flex-shrink-0 flex justify-center">
              <span
                className="text-[9px] tracking-[0.07em] uppercase text-center leading-tight"
                style={{
                  color: isActive ? A : isCompleted ? 'rgba(232,130,74,0.55)' : 'rgba(245,240,232,0.22)',
                  fontFamily: "'Inter', sans-serif",
                  maxWidth: '56px',
                  display: 'block',
                }}
              >
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
