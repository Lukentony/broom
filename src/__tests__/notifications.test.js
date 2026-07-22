import { describe, it, expect, vi } from 'vitest';

describe('Servizio Notifiche', () => {
  // In ambiente non-nativo (jsdom), @capacitor/local-notifications non funziona.
  // Tutti i metodi del servizio no-op silenziosamente.

  it('requestPermissions restituisce false', async () => {
    const mod = await import('../services/notifications.js');
    await expect(mod.requestPermissions()).resolves.toBe(false);
  });

  it('scheduleMorningReminder non lancia eccezioni', async () => {
    const mod = await import('../services/notifications.js');
    await expect(mod.scheduleMorningReminder(3)).resolves.toBeUndefined();
  });

  it('scheduleMorningReminder con 0 non lancia eccezioni', async () => {
    const mod = await import('../services/notifications.js');
    await expect(mod.scheduleMorningReminder(0)).resolves.toBeUndefined();
  });

  it('scheduleEveningSummary non lancia eccezioni', async () => {
    const mod = await import('../services/notifications.js');
    await expect(mod.scheduleEveningSummary(5, 150)).resolves.toBeUndefined();
  });

  it('scheduleEveningSummary con 0 non lancia eccezioni', async () => {
    const mod = await import('../services/notifications.js');
    await expect(mod.scheduleEveningSummary(0, 0)).resolves.toBeUndefined();
  });

  it('cancelAll non lancia eccezioni', async () => {
    const mod = await import('../services/notifications.js');
    await expect(mod.cancelAll()).resolves.toBeUndefined();
  });

  it('cancelMorning non lancia eccezioni', async () => {
    const mod = await import('../services/notifications.js');
    await expect(mod.cancelMorning()).resolves.toBeUndefined();
  });

  it('cancelEvening non lancia eccezioni', async () => {
    const mod = await import('../services/notifications.js');
    await expect(mod.cancelEvening()).resolves.toBeUndefined();
  });

  it('updateNotifications non lancia eccezioni con mock store', async () => {
    const mod = await import('../services/notifications.js');
    const mockStore = {
      getTasks: vi.fn().mockResolvedValue([]),
      getHistory: vi.fn().mockResolvedValue([]),
    };
    await expect(mod.updateNotifications(mockStore)).resolves.toBeUndefined();
  });

  it('updateNotifications non chiama store methods in ambiente non-nativo', async () => {
    const mod = await import('../services/notifications.js');
    const mockStore = {
      getTasks: vi.fn().mockResolvedValue([
        { id: 1, name: 'Test task', next_due_date: '2025-01-01', is_active: true },
      ]),
      getHistory: vi.fn().mockResolvedValue([
        { completed_at: '2025-01-01T10:00:00', points_awarded: 30 },
      ]),
    };
    await mod.updateNotifications(mockStore);
    // In ambiente non-nativo, ensureInit() fallisce, quindi i metodi store
    // non vengono chiamati. Il comportamento è atteso: no-op silenzioso.
    expect(mockStore.getTasks).not.toHaveBeenCalled();
    expect(mockStore.getHistory).not.toHaveBeenCalled();
  });
});
