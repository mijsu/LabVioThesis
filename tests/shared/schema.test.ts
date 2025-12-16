import { describe, it, expect } from 'vitest';
import {
  userSchema,
  labResultSchema,
  healthAnalysisSchema,
  chatMessageSchema,
  hospitalSchema,
  healthTipSchema,
  extractedDataSchema,
  comprehensiveAnalysisSchema,
  privacyConsentSchema,
  chatRequestSchema,
  deleteUserDataRequestSchema,
  validationErrorSchema,
  labValueBreakdownSchema,
  categorizedRecommendationSchema,
  specialistRecommendationSchema,
  type User,
  type LabResult,
  type ChatMessage,
  type Hospital,
  type HealthTip,
} from '../../shared/schema';

describe('User Schema', () => {
  it('should validate a valid user', () => {
    const validUser = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
    };
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      id: 'user123',
      email: 'invalid-email',
      displayName: 'Test User',
      photoURL: null,
    };
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should allow null displayName and photoURL', () => {
    const userWithNulls = {
      id: 'user123',
      email: 'test@example.com',
      displayName: null,
      photoURL: null,
    };
    const result = userSchema.safeParse(userWithNulls);
    expect(result.success).toBe(true);
  });

  it('should type check correctly', () => {
    const user: User = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test',
      photoURL: null,
    };
    expect(user.id).toBe('user123');
  });
});

describe('Lab Result Schema', () => {
  it('should validate a valid lab result', () => {
    const validLabResult = {
      id: 'lab123',
      userId: 'user123',
      imageUrl: 'https://example.com/image.jpg',
      fileName: 'test.jpg',
      fileSize: 1024,
      uploadedAt: new Date(),
      status: 'completed',
      labType: 'cbc',
    };
    const result = labResultSchema.safeParse(validLabResult);
    expect(result.success).toBe(true);
  });

  it('should reject invalid lab type', () => {
    const invalidLabResult = {
      id: 'lab123',
      userId: 'user123',
      imageUrl: 'https://example.com/image.jpg',
      fileName: 'test.jpg',
      fileSize: 1024,
      uploadedAt: new Date(),
      status: 'completed',
      labType: 'invalid',
    };
    const result = labResultSchema.safeParse(invalidLabResult);
    expect(result.success).toBe(false);
  });

  it('should validate all lab types', () => {
    const labTypes = ['cbc', 'urinalysis', 'lipid'] as const;
    labTypes.forEach((labType) => {
      const validLabResult = {
        id: 'lab123',
        userId: 'user123',
        imageUrl: 'https://example.com/image.jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        uploadedAt: new Date(),
        status: 'completed' as const,
        labType,
      };
      const result = labResultSchema.safeParse(validLabResult);
      expect(result.success).toBe(true);
    });
  });

  it('should validate all status types', () => {
    const statuses = ['uploading', 'processing', 'completed', 'failed'] as const;
    statuses.forEach((status) => {
      const validLabResult = {
        id: 'lab123',
        userId: 'user123',
        imageUrl: 'https://example.com/image.jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        uploadedAt: new Date(),
        status,
        labType: 'cbc' as const,
      };
      const result = labResultSchema.safeParse(validLabResult);
      expect(result.success).toBe(true);
    });
  });
});

describe('Chat Message Schema', () => {
  it('should validate a valid chat message', () => {
    const validMessage = {
      id: 'msg123',
      userId: 'user123',
      role: 'user',
      content: 'Hello, how are you?',
      timestamp: new Date(),
    };
    const result = chatMessageSchema.safeParse(validMessage);
    expect(result.success).toBe(true);
  });

  it('should validate assistant role', () => {
    const assistantMessage = {
      id: 'msg123',
      userId: 'user123',
      role: 'assistant',
      content: 'I am doing well, thank you!',
      timestamp: new Date(),
    };
    const result = chatMessageSchema.safeParse(assistantMessage);
    expect(result.success).toBe(true);
  });

  it('should reject invalid role', () => {
    const invalidMessage = {
      id: 'msg123',
      userId: 'user123',
      role: 'admin',
      content: 'Hello',
      timestamp: new Date(),
    };
    const result = chatMessageSchema.safeParse(invalidMessage);
    expect(result.success).toBe(false);
  });
});

describe('Hospital Schema', () => {
  it('should validate a valid hospital', () => {
    const validHospital = {
      id: 'hosp123',
      name: 'General Hospital',
      address: '123 Main St',
      distance: 2.5,
      specialties: ['Cardiology', 'Neurology'],
      rating: 4.5,
      phoneNumber: '+1234567890',
      latitude: 14.5995,
      longitude: 120.9842,
    };
    const result = hospitalSchema.safeParse(validHospital);
    expect(result.success).toBe(true);
  });

  it('should reject rating out of range (above 5)', () => {
    const invalidHospital = {
      id: 'hosp123',
      name: 'General Hospital',
      address: '123 Main St',
      distance: 2.5,
      specialties: ['Cardiology'],
      rating: 6,
      phoneNumber: '+1234567890',
      latitude: 14.5995,
      longitude: 120.9842,
    };
    const result = hospitalSchema.safeParse(invalidHospital);
    expect(result.success).toBe(false);
  });

  it('should reject negative rating', () => {
    const invalidHospital = {
      id: 'hosp123',
      name: 'General Hospital',
      address: '123 Main St',
      distance: 2.5,
      specialties: ['Cardiology'],
      rating: -1,
      phoneNumber: '+1234567890',
      latitude: 14.5995,
      longitude: 120.9842,
    };
    const result = hospitalSchema.safeParse(invalidHospital);
    expect(result.success).toBe(false);
  });
});

