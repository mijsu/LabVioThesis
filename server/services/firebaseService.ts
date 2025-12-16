// Firebase Admin Service for server-side Firebase operations
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { Request, Response, NextFunction } from 'express';
import type { ComprehensiveAnalysis } from './comprehensiveAnalysisService';

// Initialize Firebase Admin (if not already initialized)
if (getApps().length === 0) {
  try {
    // Parse service account JSON from environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }

    const serviceAccount = JSON.parse(serviceAccountJson) as any;
    
    // Extract project ID from service account (handles both snake_case and camelCase)
    const projectId = serviceAccount.project_id ?? serviceAccount.projectId ?? process.env.GOOGLE_CLOUD_PROJECT;
    
    if (!projectId) {
      throw new Error('Project ID not found in service account or environment');
    }

    // Set environment variables to prevent GCE metadata lookups
    process.env.GOOGLE_CLOUD_PROJECT = projectId;
    process.env.GCLOUD_PROJECT = projectId;

    // Initialize Firebase Admin with explicit project ID
    initializeApp({
      credential: cert(serviceAccount as ServiceAccount),
      projectId: projectId,
    });

    console.log(`✅ Firebase Admin initialized with service account credentials (project: ${projectId})`);
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

// Get Firestore with settings that prevent metadata service calls
export const db = getFirestore();
db.settings({
  ignoreUndefinedProperties: true,
  preferRest: true,  // Use REST API instead of gRPC to avoid metadata calls
});

export interface LabResultDocument {
  id: string;
  userId: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  status: string;
  labType: string;
}

export interface HealthAnalysisDocument {
  id: string;
  labResultId: string;
  userId: string;
  analyzedAt: Date;
  riskLevel: string;
  riskScore: number;
  findings: string;
  healthInsights: string[];
  lifestyleRecommendations: string[];
  dietaryRecommendations: string[];
  suggestedSpecialists: Array<{ type: string; reason: string }>;
  extractedData: {
    rawText: string;
    parsedValues: Record<string, string | number>;
  };
  comprehensiveAnalysis?: ComprehensiveAnalysis;
}

export async function saveLabResult(data: Omit<LabResultDocument, 'id'>): Promise<string> {
  const docRef = await db.collection('labResults').add({
    ...data,
    uploadedAt: new Date(),
  });
  return docRef.id;
}

export async function saveHealthAnalysis(data: Omit<HealthAnalysisDocument, 'id'>): Promise<string> {
  const docRef = await db.collection('healthAnalyses').add({
    ...data,
    analyzedAt: new Date(),
  });
  return docRef.id;
}

export async function getLabResultsByUserId(userId: string): Promise<LabResultDocument[]> {
  const snapshot = await db.collection('labResults')
    .where('userId', '==', userId)
    .get();

  const results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as LabResultDocument));

  // Sort in memory to avoid requiring a composite index
  return results.sort((a, b) => {
    const dateA = a.uploadedAt instanceof Date ? a.uploadedAt : new Date(a.uploadedAt);
    const dateB = b.uploadedAt instanceof Date ? b.uploadedAt : new Date(b.uploadedAt);
    return dateB.getTime() - dateA.getTime();
  });
}

export async function getHealthAnalysesByUserId(userId: string): Promise<HealthAnalysisDocument[]> {
  const snapshot = await db.collection('healthAnalyses')
    .where('userId', '==', userId)
    .get();

  const results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as HealthAnalysisDocument));

  // Sort in memory to avoid requiring a composite index
  return results.sort((a, b) => {
    const dateA = a.analyzedAt instanceof Date ? a.analyzedAt : new Date(a.analyzedAt);
    const dateB = b.analyzedAt instanceof Date ? b.analyzedAt : new Date(b.analyzedAt);
    return dateB.getTime() - dateA.getTime();
  });
}

export async function saveChatMessage(userId: string, role: string, content: string): Promise<string> {
  const docRef = await db.collection('chatMessages').add({
    userId,
    role,
    content,
    timestamp: new Date(),
  });
  return docRef.id;
}

export async function getChatHistory(userId: string, limit: number = 50): Promise<any[]> {
  const snapshot = await db.collection('chatMessages')
    .where('userId', '==', userId)
    .get();

  const results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // Sort in memory to avoid requiring a composite index
  const sorted = results.sort((a: any, b: any) => {
    const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
    const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
    return dateA.getTime() - dateB.getTime(); // ascending order for chat
  });

  // Apply limit after sorting
  return sorted.slice(0, limit);
}

export async function deleteHealthAnalysis(analysisId: string, userId: string): Promise<void> {
  const analysisRef = db.collection('healthAnalyses').doc(analysisId);
  const analysisDoc = await analysisRef.get();
  
  if (!analysisDoc.exists) {
    throw new Error('Health analysis not found');
  }
  
  const analysisData = analysisDoc.data();
  if (analysisData?.userId !== userId) {
    throw new Error('Unauthorized: Analysis does not belong to this user');
  }
  
  await analysisRef.delete();
}

export async function deleteLabResult(labResultId: string, userId: string): Promise<void> {
  const labResultRef = db.collection('labResults').doc(labResultId);
  const labResultDoc = await labResultRef.get();
  
  if (!labResultDoc.exists) {
    throw new Error('Lab result not found');
  }
  
  const labResultData = labResultDoc.data();
  if (labResultData?.userId !== userId) {
    throw new Error('Unauthorized: Lab result does not belong to this user');
  }
  
  await labResultRef.delete();
}

export async function deleteUserData(userId: string): Promise<void> {
  const batch = db.batch();

  // Delete lab results
  const labResults = await db.collection('labResults').where('userId', '==', userId).get();
  labResults.docs.forEach(doc => batch.delete(doc.ref));

  // Delete health analyses
  const analyses = await db.collection('healthAnalyses').where('userId', '==', userId).get();
  analyses.docs.forEach(doc => batch.delete(doc.ref));

  // Delete chat messages
  const messages = await db.collection('chatMessages').where('userId', '==', userId).get();
  messages.docs.forEach(doc => batch.delete(doc.ref));

  // Delete user location
  const locationRef = db.collection('userLocations').doc(userId);
  batch.delete(locationRef);

  await batch.commit();
}

// User Location Document interface
export interface UserLocationDocument {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  updatedAt: Date;
  locationEnabled: boolean;
}

// Save user location preference
export async function saveUserLocation(userId: string, location: {
  latitude: number;
  longitude: number;
  accuracy: number;
}): Promise<void> {
  const locationRef = db.collection('userLocations').doc(userId);
  await locationRef.set({
    userId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    updatedAt: new Date(),
    locationEnabled: true,
  }, { merge: true });
}

// Get user location preference
export async function getUserLocation(userId: string): Promise<UserLocationDocument | null> {
  const locationRef = db.collection('userLocations').doc(userId);
  const doc = await locationRef.get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data() as UserLocationDocument;
}

// Delete user location preference
export async function deleteUserLocation(userId: string): Promise<void> {
  const locationRef = db.collection('userLocations').doc(userId);
  await locationRef.delete();
}

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
    }
  }
}

// Authentication middleware to verify Firebase ID tokens
export async function authenticateFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      res.status(401).json({ error: 'Unauthorized: Invalid token format' });
      return;
    }

    // Verify the ID token using Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    // Attach user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    
    next();
  } catch (error: any) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }
}
