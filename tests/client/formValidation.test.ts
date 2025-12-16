import { describe, it, expect } from 'vitest';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  labType?: string;
  consentGiven?: boolean;
}

function validateRegistrationForm(data: FormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.email || data.email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (!data.password || data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

function validateUploadForm(data: { file?: File | null; labType: string; consentGiven: boolean }): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const allowedLabTypes = ['cbc', 'urinalysis', 'lipid'];

  if (!data.file) {
    errors.file = 'Please select a file to upload';
  }

  if (!allowedLabTypes.includes(data.labType)) {
    errors.labType = 'Please select a valid lab type';
  }

  if (!data.consentGiven) {
    errors.consent = 'You must agree to the privacy policy';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

describe('Registration Form Validation', () => {
  it('should validate a complete and correct form', () => {
    const result = validateRegistrationForm({
      email: 'test@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
    });
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('should reject empty email', () => {
    const result = validateRegistrationForm({
      email: '',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('should reject invalid email format', () => {
    const result = validateRegistrationForm({
      email: 'invalid-email',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Invalid email format');
  });

  it('should reject short password', () => {
    const result = validateRegistrationForm({
      email: 'test@example.com',
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBeDefined();
  });

  it('should reject mismatched passwords', () => {
    const result = validateRegistrationForm({
      email: 'test@example.com',
      password: 'SecurePass123',
      confirmPassword: 'DifferentPass456',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBe('Passwords do not match');
  });
});

describe('Upload Form Validation', () => {
  it('should validate a complete upload form', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = validateUploadForm({
      file: mockFile,
      labType: 'cbc',
      consentGiven: true,
    });
    expect(result.isValid).toBe(true);
  });

  it('should reject missing file', () => {
    const result = validateUploadForm({
      file: null,
      labType: 'cbc',
      consentGiven: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.file).toBeDefined();
  });

  it('should reject invalid lab type', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = validateUploadForm({
      file: mockFile,
      labType: 'invalid',
      consentGiven: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.labType).toBeDefined();
  });

  it('should reject without consent', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = validateUploadForm({
      file: mockFile,
      labType: 'cbc',
      consentGiven: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.consent).toBeDefined();
  });
});
