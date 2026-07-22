import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../store';

describe('Store Module', () => {
  beforeEach(() => {
    const keys = Object.keys(localStorage);
    keys.forEach(k => localStorage.removeItem(k));
    return store._reload();
  });

  it('should have getTasks method', () => {
    expect(typeof store.getTasks).toBe('function');
  });

  it('should have completeTask method', () => {
    expect(typeof store.completeTask).toBe('function');
  });

  it('should have getStats method', () => {
    expect(typeof store.getStats).toBe('function');
  });

  it('should have toggleVacation method', () => {
    expect(typeof store.toggleVacation).toBe('function');
  });

  it('getTasks returns a promise resolving to an array', async () => {
    const result = await store.getTasks();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getStats returns a promise resolving to leaderboard object', async () => {
    const result = await store.getStats();
    expect(result).toHaveProperty('leaderboard');
  });
});
