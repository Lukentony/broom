import { describe, it, expect, beforeEach, vi } from 'vitest';

// Nota: storage.js è importato staticamente da store.test.js, quindi
// vi.resetModules() non garantisce un'istanza fresca tra test.
// Usiamo _resetAdapterForTesting() per resettare lo stato.

describe('Storage Adapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('in ambiente non-nativo (jsdom)', () => {
    beforeEach(() => {
      const { _resetAdapterForTesting } = require('../storage.js');
      _resetAdapterForTesting();
    });

    it('dovrebbe creare un LocalStorageAdapter', async () => {
      const { createStorageAdapter } = await import('../storage.js');
      const adapter = await createStorageAdapter();
      expect(adapter.isNative).toBe(false);
      expect(typeof adapter.read).toBe('function');
      expect(typeof adapter.write).toBe('function');
      expect(typeof adapter.remove).toBe('function');
    });

    it('dovrebbe supportare read/write/remove', async () => {
      const { createStorageAdapter } = await import('../storage.js');
      const adapter = await createStorageAdapter();
      await adapter.write('test_key', 'test_value');
      await expect(adapter.read('test_key')).resolves.toBe('test_value');
      await adapter.remove('test_key');
      await expect(adapter.read('test_key')).resolves.toBeNull();
    });

    it('dovrebbe restituire null per chiavi inesistenti', async () => {
      const { createStorageAdapter } = await import('../storage.js');
      const adapter = await createStorageAdapter();
      await expect(adapter.read('chiave_inesistente')).resolves.toBeNull();
    });

    it('dovrebbe riutilizzare la stessa istanza', async () => {
      const { createStorageAdapter } = await import('../storage.js');
      const a = await createStorageAdapter();
      const b = await createStorageAdapter();
      expect(a).toBe(b);
    });

    it('dovrebbe scrivere su localStorage locale', async () => {
      const { createStorageAdapter } = await import('../storage.js');
      const adapter = await createStorageAdapter();
      await adapter.write('test_local', 'hello');
      expect(localStorage.getItem('test_local')).toBe('hello');
    });

    it('dovrebbe rimuovere da localStorage', async () => {
      const { createStorageAdapter } = await import('../storage.js');
      const adapter = await createStorageAdapter();
      localStorage.setItem('test_remove', 'value');
      await adapter.remove('test_remove');
      expect(localStorage.getItem('test_remove')).toBeNull();
    });
  });

  describe('getStorageAdapter', () => {
    it('dovrebbe lanciare errore se chiamato prima di init', async () => {
      const { getStorageAdapter, _resetAdapterForTesting } = await import('../storage.js');
      _resetAdapterForTesting();
      expect(() => getStorageAdapter()).toThrow('StorageAdapter not initialized');
    });

    it('dovrebbe restituire l\'adapter dopo init', async () => {
      const mod = await import('../storage.js');
      mod._resetAdapterForTesting();
      await mod.createStorageAdapter();
      expect(() => mod.getStorageAdapter()).not.toThrow();
      expect(mod.getStorageAdapter()).toBeDefined();
    });
  });

  describe('STORAGE_KEYS', () => {
    it('dovrebbe esportare le chiavi', async () => {
      const { STORAGE_KEYS } = await import('../storage.js');
      expect(STORAGE_KEYS).toHaveProperty('DOC');
      expect(STORAGE_KEYS).toHaveProperty('SETTINGS');
    });
  });
});
