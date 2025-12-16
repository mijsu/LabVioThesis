import { z } from "zod";

// User schema (Firebase-managed, but we define types for TypeScript)
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;

// Lab Result Upload schema
export const labResultSchema = z.object({
  id: z.string(),
  userId: z.string(),
  imageUrl: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  uploadedAt: z.date(),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']),
  labType: z.enum(['cbc', 'urinalysis', 'lipid']),
});

export const insertLabResultSchema = labResultSchema.omit({ id: true });

export type LabResult = z.infer<typeof labResultSchema>;
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;

// OCR Extracted Data schema
export const extractedDataSchema = z.object({
  rawText: z.string(),
  parsedValues: z.record(z.string(), z.union([z.string(), z.number()])),
});

export type ExtractedData = z.infer<typeof extractedDataSchema>;

// Comprehensive Analysis sub-schemas
export const labValueBreakdownSchema = z.object({
  parameter: z.string(),
  value: z.string(),
  normalRange: z.string(),
  status: z.enum(['normal', 'borderline', 'abnormal']),
  interpretation: z.string(),
});

export const categorizedRecommendationSchema = z.object({
  category: z.string(),
  recommendation: z.string(),
  rationale: z.string(),
});

export const specialistRecommendationSchema = z.object({
  type: z.string(),
  reason: z.string(),
  urgency: z.enum(['routine', 'soon', 'urgent']).optional(),
});

export const comprehensiveAnalysisSchema = z.object({
  detailedFindings: z.string(),
  labValueBreakdown: z.array(labValueBreakdownSchema),
  lifestyleRecommendations: z.array(categorizedRecommendationSchema),
  dietaryRecommendations: z.array(categorizedRecommendationSchema),
  suggestedSpecialists: z.array(specialistRecommendationSchema),
});

export type ComprehensiveAnalysis = z.infer<typeof comprehensiveAnalysisSchema>;

// Health Analysis schema (from ML model)
export const healthAnalysisSchema = z.object({
  id: z.string(),
  labResultId: z.string(),
  userId: z.string(),
  analyzedAt: z.date(),
  riskLevel: z.enum(['low', 'moderate', 'high']),
  riskScore: z.number().min(0).max(100),
  findings: z.string(),
  healthInsights: z.array(z.string()),
  lifestyleRecommendations: z.array(z.string()),
  dietaryRecommendations: z.array(z.string()),
  suggestedSpecialists: z.array(z.object({
    type: z.string(),
    reason: z.string(),
    urgency: z.enum(['routine', 'soon', 'urgent']).optional(),
  })),
  extractedData: extractedDataSchema,
  comprehensiveAnalysis: comprehensiveAnalysisSchema.optional(),
});

export const insertHealthAnalysisSchema = healthAnalysisSchema.omit({ id: true });

export type HealthAnalysis = z.infer<typeof healthAnalysisSchema>;
export type InsertHealthAnalysis = z.infer<typeof insertHealthAnalysisSchema>;

// Chat Message schema
export const chatMessageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.date(),
});

export const insertChatMessageSchema = chatMessageSchema.omit({ id: true });

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Hospital schema
export const hospitalSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  distance: z.number(),
  specialties: z.array(z.string()),
  rating: z.number().min(0).max(5),
  phoneNumber: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type Hospital = z.infer<typeof hospitalSchema>;

// Health Tip schema
export const healthTipSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.enum(['nutrition', 'exercise', 'sleep', 'mental-health', 'prevention']),
  icon: z.string(),
});

export type HealthTip = z.infer<typeof healthTipSchema>;

// Privacy Consent schema
export const privacyConsentSchema = z.object({
  userId: z.string(),
  consentedAt: z.date(),
  ipAddress: z.string().optional(),
});

export type PrivacyConsent = z.infer<typeof privacyConsentSchema>;

// API Request/Response schemas
export const uploadLabRequestSchema = z.object({
  file: z.instanceof(File),
  labType: z.enum(['cbc', 'urinalysis', 'lipid']),
  consentGiven: z.boolean().refine(val => val === true, {
    message: "Privacy consent must be given"
  }),
});

export type UploadLabRequest = z.infer<typeof uploadLabRequestSchema>;

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(500),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const deleteUserDataRequestSchema = z.object({
  userId: z.string(),
  confirmDeletion: z.boolean().refine(val => val === true, {
    message: "Must confirm deletion"
  }),
});

export type DeleteUserDataRequest = z.infer<typeof deleteUserDataRequestSchema>;

// Validation Error schema for detailed error responses
export const validationErrorDetailsSchema = z.object({
  selectedLabType: z.string(),
  confidenceTier: z.enum(['high', 'medium', 'low']),
  confidence: z.number(),
  reasons: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const validationErrorSchema = z.object({
  code: z.enum(['INVALID_LAB_IMAGE', 'MISMATCHED_LAB_TYPE']),
  message: z.string(),
  details: validationErrorDetailsSchema,
});

export type ValidationErrorDetails = z.infer<typeof validationErrorDetailsSchema>;
export type ValidationError = z.infer<typeof validationErrorSchema>;
