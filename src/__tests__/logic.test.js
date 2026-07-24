import { describe, it, expect } from 'vitest';
import { calculatePoints, calculateOverduePenalty } from '../logic/scoring.js';
import { determineNextPerformer } from '../logic/assignment.js';
import {
  calculateNextDate,
  nextDueFromRecurrence,
  computeVacationShift,
  nextDateForWeekdays,
  expandOccurrences,
  recurrenceLabel,
} from '../logic/scheduling.js';
import { generateIdempotencyKey } from '../logic/idempotency.js';

describe('scoring.js — calculatePoints', () => {
  it('should award positive points for on-time completion', () => {
    const result = calculatePoints(3, 'FIXED_A', 0, 10);
    expect(result.points).toBe(30);
    expect(result.isShared).toBe(false);
  });

  it('should award 1 point for 1 day overdue', () => {
    const result = calculatePoints(3, 'FIXED_A', 1, 10);
    expect(result.points).toBe(1);
  });

  it('should award negative points for >1 day overdue', () => {
    const result = calculatePoints(3, 'FIXED_A', 3, 10);
    expect(result.points).toBe(-30);
  });

  it('should split points for TOGETHER tasks', () => {
    const result = calculatePoints(3, 'TOGETHER', 0, 10, true);
    expect(result.points).toBe(15);
    expect(result.isShared).toBe(true);
  });

  it('should return full points for shared when split_shared=false', () => {
    const result = calculatePoints(3, 'TOGETHER', 0, 10, false);
    expect(result.points).toBe(30);
    expect(result.isShared).toBe(true);
  });

  it('should floor negative points division for shared', () => {
    // -30 / 2 = -15
    const result = calculatePoints(3, 'TOGETHER', 3, 10, true);
    expect(result.points).toBe(-15);
    expect(result.isShared).toBe(true);
  });

  it('should use custom base multiplier', () => {
    const result = calculatePoints(2, 'FIXED_A', 0, 20);
    expect(result.points).toBe(40);
  });

  it('should ensure minimum 1 point for positive shared', () => {
    const result = calculatePoints(1, 'TOGETHER', 0, 1, true);
    // 1 * 1 = 1, Math.max(1, 1 // 2) = max(1, 0) = 1
    expect(result.points).toBe(1);
    expect(result.isShared).toBe(true);
  });
});

describe('scoring.js — calculateOverduePenalty', () => {
  it('should return a 1-point penalty at exactly 1 day overdue', () => {
    expect(calculateOverduePenalty(3, 1)).toBe(1);
  });

  it('should return difficulty*base penalty at exactly 3 days overdue', () => {
    expect(calculateOverduePenalty(3, 3, 10)).toBe(30);
  });

  it('should return 0 for delays other than 1 or 3', () => {
    expect(calculateOverduePenalty(3, 0)).toBe(0);
    expect(calculateOverduePenalty(3, 2)).toBe(0);
    expect(calculateOverduePenalty(3, 5)).toBe(0);
  });
});

describe('assignment.js — determineNextPerformer', () => {
  const userA = 1;
  const userB = 2;

  it('should return fixed A', () => {
    expect(determineNextPerformer('FIXED_A', null, userA, userB)).toBe(userA);
  });

  it('should return fixed B', () => {
    expect(determineNextPerformer('FIXED_B', null, userA, userB)).toBe(userB);
  });

  it('should return fixed user', () => {
    expect(determineNextPerformer('FIXED_USER', null, userA, userB, 3)).toBe(3);
  });

  it('should return null for TOGETHER', () => {
    expect(determineNextPerformer('TOGETHER', null, userA, userB)).toBeNull();
  });

  it('should return null for ANY', () => {
    expect(determineNextPerformer('ANY', null, userA, userB)).toBeNull();
  });

  it('should start with user A for alternating (no history)', () => {
    expect(determineNextPerformer('ALTERNATING', null, userA, userB)).toBe(userA);
  });

  it('should alternate after first performer', () => {
    expect(determineNextPerformer('ALTERNATING', userA, userA, userB)).toBe(userB);
    expect(determineNextPerformer('ALTERNATING', userB, userA, userB)).toBe(userA);
  });
});

