import { describe, it, expect } from 'vitest';
import {
  ALLOWED_LAB_TYPES,
  validateLabType,
  validateParsedValues,
} from '../../server/services/labValidationService';

describe('Lab Validation Service - ALLOWED_LAB_TYPES', () => {
  it('should include cbc lab type', () => {
    expect(ALLOWED_LAB_TYPES).toContain('cbc');
  });

  it('should include urinalysis lab type', () => {
    expect(ALLOWED_LAB_TYPES).toContain('urinalysis');
  });

  it('should include lipid profile lab type', () => {
    expect(ALLOWED_LAB_TYPES).toContain('lipid');
  });

  it('should have exactly 3 lab types', () => {
    expect(ALLOWED_LAB_TYPES).toHaveLength(3);
  });
});

describe('Lab Validation Service - validateLabType', () => {
  describe('CBC validation', () => {
    it('should validate valid CBC report text', () => {
      const cbcText = `
        Laboratory Report
        Complete Blood Count (CBC)
        Patient: John Doe
        Hemoglobin: 14.5 g/dL
        WBC: 7.5 x 10^9/L
        RBC: 5.0 x 10^12/L
        Platelet: 250 x 10^9/L
        Hematocrit: 42%
        Reference Range: Normal
      `;
      const result = validateLabType(cbcText, 'cbc');
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should reject non-medical document', () => {
      const invalidText = 'This is just a random shopping list with no medical data.';
      const result = validateLabType(invalidText, 'cbc');
      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should detect CBC keywords', () => {
      const cbcText = `
        Hospital Lab Report
        CBC Complete Blood Count Test
        Hemoglobin HGB: 14.5 g/dL
        White Blood Cell: 8000/mm3
        Red Blood Cell: 4.5
        Platelet Count: 200
        MCH: 28 pg
      `;
      const result = validateLabType(cbcText, 'cbc');
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
      expect(result.matchedParameters.length).toBeGreaterThan(0);
    });
  });

  describe('Urinalysis validation', () => {
    it('should validate valid urinalysis report text', () => {
      const urinalysisText = `
        Medical Laboratory Report
        Urinalysis Examination
        Patient Specimen
        Color: Yellow
        Appearance: Clear
        pH: 6.0
        Specific Gravity: 1.015
        Protein: Negative
        Glucose: Negative
        Blood: Negative
        Nitrite: Negative
        Reference Range
      `;
      const result = validateLabType(urinalysisText, 'urinalysis');
      expect(result.isValid).toBe(true);
    });

    it('should detect urinalysis parameters', () => {
      const urinalysisText = `
        Lab Report
        Urine Analysis Result
        Color yellow, Clarity clear
        pH: 5.5
        Specific Gravity: 1.020
        Protein: Trace
        Glucose: Negative
        WBC: 2-5/hpf
        RBC: 0-2/hpf
        Bacteria: None
      `;
      const result = validateLabType(urinalysisText, 'urinalysis');
      expect(result.matchedParameters.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Lipid Profile validation', () => {
    it('should validate valid lipid profile report text', () => {
      const lipidText = `
        Laboratory Report
        Lipid Profile Test
        Patient Result
        Total Cholesterol: 180 mg/dL
        HDL Cholesterol: 55 mg/dL
        LDL Cholesterol: 100 mg/dL
        Triglycerides: 125 mg/dL
        Reference Range
      `;
      const result = validateLabType(lipidText, 'lipid');
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect lipid parameters', () => {
      const lipidText = `
        Medical Lab Analysis
        Lipid Panel Results
        Cholesterol Total: 200 mg/dL
        HDL: 60 mg/dL
        LDL: 120 mg/dL
        TG: 150 mg/dL
      `;
      const result = validateLabType(lipidText, 'lipid');
      expect(result.matchedParameters.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('Lab Validation Service - validateParsedValues', () => {
  describe('CBC parsed values', () => {
    it('should validate parsed CBC values', () => {
      const parsedValues = {
        hemoglobin: 14.5,
        wbc: 7500,
        rbc: 5.0,
        platelet: 250000,
        hematocrit: 42,
      };
      const result = validateParsedValues(parsedValues, 'cbc');
      expect(result.isValid).toBe(true);
      expect(result.matchedParameters.length).toBeGreaterThanOrEqual(4);
    });

    it('should reject insufficient CBC parameters', () => {
      const parsedValues = {
        hemoglobin: 14.5,
      };
      const result = validateParsedValues(parsedValues, 'cbc');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Urinalysis parsed values', () => {
    it('should validate parsed urinalysis values', () => {
      const parsedValues = {
        color: 'yellow',
        ph: 6.0,
        specific_gravity: 1.015,
        protein: 'negative',
        glucose: 'negative',
        blood: 'negative',
      };
      const result = validateParsedValues(parsedValues, 'urinalysis');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Lipid Profile parsed values', () => {
    it('should validate parsed lipid values', () => {
      const parsedValues = {
        total_cholesterol: 180,
        hdl: 55,
        ldl: 100,
        triglycerides: 125,
      };
      const result = validateParsedValues(parsedValues, 'lipid');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Confidence scoring', () => {
    it('should return higher confidence for more matches', () => {
      const minimalValues = { hemoglobin: 14.5, wbc: 7500, rbc: 5.0, hct: 42 };
      const extensiveValues = {
        hemoglobin: 14.5,
        wbc: 7500,
        rbc: 5.0,
        platelet: 250000,
        hematocrit: 42,
        mcv: 85,
        mch: 28,
        mchc: 33,
      };

      const minimalResult = validateParsedValues(minimalValues, 'cbc');
      const extensiveResult = validateParsedValues(extensiveValues, 'cbc');

      expect(extensiveResult.confidence).toBeGreaterThanOrEqual(minimalResult.confidence);
    });
  });
});
