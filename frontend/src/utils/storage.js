/**
 * Safe storage — survives Edge / Firefox Tracking Prevention.
 * Tries localStorage → sessionStorage → in-memory singleton.
 * All modules share the same _mem object via this module.
 */
const _mem = {}

export function storageSave(key, value) {
  try { localStorage.setItem(key, value); return } catch {}
  try { sessionStorage.setItem(key, value); return } catch {}
  _mem[key] = value
}

export function storageGet(key) {
  try { const v = localStorage.getItem(key); if (v !== null) return v } catch {}
  try { const v = sessionStorage.getItem(key); if (v !== null) return v } catch {}
  return _mem[key] ?? null
}

export function storageRemove(key) {
  try { localStorage.removeItem(key) } catch {}
  try { sessionStorage.removeItem(key) } catch {}
  delete _mem[key]
}
