import React, { useState, useEffect, useRef } from 'react'
import { spinWheel } from '../../services/api'
import confetti from 'canvas-confetti'

const PRIZES_DATA = [
  { name: "20% OFF", emoji: "🎉", color: "#ef4444" },   // Red
  { name: "Repas gratuit", emoji: "🍽️", color: "#3b82f6" }, // Blue
  { name: "Double Points", emoji: "⭐", color: "#8b5cf6" }, // Purple
  { name: "Chef's Table VIP", emoji: "👑", color: "#fbbf24" }, // Gold
  { name: "Boisson offerte", emoji: "🥤", color: "#ec4899" }, // Pink
  { name: "Dessert offert", emoji: "🍰", color: "#06b6d4" }, // Cyan
  { name: "10% OFF", emoji: "🏷️", color: "#f97316" }, // Orange
  { name: "Rejouer", emoji: "🔄", color: "#22c55e" }    // Green
]

export default function SpinWheel({ onWin, points, canSpin, coutSpin }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const canvasRef = useRef(null)
  const rotationRef = useRef(0)
  const requestRef = useRef()
  const [lightPhase, setLightPhase] = useState(0)

  // Draw the wheel
  const drawWheel = (rotation) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 30

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 1. Shadow for depth
    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fill()
    ctx.restore()

    // 2. Draw Segments
    const angleStep = (Math.PI * 2) / PRIZES_DATA.length
    PRIZES_DATA.forEach((prize, i) => {
      const startAngle = rotation + i * angleStep
      const endAngle = startAngle + angleStep

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.fillStyle = prize.color
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 2

      // Draw Text and Emoji
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + angleStep / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 20px sans-serif'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 4
      ctx.fillText(`${prize.emoji} ${prize.name}`, radius - 40, 10)
      ctx.restore()
    })

    // 3. Thick Golden Border
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.lineWidth = 15
    const goldGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    goldGradient.addColorStop(0, '#d4af37')
    goldGradient.addColorStop(0.5, '#f9d71c')
    goldGradient.addColorStop(1, '#aa8a2e')
    ctx.strokeStyle = goldGradient
    ctx.stroke()

    // 4. Decorative Lights on the border
    const lightCount = 24
    for (let i = 0; i < lightCount; i++) {
      const angle = (i * Math.PI * 2) / lightCount
      const lx = centerX + (radius) * Math.cos(angle)
      const ly = centerY + (radius) * Math.sin(angle)
      
      ctx.beginPath()
      ctx.arc(lx, ly, 4, 0, Math.PI * 2)
      
      const isLit = (i + lightPhase) % 2 === 0
      ctx.fillStyle = isLit ? '#fff' : '#444'
      if (isLit) {
        ctx.shadowColor = '#fff'
        ctx.shadowBlur = 10
      } else {
        ctx.shadowBlur = 0
      }
      ctx.fill()
    }
    ctx.shadowBlur = 0

    // 5. Golden Center Button (Spin)
    ctx.beginPath()
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2)
    const btnGradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 50)
    btnGradient.addColorStop(0, '#f9d71c')
    btnGradient.addColorStop(1, '#d4af37')
    ctx.fillStyle = btnGradient
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#aa8a2e'
    ctx.stroke()

    // 3D effect for button
    ctx.beginPath()
    ctx.arc(centerX, centerY, 45, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SPIN', centerX, centerY)

    // 6. Top Indicator (Arrow)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(centerX - 25, 10)
    ctx.lineTo(centerX + 25, 10)
    ctx.lineTo(centerX, 50)
    ctx.closePath()
    ctx.fillStyle = goldGradient
    ctx.fill()
    ctx.strokeStyle = '#aa8a2e'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }

  useEffect(() => {
    drawWheel(rotationRef.current)
  }, [lightPhase])

  // Animation logic
  const animate = (targetRotation, duration, callback) => {
    const startRotation = rotationRef.current
    const startTime = performance.now()

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
    const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Update light phase for blinking effect
      if (Math.floor(elapsed / 100) > lightPhase) {
        setLightPhase(Math.floor(elapsed / 100))
      }

      const easeProgress = progress < 0.2 
        ? progress * 5 * progress // fake acceleration
        : easeOutCubic(progress)

      rotationRef.current = startRotation + (targetRotation - startRotation) * easeProgress
      drawWheel(rotationRef.current)

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(step)
      } else {
        callback()
      }
    }

    requestRef.current = requestAnimationFrame(step)
  }

  async function handleSpin() {
    if (spinning || !canSpin || points < coutSpin) return

    try {
      setSpinning(true)
      const res = await spinWheel()
      const prizeName = res.data.prix.nom
      const prizeIndex = PRIZES_DATA.findIndex(p => p.name === prizeName)
      
      // Calculate target rotation
      // Each segment is 45 degrees. Target is top (which is -PI/2 or 3/2 PI)
      // The segments are drawn starting from 0 (3 o'clock).
      // Prize 0 is at 0-45deg. 
      // To get prize i at the top indicator:
      // Indicator is at 270deg (-90deg).
      // i-th segment is at [i*45, (i+1)*45].
      // We want -(i*45 + 22.5) to be at -90deg.
      
      const segmentAngle = 360 / PRIZES_DATA.length
      const extraRounds = 8
      const prizeOffset = (prizeIndex * segmentAngle) + (segmentAngle / 2)
      // 270 is the top position in canvas arc system (if 0 is right)
      const targetRotationDeg = (extraRounds * 360) + (270 - prizeOffset)
      const targetRotationRad = (targetRotationDeg * Math.PI) / 180

      animate(targetRotationRad, 6000, () => {
        setSpinning(false)
        setResult(res.data.prix)
        setShowModal(true)
        
        // Confetti!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#ef4444', '#3b82f6']
        })

        if (onWin) onWin(res.data)
      })

    } catch (err) {
      alert(err.response?.data?.detail || "Erreur lors du spin")
      setSpinning(false)
    }
  }

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={600} 
          className="w-full h-full cursor-pointer"
          onClick={handleSpin}
        />
        
        {/* Mobile Info Overlay */}
        {!canSpin && !spinning && (
          <div className="absolute inset-0 bg-[#0a1408]/60 flex items-center justify-center rounded-full pointer-events-none p-12 text-center">
             <p className="text-white font-bold text-lg">Prochain spin disponible le mois prochain !</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 bg-white/10 px-6 py-2 rounded-full border border-white/20">
          <span className="text-[#fbbf24] text-xl">💰</span>
          <span className="font-bold text-xl">{points} pts</span>
        </div>

        <button
          onClick={handleSpin}
          disabled={spinning || !canSpin || points < coutSpin}
          className={`px-12 py-4 rounded-full font-black text-xl tracking-widest transition-all shadow-2xl uppercase ${
            spinning || !canSpin || points < coutSpin
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-[#d4af37] to-[#fbbf24] text-[#0a1408] hover:scale-105 active:scale-95 shadow-[#fbbf24]/30'
          }`}
        >
          {spinning ? 'CHANCE EN COURS...' : `SPIN (${coutSpin} pts)`}
        </button>
      </div>

      {/* Premium Result Modal */}
      {showModal && result && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#1a2e1a] to-[#0a1408] rounded-[40px] p-10 text-center border-4 border-[#fbbf24] shadow-[0_0_50px_rgba(251,191,36,0.3)]">
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#fbbf24] rounded-full flex items-center justify-center text-6xl shadow-2xl border-4 border-white">
              {PRIZES_DATA.find(p => p.name === result.nom)?.emoji || '🎉'}
            </div>

            <div className="mt-12 space-y-4">
              <h2 className="text-white text-sm font-bold uppercase tracking-[0.3em]">Félicitations !</h2>
              <h3 className="text-[#fbbf24] text-4xl font-black mb-2">{result.nom}</h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                {result.description}
              </p>
            </div>

            <div className="mt-10 bg-white/5 rounded-2xl p-4 border border-white/10 italic text-sm text-gray-500">
               Retrouvez ce prix dans la section "Mes Gains" de votre dashboard.
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-10 w-full bg-[#fbbf24] hover:bg-[#d4af37] text-[#0a1408] font-black py-4 rounded-2xl transition-colors text-lg"
            >
              MAGNIFIQUE !
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
