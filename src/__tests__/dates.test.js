import { describe, it, expect } from 'vitest';
import { todayISO, nowISO } from '../helpers/dates';

describe('dates helper', () => {
  it('should export todayISO function', () => {
    expect(typeof todayISO).toBe('function');
  });

  it('should export nowISO function', () => {
    expect(typeof nowISO).toBe('function');
  });

  it('todayISO should return YYYY-MM-DD format', () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('todayISO should match current local date', () => {
    const result = todayISO();
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    expect(result).toBe(`${y}-${m}-${day}`);
  });

  it('nowISO should return ISO string with time', () => {
    const result = nowISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('nowISO should return valid ISO timestamp', () => {
    const result = nowISO();
    const parsed = new Date(result);
    expect(parsed.toISOString()).toBe(result);
  });
})
