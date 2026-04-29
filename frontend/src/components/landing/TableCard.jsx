const statutLabels = { libre: 'Disponible', occupee: 'Occupée', reservee: 'Réservée' }
const emplacementLabels = { interieur: 'Intérieur', terrasse: 'Terrasse', mezzanine: 'Mezzanine' }

export default function TableCard({ table, onReserver }) {
  if (!table) return null
  return (
    <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-none min-w-[220px]">
      <p className="text-[#d4a853] text-xs tracking-widest uppercase mb-4">Table {table.numero}</p>
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-white/40">Zone</span>
          <span className="text-white/80">{emplacementLabels[table.emplacement]}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/40">Couverts</span>
          <span className="text-white/80">{table.capacite} personnes</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/40">Statut</span>
          <span
            className={`text-sm font-medium ${
              table.statut === 'libre' ? 'text-emerald-400' :
              table.statut === 'occupee' ? 'text-red-400' : 'text-amber-400'
            }`}
          >
            {statutLabels[table.statut]}
          </span>
        </div>
      </div>
      {table.statut === 'libre' ? (
        <button
          onClick={() => onReserver(table)}
          className="w-full py-3 bg-[#d4a853] text-[#0f0f0f] text-xs tracking-widest uppercase font-semibold hover:bg-[#e6bb6a] transition-colors duration-200"
        >
          Réserver cette table
        </button>
      ) : (
        <div className="w-full py-3 border border-white/10 text-white/30 text-xs tracking-widest uppercase text-center">
          Non disponible
        </div>
      )}
    </div>
  )
}
