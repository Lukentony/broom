// Storage adapter: Capacitor Filesystem su nativo, localStorage come fallback
// Interfaccia unificata per la persistenza dei dati

export const STORAGE_KEYS = {
  DOC: 'broom_doc_v2',
  SETTINGS: 'broom_settings',
};

/** Adapter basato su localStorage (web) */
class LocalStorageAdapter {
  isNative = false;

  async read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async write(key, data) {
    try {
      localStorage.setItem(key, data);
    } catch (e) {
      console.error('localStorage write error:', e);
    }
  }

  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  }
}

/** Adapter basato su Capacitor Filesystem (nativo) */
class CapacitorStorageAdapter {
  isNative = true;

  async read(key) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const result = await Filesystem.readFile({
        path: `${key}.json`,
        directory: Directory.Data,
      });
      return result.data;
    } catch {
      return null;
    }
  }

  async write(key, data) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.writeFile({
        path: `${key}.json`,
        data,
        directory: Directory.Data,
        encoding: 'utf-8',
      });
    } catch (e) {
      console.error('Capacitor FS write error:', e);
    }
  }

  async remove(key) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.deleteFile({
        path: `${key}.json`,
        directory: Directory.Data,
      });
    } catch { /* ignore */ }
  }
}

let _adapter = null;

/**
 * Verifica se siamo su una piattaforma Capacitor nativa (Android / iOS).
 * Il web plugin di Capacitor esiste in node_modules ma non funziona al di fuori del nativo.
 */
async function isNativePlatform() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Crea e restituisce l'adapter di storage appropriato.
 * Prova Capacitor FS (solo su nativo); altrimenti usa localStorage.
 */
export async function createStorageAdapter() {
  if (_adapter) return _adapter;

  if (await isNativePlatform()) {
    try {
      const mod = await import('@capacitor/filesystem');
      if (mod.Filesystem) {
        _adapter = new CapacitorStorageAdapter();
        return _adapter;
      }
    } catch {
      // Capacitor FS non disponibile anche su nativo
    }
  }

  _adapter = new LocalStorageAdapter();
  return _adapter;
}

/** Restituisce l'adapter già inizializzato */
export function getStorageAdapter() {
  if (!_adapter) {
    throw new Error('StorageAdapter not initialized. Call createStorageAdapter() first.');
  }
  return _adapter;
}

/** Resetta l'adapter (solo per test) */
export function _resetAdapterForTesting() {
  _adapter = null;
}
