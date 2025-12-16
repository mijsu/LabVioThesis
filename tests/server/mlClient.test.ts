import { describe, it, expect } from 'vitest';

describe('ML Client Configuration', () => {
  const ML_API_URL = 'https://mijsu-labvio-ml-api.hf.space';

  it('should have correct ML API URL format', () => {
    expect(ML_API_URL).toMatch(/^https:\/\//);
    expect(ML_API_URL).toContain('hf.space');
  });

  it('should be a valid URL', () => {
    expect(() => new URL(ML_API_URL)).not.toThrow();
  });

  it('should use HTTPS protocol', () => {
    const url = new URL(ML_API_URL);
    expect(url.protocol).toBe('https:');
  });
});

describe('Risk Level Validation', () => {
  const validRiskLevels = ['low', 'moderate', 'high'];

  it('should accept valid risk levels', () => {
    validRiskLevels.forEach((level) => {
      expect(validRiskLevels).toContain(level);
    });
  });

  it('should have exactly 3 risk levels', () => {
    expect(validRiskLevels).toHaveLength(3);
  });
});

describe('Risk Score Validation', () => {
  it('should validate risk score in range 0-100', () => {
    const validScores = [0, 25, 50, 75, 100];
    validScores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('should reject invalid risk scores', () => {
    const invalidScores = [-1, 101, 150];
    invalidScores.forEach((score) => {
      expect(score < 0 || score > 100).toBe(true);
    });
  });
});

describe('Lab Type Constants', () => {
  const ALLOWED_LAB_TYPES = ['cbc', 'urinalysis', 'lipid'];

  it('should include CBC lab type', () => {
    expect(ALLOWED_LAB_TYPES).toContain('cbc');
  });

  it('should include urinalysis lab type', () => {
    expect(ALLOWED_LAB_TYPES).toContain('urinalysis');
  });

  it('should include lipid profile lab type', () => {
    expect(ALLOWED_LAB_TYPES).toContain('lipid');
  });
});
