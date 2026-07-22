import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../api';

describe('API Module', () => {
  beforeEach(() => {
    // Mock localStorage
    const store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
      }
    });
  });

  it('should have getTasks method', () => {
    expect(typeof api.getTasks).toBe('function');
  });

  it('should have completeTask method', () => {
    expect(typeof api.completeTask).toBe('function');
  });

  it('should have getStats method', () => {
    expect(typeof api.getStats).toBe('function');
  });

  it('should have toggleVacation method', () => {
    expect(typeof api.toggleVacation).toBe('function');
  });
});
