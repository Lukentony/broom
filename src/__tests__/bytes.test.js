import { describe, it, expect } from 'vitest';
import { bytesToBase64, base64ToBytes } from '../helpers/bytes.js';

describe('helpers/bytes.js', () => {
  it('should round-trip a small byte array', () => {
    const original = new Uint8Array([0, 1, 2, 255, 128, 42]);
    const base64 = bytesToBase64(original);
    const decoded = base64ToBytes(base64);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('should round-trip an empty array', () => {
    const original = new Uint8Array([]);
    expect(Array.from(base64ToBytes(bytesToBase64(original)))).toEqual([]);
  });

  it('should round-trip an array larger than the internal chunk size (0x8000)', () => {
    const original = new Uint8Array(0x8000 * 2 + 137);
    for (let i = 0; i < original.length; i++) original[i] = i % 256;
    const decoded = base64ToBytes(bytesToBase64(original));
    expect(decoded.length).toBe(original.length);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});
