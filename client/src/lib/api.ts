import { apiRequest } from "@/lib/queryClient";
import type { HealthAnalysis, ValidationError } from "@shared/schema";
import { validationErrorSchema } from "@shared/schema";

export class LabValidationError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: ValidationError['details']
  ) {
    super(message);
    this.name = 'LabValidationError';
  }
}

export interface UploadLabResultResponse {
  success: boolean;
  data: {
    labResultId: string;
    analysisId: string;
    ocrResult: {
      text: string;
      confidence: number;
      parsedValues: Record<string, string | number>;
    };
    analysis: {
      riskLevel: 'low' | 'moderate' | 'high';
      riskScore: number;
      findings: string;
      healthInsights: string[];
      lifestyleRecommendations: string[];
      dietaryRecommendations: string[];
      suggestedSpecialists: Array<{
        type: string;
        reason: string;
      }>;
      comprehensiveAnalysis?: HealthAnalysis['comprehensiveAnalysis'];
    };
    labType: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  };
}

export interface HealthTipResponse {
  success: boolean;
  data: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    icon: string;
  }>;
}

export interface HospitalResponse {
  success: boolean;
  data: Array<{
    id: string;
    name: string;
    address: string;
    distance: number;
    specialties: string[];
    rating: number;
    phoneNumber: string;
    latitude: number;
    longitude: number;
    isOpen24Hours: boolean;
  }>;
}

export async function uploadLabResult(
  file: File,
  labType: string,
  userId: string
): Promise<UploadLabResultResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("labType", labType);
  formData.append("userId", userId);

  const response = await fetch("/api/lab-results/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();

    // Validate the error payload against the validation error schema
    const validationResult = validationErrorSchema.safeParse(error);
    if (validationResult.success) {
      const validatedError = validationResult.data;
      throw new LabValidationError(
        validatedError.code,
        validatedError.message,
        validatedError.details
      );
    }

    // Fallback to generic error for other error types
    throw new Error(error.error || error.message || "Upload failed");
  }

  return response.json();
}

export async function getHealthTips(category?: string): Promise<HealthTipResponse> {
  const url = category ? `/api/health-tips?category=${category}` : "/api/health-tips";
  const response = await fetch(url);
  return response.json();
}

export async function getNearbyHospitals(
  latitude?: number,
  longitude?: number,
  radius?: number
): Promise<HospitalResponse> {
  const params = new URLSearchParams();
  if (latitude) params.append("latitude", latitude.toString());
  if (longitude) params.append("longitude", longitude.toString());
  if (radius) params.append("radius", radius.toString());

  const url = `/api/hospitals/nearby${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url);
  return response.json();
}

export async function getUserData(userId: string): Promise<{
  success: boolean;
  data: {
    labResults: any[];
    analyses: any[];
  };
}> {
  const response = await fetch(`/api/user/${userId}/data`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user data');
  }
  return response.json();
}

export async function deleteUserData(userId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest("DELETE", `/api/user/${userId}/data`, {});
  return response.json();
}