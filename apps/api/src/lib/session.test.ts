import { describe, expect, it } from 'vitest';
import { signUserId, verifySessionCookie } from './session.js';

describe('signUserId / verifySessionCookie', () => {
  it('roundtrips a userId', () => {
    const cookie = signUserId('user-123');
    expect(verifySessionCookie(cookie)).toBe('user-123');
  });

  it('produces a value of the form "<userId>.<hex-signature>"', () => {
    const cookie = signUserId('user-123');
    const [payload, sig] = cookie.split('.');
    expect(payload).toBe('user-123');
    expect(sig).toMatch(/^[0-9a-f]+$/);
  });

  it('produces the same signature for the same userId (deterministic)', () => {
    expect(signUserId('user-123')).toBe(signUserId('user-123'));
  });

  it('produces different signatures for different userIds', () => {
    expect(signUserId('a')).not.toBe(signUserId('b'));
  });

  it('verifies a userId that itself contains dots (uses last dot as separator)', () => {
    const cookie = signUserId('user.with.dots');
    expect(verifySessionCookie(cookie)).toBe('user.with.dots');
  });

  it('returns null when the payload is tampered', () => {
    const cookie = signUserId('alice');
    const tampered = cookie.replace(/^alice/, 'bob');
    expect(verifySessionCookie(tampered)).toBeNull();
  });

  it('returns null when the signature is tampered', () => {
    const cookie = signUserId('alice');
    const dot = cookie.lastIndexOf('.');
    const flipped = cookie.slice(0, dot + 1) + (cookie.endsWith('0') ? '1' : '0');
    expect(verifySessionCookie(flipped)).toBeNull();
  });

  it('returns null when the value contains no dot', () => {
    expect(verifySessionCookie('no-dot-here')).toBeNull();
  });

  it('returns null when the value is empty', () => {
    expect(verifySessionCookie('')).toBeNull();
  });

  it('returns null when the signature is shorter than expected', () => {
    expect(verifySessionCookie('alice.abc')).toBeNull();
  });

  it('returns null when the signature contains non-hex characters', () => {
    const cookie = signUserId('alice');
    const dot = cookie.lastIndexOf('.');
    const garbage = cookie.slice(0, dot + 1) + 'z'.repeat(cookie.length - dot - 1);
    expect(verifySessionCookie(garbage)).toBeNull();
  });

  it('returns null when payload is empty (".sig" form)', () => {
    // A correctly-signed empty payload would still be rejected since verify returns
    // `payload || null` — guarding against a zero-length userId leaking through.
    const sig = signUserId('').split('.')[1];
    expect(verifySessionCookie(`.${sig}`)).toBeNull();
  });
});
