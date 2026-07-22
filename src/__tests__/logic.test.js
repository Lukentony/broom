import { describe, it, expect } from 'vitest';
import { calculatePoints } from '../logic/scoring.js';
import { determineNextPerformer } from '../logic/assignment.js';
import { calculateNextDate, nextDueFromRecurrence, computeVacationShift } from '../logic/scheduling.js';
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
