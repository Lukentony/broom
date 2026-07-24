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

  // Il backup su storage pubblico ha senso solo su nativo (Android cancella
  // i dati app-privati alla disinstallazione, il web no ha un equivalente
  // significativo senza un download esplicito dell'utente).
  async writeBackup() { /* no-op sul web */ }
  async readBackup() { return null; }
  async readBackupMeta() { return null; }
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

  // Backup su Directory.Documents (storage pubblico dell'app): a differenza
  // di Directory.Data usato sopra, NON viene cancellato alla disinstallazione
  // dell'app — è la base del backup automatico (PIANO_BROOM_V1_10.md, punto B).
  async writeBackup(bytes) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { bytesToBase64 } = await import('./helpers/bytes.js');
      await Filesystem.mkdir({ path: 'Broom', directory: Directory.Documents, recursive: true }).catch(() => {});
      await Filesystem.writeFile({
        path: 'Broom/backup.automerge',
        data: bytesToBase64(bytes),
        directory: Directory.Documents,
      });
    } catch (e) {
      console.warn('Backup write error:', e);
    }
  }

  async readBackup() {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { base64ToBytes } = await import('./helpers/bytes.js');
      const result = await Filesystem.readFile({
        path: 'Broom/backup.automerge',
        directory: Directory.Documents,
      });
      return base64ToBytes(result.data);
    } catch {
      return null;
    }
  }

  async readBackupMeta() {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const stat = await Filesystem.stat({ path: 'Broom/backup.automerge', directory: Directory.Documents });
      return { mtime: stat.mtime };
    } catch {
      return null;
    }
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
