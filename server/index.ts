// Debug: log environment to see what's actually available
console.log('📋 Environment variables present:');
console.log('   ZAI_API_KEY:', process.env.ZAI_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('   NODE_ENV:', process.env.NODE_ENV);

// Validate Z.ai API key is present BEFORE any other imports
const zaiKey = process.env.ZAI_API_KEY?.trim();
if (!zaiKey) {
  console.error('\n❌ FATAL ERROR: ZAI_API_KEY environment variable is not set or is empty.');
  console.error('   Please configure ZAI_API_KEY in your Render environment.');
  console.error('   All environment variables:', Object.keys(process.env).filter(k => !k.includes('CREDENTIAL')).sort());
  console.error();
  process.exit(1);
}
console.log('✅ ZAI_API_KEY is set and ready.\n');

// Disable GCE metadata service checks BEFORE any Firebase imports
process.env.FIRESTORE_EMULATOR_HOST = '';
process.env.GCE_METADATA_HOST = 'metadata.google.internal.invalid';
process.env.SUPPRESS_GCLOUD_CREDS_WARNING = 'true';
process.env.NO_GCE_CHECK = 'true';
process.env.GOOGLE_CLOUD_PROJECT = process.env.VITE_FIREBASE_PROJECT_ID || '';

import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, saveLabResult, saveHealthAnalysis } from './services/firebaseService';

const app = express();

// ML API using HuggingFace deployment
const ML_API_URL = process.env.ML_API_URL || 'https://mijsu-labvio-ml-api.hf.space';
console.log('ℹ️ Using ML API at:', ML_API_URL);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

// seed database with two example lab results if none exist yet

async function seedDatabase() {
  try {
    const snap = await db.collection('labResults').limit(1).get();
    if (!snap.empty) {
      console.log('📦 Seed check: labResults already populated, skipping seed.');
      return;
    }

    console.log('📦 Seeding sample lab results...');
    const now = new Date();
    const userId = 'seed-user';

    // urinalysis example
    const uaResultId = await saveLabResult({
      userId,
      imageUrl: '',
      fileName: 'urinalysis-example.png',
      fileSize: 0,
      uploadedAt: now,
      status: 'completed',
      labType: 'urinalysis',
    });
    await saveHealthAnalysis({
      labResultId: uaResultId,
      userId,
      analyzedAt: now,
      riskLevel: 'low',
      riskScore: 0.05,
      findings: 'Urinalysis within normal limits.',
      healthInsights: ['No abnormalities detected'],
      lifestyleRecommendations: ['Maintain hydration'],
      dietaryRecommendations: ['Continue balanced diet'],
      suggestedSpecialists: [],
      extractedData: {
        rawText: 'pH 6.5\nColor Yellow\nClarity Clear\nProtein Negative',
        parsedValues: { ph: 6.5, color: 'yellow', clarity: 'clear', protein: 0 },
      },
    });

    // CBC example
    const cbcResultId = await saveLabResult({
      userId,
      imageUrl: '',
      fileName: 'cbc-example.png',
      fileSize: 0,
      uploadedAt: now,
      status: 'completed',
      labType: 'cbc',
    });
    await saveHealthAnalysis({
      labResultId: cbcResultId,
      userId,
      analyzedAt: now,
      riskLevel: 'low',
      riskScore: 0.1,
      findings: 'CBC shows normal counts.',
      healthInsights: ['All parameters within reference ranges'],
      lifestyleRecommendations: ['Regular exercise'],
      dietaryRecommendations: ['Iron-rich foods if needed'],
      suggestedSpecialists: [],
      extractedData: {
        rawText: 'WBC 7.2\nRBC 5.1\nHemoglobin 14.0',
        parsedValues: { wbc: 7.2, rbc: 5.1, hemoglobin: 14.0 },
      },
    });

    console.log('📦 Seeding complete.');
  } catch (err) {
    console.error('Error during seeding:', err);
  }
}


  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as { status?: number; statusCode?: number; message?: string };
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", async () => {
    log(`serving on port ${port}`);
    console.log(`✅ Server ready at http://0.0.0.0:${port}`);

    // ensure seed runs after server is up
    await seedDatabase();
  });
})();
