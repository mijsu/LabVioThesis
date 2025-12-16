import { describe, it, expect } from 'vitest';

function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

describe('Password Validation', () => {
  it('should accept a valid password', () => {
    const result = validatePassword('SecurePass123');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Short1A');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('should reject password without uppercase letter', () => {
    const result = validatePassword('lowercase123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject password without lowercase letter', () => {
    const result = validatePassword('UPPERCASE123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePassword('NoNumbersHere');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should return multiple errors for very weak password', () => {
    const result = validatePassword('weak');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should accept complex passwords', () => {
    const complexPasswords = [
      'MySecure123Pass',
      'Password1234',
      'Abcdefg1',
      'Testing123456',
    ];
    complexPasswords.forEach((password) => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
    });
  });

  it('should handle empty password', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.org',
      'user+tag@example.co.uk',
    ];
    validEmails.forEach((email) => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'invalid',
      'no@domain',
      '@nodomain.com',
      'spaces in@email.com',
    ];
    invalidEmails.forEach((email) => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  it('should reject empty email', () => {
    expect(validateEmail('')).toBe(false);
  });
});