describe('Health Tip Schema', () => {
  it('should validate a valid health tip', () => {
    const validTip = {
      id: 'tip123',
      title: 'Stay Hydrated',
      content: 'Drink at least 8 glasses of water daily.',
      category: 'nutrition',
      icon: 'Apple',
    };
    const result = healthTipSchema.safeParse(validTip);
    expect(result.success).toBe(true);
  });

  it('should validate all categories', () => {
    const categories = ['nutrition', 'exercise', 'sleep', 'mental-health', 'prevention'] as const;
    categories.forEach((category) => {
      const validTip = {
        id: 'tip123',
        title: 'Test Tip',
        content: 'Test content',
        category,
        icon: 'Heart',
      };
      const result = healthTipSchema.safeParse(validTip);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid category', () => {
    const invalidTip = {
      id: 'tip123',
      title: 'Test Tip',
      content: 'Test content',
      category: 'invalid-category',
      icon: 'Heart',
    };
    const result = healthTipSchema.safeParse(invalidTip);
    expect(result.success).toBe(false);
  });
});

describe('Extracted Data Schema', () => {
  it('should validate extracted data with string values', () => {
    const data = {
      rawText: 'Sample lab report text',
      parsedValues: {
        hemoglobin: '14.5',
        wbc: '7500',
      },
    };
    const result = extractedDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate extracted data with numeric values', () => {
    const data = {
      rawText: 'Sample lab report text',
      parsedValues: {
        hemoglobin: 14.5,
        wbc: 7500,
      },
    };
    const result = extractedDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should require rawText field', () => {
    const invalidData = {
      parsedValues: { hemoglobin: 14.5 },
    };
    const result = extractedDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Lab Value Breakdown Schema', () => {
  it('should validate a valid lab value breakdown', () => {
    const breakdown = {
      parameter: 'Hemoglobin',
      value: '14.5 g/dL',
      normalRange: '12.0-16.0 g/dL',
      status: 'normal',
      interpretation: 'Your hemoglobin level is within the normal range.',
    };
    const result = labValueBreakdownSchema.safeParse(breakdown);
    expect(result.success).toBe(true);
  });

  it('should validate all status types', () => {
    const statuses = ['normal', 'borderline', 'abnormal'] as const;
    statuses.forEach((status) => {
      const breakdown = {
        parameter: 'Test',
        value: '10',
        normalRange: '5-15',
        status,
        interpretation: 'Test interpretation',
      };
      const result = labValueBreakdownSchema.safeParse(breakdown);
      expect(result.success).toBe(true);
    });
  });
});

describe('Specialist Recommendation Schema', () => {
  it('should validate a valid specialist recommendation', () => {
    const recommendation = {
      type: 'Cardiologist',
      reason: 'Elevated cholesterol levels detected',
      urgency: 'routine',
    };
    const result = specialistRecommendationSchema.safeParse(recommendation);
    expect(result.success).toBe(true);
  });

  it('should validate all urgency levels', () => {
    const urgencies = ['routine', 'soon', 'urgent'] as const;
    urgencies.forEach((urgency) => {
      const recommendation = {
        type: 'Specialist',
        reason: 'Test reason',
        urgency,
      };
      const result = specialistRecommendationSchema.safeParse(recommendation);
      expect(result.success).toBe(true);
    });
  });

  it('should allow optional urgency', () => {
    const recommendation = {
      type: 'Cardiologist',
      reason: 'General checkup',
    };
    const result = specialistRecommendationSchema.safeParse(recommendation);
    expect(result.success).toBe(true);
  });
});

describe('Chat Request Schema', () => {
  it('should validate a valid chat request', () => {
    const validRequest = { message: 'What does my CBC result mean?' };
    const result = chatRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject empty message', () => {
    const invalidRequest = { message: '' };
    const result = chatRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject message over 500 characters', () => {
    const longMessage = { message: 'a'.repeat(501) };
    const result = chatRequestSchema.safeParse(longMessage);
    expect(result.success).toBe(false);
  });
});

describe('Delete User Data Request Schema', () => {
  it('should validate when confirmation is true', () => {
    const validRequest = {
      userId: 'user123',
      confirmDeletion: true,
    };
    const result = deleteUserDataRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject when confirmation is false', () => {
    const invalidRequest = {
      userId: 'user123',
      confirmDeletion: false,
    };
    const result = deleteUserDataRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('Validation Error Schema', () => {
  it('should validate INVALID_LAB_IMAGE error', () => {
    const error = {
      code: 'INVALID_LAB_IMAGE',
      message: 'The uploaded image does not appear to be a valid lab report',
      details: {
        selectedLabType: 'CBC',
        confidenceTier: 'low',
        confidence: 25,
        reasons: ['Missing required keywords'],
        suggestions: ['Upload a clearer image'],
      },
    };
    const result = validationErrorSchema.safeParse(error);
    expect(result.success).toBe(true);
  });

  it('should validate MISMATCHED_LAB_TYPE error', () => {
    const error = {
      code: 'MISMATCHED_LAB_TYPE',
      message: 'The extracted values do not match the selected lab type',
      details: {
        selectedLabType: 'Urinalysis',
        confidenceTier: 'medium',
        confidence: 50,
        reasons: ['Parameters do not match urinalysis format'],
        suggestions: ['Verify you selected the correct lab type'],
      },
    };
    const result = validationErrorSchema.safeParse(error);
    expect(result.success).toBe(true);
  });
});
