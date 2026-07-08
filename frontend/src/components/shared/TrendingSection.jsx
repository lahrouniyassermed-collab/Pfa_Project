import { useEffect, useState, useRef } from 'react'
import { getTendances } from '../../services/api'
import TrendingBadge from './TrendingBadge'
import { Flame } from 'lucide-react'

const IMG_FALLBACK = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80'

export default function TrendingSection({ onNutritionClick, onAddToCart, showAdd = false }) {
  const [plats, setPlats] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    getTendances()
      .then(r => setPlats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

    // Refresh toutes les 30 min
    const id = setInterval(() => {
      getTendances().then(r => setPlats(r.data)).catch(() => {})
    }, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  if (loading || plats.length === 0) return null

  return (
    <div className="mb-8">
      {/* Titre */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-black text-gray-900 tracking-tight">Tendances cette semaine</h2>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-orange-200 to-transparent" />
      </div>

      {/* Carrousel horizontal */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 px-4 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {plats.map(plat => (
          <div
            key={plat.id}
            className="relative flex-none w-52 snap-start bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200"
          >
            <TrendingBadge rank={plat.rank} />

            {/* Image */}
            <div className="relative h-32 overflow-hidden">
              <img
                src={plat.image || IMG_FALLBACK}
                alt={plat.nom}
                className="w-full h-full object-cover"
                onError={e => { e.target.src = IMG_FALLBACK }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              {/* Compteur commandes */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                <Flame className="w-3 h-3 text-orange-400" />
                {plat.nb_commandes} cette semaine
              </div>
            </div>

            {/* Infos */}
            <div className="p-3">
              <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">{plat.nom}</p>
              {plat.description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-snug">{plat.description}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="font-black text-gray-900 text-sm">{plat.prix} Dh</span>
                <div className="flex items-center gap-1.5">
                  {plat.vegetarien && <span className="text-xs text-green-600" title="Végétarien">🌿</span>}
                  {onNutritionClick && plat.nutrition && (
                    <button
                      onClick={() => onNutritionClick(plat)}
                      className="text-xs text-green-600 border border-green-200 rounded-full px-2 py-0.5 hover:bg-green-50"
                    >
                      🥗
                    </button>
                  )}
                  {showAdd && onAddToCart && (
                    <button
                      onClick={() => onAddToCart(plat)}
                      className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center hover:bg-gray-700"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