describe('scheduling.js', () => {
  it('should calculate next date', () => {
    const result = calculateNextDate('2026-07-01', 7);
    expect(result).toBe('2026-07-08');
  });

  it('should handle end of month', () => {
    const result = calculateNextDate('2026-01-31', 1);
    expect(result).toBe('2026-02-01');
  });

  it('should calculate next due from recurrence using task', () => {
    const task = { frequency_days: 14 };
    const result = nextDueFromRecurrence(task, '2026-07-01');
    expect(result).toBe('2026-07-15');
  });

  it('should compute vacation shift', () => {
    expect(computeVacationShift(5)).toBe(5);
    expect(computeVacationShift(0)).toBe(0);
    expect(computeVacationShift(-1)).toBe(0);
  });

  it('should find the next date matching a weekday, never the same day', () => {
    const base = '2026-07-01';
    const baseDow = new Date(base).getDay();
    const result = nextDateForWeekdays(base, [baseDow]);
    expect(result).not.toBe(base);
    expect(new Date(result).getDay()).toBe(baseDow);
    const diffDays = (new Date(result) - new Date(base)) / 86400000;
    expect(diffDays).toBe(7);
  });

  it('should find the closest matching weekday within the next 7 days', () => {
    const base = '2026-07-01';
    const baseDow = new Date(base).getDay();
    const targetDow = (baseDow + 2) % 7;
    const result = nextDateForWeekdays(base, [targetDow]);
    expect(new Date(result).getDay()).toBe(targetDow);
    const diffDays = (new Date(result) - new Date(base)) / 86400000;
    expect(diffDays).toBeGreaterThan(0);
    expect(diffDays).toBeLessThanOrEqual(7);
  });

  it('should use recurrence_days over frequency_days when both are present', () => {
    const base = '2026-07-01';
    const baseDow = new Date(base).getDay();
    const task = { frequency_days: 30, recurrence_days: [baseDow] };
    const result = nextDueFromRecurrence(task, base);
    expect(new Date(result).getDay()).toBe(baseDow);
    const diffDays = (new Date(result) - new Date(base)) / 86400000;
    expect(diffDays).toBe(7);
  });

  it('should expand interval-based recurrence into multiple future dates', () => {
    const task = { next_due_date: '2026-07-01', frequency_days: 7 };
    const dates = expandOccurrences(task, { maxCount: 4 });
    expect(dates).toEqual(['2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22']);
  });

  it('should not expand a one-off task beyond its single date', () => {
    const task = { next_due_date: '2026-07-01', frequency_days: 0 };
    const dates = expandOccurrences(task);
    expect(dates).toEqual(['2026-07-01']);
  });

  it('should stop expanding at maxDate', () => {
    const task = { next_due_date: '2026-07-01', frequency_days: 7 };
    const dates = expandOccurrences(task, { maxDate: '2026-07-20', maxCount: 100 });
    expect(dates).toEqual(['2026-07-01', '2026-07-08', '2026-07-15']);
  });

  it('should label interval-based recurrence', () => {
    expect(recurrenceLabel({ frequency_days: 7 })).toBe('ogni 7g');
    expect(recurrenceLabel({ frequency_days: 0 })).toBe('una tantum');
  });

  it('should label weekday-based recurrence sorted', () => {
    expect(recurrenceLabel({ recurrence_days: [3, 1] })).toBe('Lun, Mer');
  });
});

describe('idempotency.js', () => {
  it('should generate a key with task-user format for non-shared', () => {
    const key = generateIdempotencyKey(1, 2, 'FIXED_A');
    expect(key).toMatch(/^task-1-user-2-/);
  });

  it('should generate a key with together format for TOGETHER', () => {
    const key = generateIdempotencyKey(1, 2, 'TOGETHER');
    expect(key).toMatch(/^together-1-/);
  });

  it('should produce deterministic keys within the same time window', () => {
    const a = generateIdempotencyKey(1, 2, 'FIXED_A');
    const b = generateIdempotencyKey(1, 2, 'FIXED_A');
    expect(a).toBe(b);
  });

  it('should produce different keys for different tasks', () => {
    const a = generateIdempotencyKey(1, 2, 'FIXED_A');
    const b = generateIdempotencyKey(2, 2, 'FIXED_A');
    expect(a).not.toBe(b);
  });
});
