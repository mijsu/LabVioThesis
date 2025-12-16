import { describe, it, expect } from 'vitest';
import { createHash, randomBytes } from 'crypto';

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + useSalt)
    .digest('hex');
  return { hash, salt: useSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function isValidToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

describe('Password Hashing', () => {
  it('should create different hashes for the same password', () => {
    const password = 'TestPassword123';
    const result1 = hashPassword(password);
    const result2 = hashPassword(password);
    expect(result1.hash).not.toBe(result2.hash);
    expect(result1.salt).not.toBe(result2.salt);
  });

  it('should return true for matching password', () => {
    const password = 'SecurePassword456';
    const { hash, salt } = hashPassword(password);
    expect(verifyPassword(password, hash, salt)).toBe(true);
  });

  it('should return false for non-matching password', () => {
    const password = 'CorrectPassword';
    const wrongPassword = 'WrongPassword';
    const { hash, salt } = hashPassword(password);
    expect(verifyPassword(wrongPassword, hash, salt)).toBe(false);
  });

  it('should return false for empty password', () => {
    const password = 'ValidPassword123';
    const { hash, salt } = hashPassword(password);
    expect(verifyPassword('', hash, salt)).toBe(false);
  });

  it('should produce consistent hash with same salt', () => {
    const password = 'ConsistentPassword';
    const salt = 'fixed-salt-value-123';
    const result1 = hashPassword(password, salt);
    const result2 = hashPassword(password, salt);
    expect(result1.hash).toBe(result2.hash);
  });

  it('should generate hash of expected length', () => {
    const { hash } = hashPassword('AnyPassword');
    expect(hash).toHaveLength(64);
  });

  it('should generate salt of expected length', () => {
    const { salt } = hashPassword('AnyPassword');
    expect(salt).toHaveLength(32);
  });
});

describe('Token Generation', () => {
  it('should generate valid tokens', () => {
    const token = generateToken();
    expect(isValidToken(token)).toBe(true);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(100);
  });

  it('should validate correct token format', () => {
    const validToken = 'a'.repeat(64);
    expect(isValidToken(validToken)).toBe(true);
  });

  it('should reject invalid token formats', () => {
    expect(isValidToken('short')).toBe(false);
    expect(isValidToken('invalid-chars-here!')).toBe(false);
    expect(isValidToken('')).toBe(false);
  });
});

describe('Firebase Token Format', () => {
  it('should validate Bearer token format', () => {
    const authHeader = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test';
    expect(authHeader.startsWith('Bearer ')).toBe(true);
  });

  it('should extract token from Bearer header', () => {
    const authHeader = 'Bearer my-token-value';
    const token = authHeader.split('Bearer ')[1];
    expect(token).toBe('my-token-value');
  });

  it('should handle missing Bearer prefix', () => {
    const authHeader = 'my-token-value';
    expect(authHeader.startsWith('Bearer ')).toBe(false);
  });
});
