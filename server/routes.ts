import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { extractTextFromImage } from "./services/ocrService";
import { analyzeLabResults } from "./services/mlService";
import { validateLabType, validateParsedValues, ALLOWED_LAB_TYPES, type LabType } from "./services/labValidationService";

// Extend Express Request to include user property
declare module "express" {
  interface Request {
    user?: { uid: string; email?: string };
  }
}
import {
  saveLabResult,
  saveHealthAnalysis,
  getLabResultsByUserId,
  getHealthAnalysesByUserId,
  deleteUserData as deleteFirebaseUserData,
  deleteHealthAnalysis,
  deleteLabResult,
  authenticateFirebaseToken,
  saveUserLocation,
  getUserLocation,
} from "./services/firebaseService";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Upload and analyze lab result
  app.post("/api/lab-results/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { labType, userId } = req.body;

      if (!labType || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate labType is one of the allowed values
      const normalizedLabType = labType.toLowerCase().trim();
      
      if (!ALLOWED_LAB_TYPES.includes(normalizedLabType as LabType)) {
        return res.status(400).json({ 
          error: "Invalid lab type",
          details: {
            providedLabType: labType,
            allowedLabTypes: ALLOWED_LAB_TYPES.map(t => t.toUpperCase()),
            message: "Lab type must be one of: CBC, Urinalysis, or Lipid Profile"
          }
        });
      }

      // Step 1: Extract text using OCR
      const ocrResult = await extractTextFromImage(req.file.buffer, normalizedLabType);

      // Step 1.5: Validate OCR text matches selected lab type
      const ocrValidation = validateLabType(ocrResult.text, normalizedLabType);
      
      if (!ocrValidation.isValid) {
        console.log('[Validation Failed]', {
          labType: normalizedLabType,
          confidence: ocrValidation.confidence,
          reasons: ocrValidation.reasons,
          matchedKeywords: ocrValidation.matchedKeywords,
          matchedParameters: ocrValidation.matchedParameters
        });
        
        return res.status(422).json({
          code: 'INVALID_LAB_IMAGE',
          message: 'The uploaded image does not appear to be a valid lab report for the selected type',
          details: {
            selectedLabType: normalizedLabType.toUpperCase(),
            confidenceTier: ocrValidation.confidence >= 0.8 ? 'high' : 
                           ocrValidation.confidence >= 0.5 ? 'medium' : 'low',
            confidence: Math.round(ocrValidation.confidence * 100),
            reasons: ocrValidation.reasons,
            suggestions: [
              `Make sure the image is a ${normalizedLabType.toUpperCase()} lab report`,
              'Ensure the image is clear and well-lit',
              'Verify all text in the report is readable',
              'Try uploading a different image if this persists'
            ]
          }
        });
      }

      // Step 1.6: Validate parsed values match expected lab type parameters
      const parsedValidation = validateParsedValues(ocrResult.parsedValues, normalizedLabType);
      
      if (!parsedValidation.isValid) {
        console.log('[Parsed Values Validation Failed]', {
          labType: normalizedLabType,
          confidence: parsedValidation.confidence,
          reasons: parsedValidation.reasons,
          parsedKeys: Object.keys(ocrResult.parsedValues)
        });
        
        return res.status(422).json({
          code: 'MISMATCHED_LAB_TYPE',
          message: `The extracted lab values do not match the ${normalizedLabType.toUpperCase()} format`,
          details: {
            selectedLabType: normalizedLabType.toUpperCase(),
            confidenceTier: parsedValidation.confidence >= 0.8 ? 'high' : 
                           parsedValidation.confidence >= 0.5 ? 'medium' : 'low',
            confidence: Math.round(parsedValidation.confidence * 100),
            reasons: parsedValidation.reasons,
            suggestions: [
              'Verify you selected the correct lab type',
              `Check if the report is actually a ${normalizedLabType.toUpperCase()} test`,
              'Ensure the entire report is visible in the image',
              'Try uploading a clearer image'
            ]
          }
        });
      }

      console.log('[Validation Passed]', {
        labType: normalizedLabType,
        ocrConfidence: ocrValidation.confidence,
        parsedConfidence: parsedValidation.confidence,
        matchedParameters: parsedValidation.matchedParameters
      });

      // Step 2: Analyze lab results using ML (includes comprehensive analysis)
      const analysisResult = await analyzeLabResults(normalizedLabType, ocrResult.parsedValues);

      // Extract comprehensive analysis (already generated in analyzeLabResults)
      const comprehensiveAnalysis = analysisResult.comprehensiveAnalysis;

      // Step 3: Use corrected risk assessment if available
      const finalRiskLevel = comprehensiveAnalysis?.correctedRiskLevel || analysisResult.riskLevel;
      const finalRiskScore = comprehensiveAnalysis?.correctedRiskScore || analysisResult.riskScore;
      
      console.log('[Risk Assessment]', {
        mlRisk: analysisResult.riskLevel,
        mlScore: analysisResult.riskScore,
        finalRisk: finalRiskLevel,
        finalScore: finalRiskScore
      });

      // Step 5: Save to Firebase with corrected risk
      const labResultId = await saveLabResult({
        userId,
        imageUrl: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedAt: new Date(),
        status: 'completed',
        labType: normalizedLabType,
      });

      const analysisId = await saveHealthAnalysis({
        labResultId,
        userId,
        analyzedAt: new Date(),
        riskLevel: finalRiskLevel,
        riskScore: finalRiskScore,
        findings: analysisResult.findings,
        healthInsights: analysisResult.healthInsights,
        lifestyleRecommendations: analysisResult.lifestyleRecommendations,
        dietaryRecommendations: analysisResult.dietaryRecommendations,
        suggestedSpecialists: analysisResult.suggestedSpecialists,
        comprehensiveAnalysis, // Add comprehensive analysis if available
        extractedData: {
          rawText: ocrResult.text,
          parsedValues: ocrResult.parsedValues,
        },
      });

      // Merge specialists from both sources
      const mergedSpecialists = comprehensiveAnalysis?.suggestedSpecialists && comprehensiveAnalysis.suggestedSpecialists.length > 0
        ? comprehensiveAnalysis.suggestedSpecialists.map(s => ({
            type: s.type,
            reason: s.reason,
            urgency: s.urgency
          }))
        : analysisResult.suggestedSpecialists.map(spec => ({
            type: typeof spec === 'string' ? spec : spec.type,
            reason: typeof spec === 'string' 
              ? 'Consultation recommended based on your lab results' 
              : spec.reason || 'Consultation recommended based on your lab results',
            urgency: 'routine' as const
          }));

      // Return combined results with comprehensive analysis and corrected risk
      res.json({
        success: true,
        data: {
          labResultId,
          analysisId,
          ocrResult: {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            parsedValues: ocrResult.parsedValues,
          },
          analysis: {
            ...analysisResult,
            riskLevel: finalRiskLevel, // Use corrected risk level
            riskScore: finalRiskScore, // Use corrected risk score
            suggestedSpecialists: mergedSpecialists, // Use merged specialists
            comprehensiveAnalysis, // Include comprehensive analysis in response
          },
          labType: normalizedLabType,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      console.error("Upload error:", error);
      res.status(500).json({ error: (error as { message?: string }).message || "Failed to process lab result" });
    }
  });

  // Get health tips
  app.get("/api/health-tips", (req, res) => {
    const { category } = req.query;

    const healthTips = [
      // Nutrition Tips
      {
        id: "1",
        title: "Stay Hydrated",
        content: "Drink at least 8 glasses of water daily. Proper hydration supports kidney function, helps regulate body temperature, and aids in nutrient transportation throughout your body. Start your day with a glass of water and keep a water bottle with you.",
        category: "nutrition",
        icon: "Apple",
      },
      {
        id: "2",
        title: "Eat More Vegetables",
        content: "Fill half your plate with colorful vegetables at each meal. Vegetables are rich in vitamins, minerals, and fiber while being low in calories. Aim for a variety of colors to get different nutrients - dark greens, reds, oranges, and yellows.",
        category: "nutrition",
        icon: "Apple",
      },
      {
        id: "3",
        title: "Limit Processed Foods",
        content: "Reduce consumption of processed and ultra-processed foods high in added sugars, sodium, and unhealthy fats. Choose whole, unprocessed foods like fresh fruits, vegetables, whole grains, and lean proteins for better health outcomes.",
        category: "nutrition",
        icon: "Apple",
      },
      {
        id: "4",
        title: "Healthy Fats Matter",
        content: "Include sources of healthy fats like avocados, nuts, seeds, olive oil, and fatty fish in your diet. These omega-3 rich foods support brain health, reduce inflammation, and help maintain healthy cholesterol levels.",
        category: "nutrition",
        icon: "Apple",
      },
      {
        id: "5",
        title: "Portion Control",
        content: "Use smaller plates, eat slowly, and pay attention to hunger cues. Stop eating when you're 80% full. This practice helps maintain a healthy weight and prevents overeating while improving digestion.",
        category: "nutrition",
        icon: "Apple",
      },
      {
        id: "6",
        title: "Reduce Added Sugars",
        content: "Limit added sugars to less than 10% of daily calories. Read nutrition labels and avoid sugary drinks, candies, and processed snacks. Excess sugar intake increases risk of diabetes, heart disease, and obesity.",
        category: "nutrition",
        icon: "Apple",
      },

      // Exercise Tips
      {
        id: "7",
        title: "Regular Exercise",
        content: "Aim for 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity per week. Regular exercise strengthens your cardiovascular system, boosts immunity, and improves mental health. Find activities you enjoy to stay consistent.",
        category: "exercise",
        icon: "Dumbbell",
      },
      {
        id: "8",
        title: "Strength Training",
        content: "Include resistance training at least 2-3 times per week. Building muscle mass improves metabolism, bone density, balance, and overall functional fitness. Use weights, resistance bands, or bodyweight exercises.",
        category: "exercise",
        icon: "Dumbbell",
      },
      {
        id: "9",
        title: "Stay Active Throughout the Day",
        content: "Break up long periods of sitting with movement. Stand up every hour, take short walks, use stairs instead of elevators. Even light activity throughout the day improves circulation and reduces health risks from prolonged sitting.",
        category: "exercise",
        icon: "Dumbbell",
      },
      {
        id: "10",
        title: "Stretch Daily",
        content: "Dedicate 10-15 minutes daily to stretching exercises. Stretching improves flexibility, reduces muscle tension, prevents injury, and enhances range of motion. Focus on major muscle groups and hold each stretch for 15-30 seconds.",
        category: "exercise",
        icon: "Dumbbell",
      },
      {
        id: "11",
        title: "Mix Cardio and Strength",
        content: "Combine cardiovascular exercise with strength training for optimal health benefits. This combination improves heart health, builds muscle, burns fat, and enhances overall fitness more effectively than either alone.",
        category: "exercise",
        icon: "Dumbbell",
      },

      // Sleep Tips
      {
        id: "12",
        title: "Quality Sleep",
        content: "Get 7-9 hours of sleep each night. Quality sleep is essential for cellular repair, memory consolidation, immune function, and hormone regulation. Maintain a consistent sleep schedule, even on weekends.",
        category: "sleep",
        icon: "Moon",
      },
      {
        id: "13",
        title: "Create a Sleep Routine",
        content: "Establish a relaxing bedtime routine 30-60 minutes before sleep. Dim lights, avoid screens, read a book, or practice gentle stretches. A consistent routine signals your body it's time to wind down.",
        category: "sleep",
        icon: "Moon",
      },
      {
        id: "14",
        title: "Optimize Sleep Environment",
        content: "Keep your bedroom cool (65-68°F), dark, and quiet. Invest in a comfortable mattress and pillows. Remove electronic devices and use blackout curtains if needed. A proper sleep environment improves sleep quality significantly.",
        category: "sleep",
        icon: "Moon",
      },
      {
        id: "15",
        title: "Limit Screen Time Before Bed",
        content: "Avoid screens 1-2 hours before bedtime. Blue light from devices suppresses melatonin production, making it harder to fall asleep. If you must use devices, enable blue light filters or wear blue-blocking glasses.",
        category: "sleep",
        icon: "Moon",
      },
      {
        id: "16",
        title: "Watch Caffeine Intake",
        content: "Avoid caffeine 6-8 hours before bedtime. Caffeine has a half-life of 5-6 hours and can disrupt sleep even if consumed in the afternoon. Switch to herbal tea or water in the evening.",
        category: "sleep",
        icon: "Moon",
      },

      // Mental Health Tips
      {
        id: "17",
        title: "Stress Management",
        content: "Practice mindfulness, meditation, or deep breathing exercises daily. Managing stress effectively reduces cortisol levels, improves mental clarity, and enhances overall health outcomes. Even 5-10 minutes daily makes a difference.",
        category: "mental-health",
        icon: "Heart",
      },
      {
        id: "18",
        title: "Social Connections",
        content: "Maintain strong social relationships and spend quality time with loved ones. Social connections reduce stress, boost mood, and are linked to increased longevity. Make time for meaningful conversations and activities with others.",
        category: "mental-health",
        icon: "Heart",
      },
      {
        id: "19",
        title: "Practice Gratitude",
        content: "Write down 3 things you're grateful for each day. Gratitude practice improves mental well-being, reduces depression, enhances sleep quality, and increases overall life satisfaction. Focus on small, specific moments.",
        category: "mental-health",
        icon: "Heart",
      },
      {
        id: "20",
        title: "Set Healthy Boundaries",
        content: "Learn to say no and prioritize your mental health. Setting boundaries protects your time, energy, and emotional well-being. It's okay to decline commitments that don't align with your values or capacity.",
        category: "mental-health",
        icon: "Heart",
      },
      {
        id: "21",
        title: "Spend Time in Nature",
        content: "Get outside for at least 20 minutes daily. Exposure to nature reduces stress hormones, improves mood, boosts creativity, and enhances mental clarity. Take walks in parks, gardens, or natural settings when possible.",
        category: "mental-health",
        icon: "Heart",
      },
      {
        id: "22",
        title: "Limit News Consumption",
        content: "Set specific times to check news and social media rather than constantly scrolling. Excessive exposure to negative news increases anxiety and stress. Stay informed but protect your mental health with intentional boundaries.",
        category: "mental-health",
        icon: "Heart",
      },

      // Prevention Tips
      {
        id: "23",
        title: "Regular Check-ups",
        content: "Schedule annual health screenings and follow up on lab results. Early detection of health issues significantly improves treatment outcomes. Stay current with age-appropriate screenings for cholesterol, blood pressure, and cancer.",
        category: "prevention",
        icon: "Shield",
      },
      {
        id: "24",
        title: "Wash Hands Regularly",
        content: "Wash hands with soap and water for at least 20 seconds, especially before eating and after using the restroom. Proper hand hygiene prevents spread of infections and reduces illness risk by up to 30%.",
        category: "prevention",
        icon: "Shield",
      },
      {
        id: "25",
        title: "Sun Protection",
        content: "Use broad-spectrum SPF 30+ sunscreen daily, even on cloudy days. Wear protective clothing and seek shade during peak sun hours (10am-4pm). Sun protection reduces skin cancer risk and prevents premature aging.",
        category: "prevention",
        icon: "Shield",
      },
      {
        id: "26",
        title: "Stay Up-to-Date on Vaccinations",
        content: "Keep vaccinations current including annual flu shots and recommended boosters. Vaccines prevent serious illnesses and protect vulnerable populations. Consult your healthcare provider about age-appropriate immunizations.",
        category: "prevention",
        icon: "Shield",
      },
      {
        id: "27",
        title: "Dental Health",
        content: "Brush teeth twice daily, floss once daily, and visit your dentist every 6 months. Poor oral health is linked to heart disease, diabetes, and other systemic conditions. Good dental hygiene prevents cavities and gum disease.",
        category: "prevention",
        icon: "Shield",
      },
      {
        id: "28",
        title: "Know Your Family History",
        content: "Document your family's health history and share it with your healthcare provider. Genetic predispositions to certain conditions allow for earlier screening and preventive measures. This information guides personalized health strategies.",
        category: "prevention",
        icon: "Shield",
      },
      {
        id: "29",
        title: "Avoid Smoking and Limit Alcohol",
        content: "Don't smoke or use tobacco products. Limit alcohol to moderate levels - up to 1 drink per day for women, 2 for men. These lifestyle changes dramatically reduce risk of cancer, heart disease, and liver problems.",
        category: "prevention",
        icon: "Shield",
      },
      {
        id: "30",
        title: "Practice Safe Food Handling",
        content: "Wash produce thoroughly, cook meats to safe temperatures, and refrigerate perishables promptly. Proper food safety prevents foodborne illnesses. Avoid cross-contamination by using separate cutting boards for raw meats and vegetables.",
        category: "prevention",
        icon: "Shield",
      },
    ];

    const filtered = category && category !== "all"
      ? healthTips.filter(tip => tip.category === category)
      : healthTips;

    res.json({ success: true, data: filtered });
  });

  // Get user's lab results and analyses
  app.get("/api/user/:userId/data", async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const [labResults, analyses] = await Promise.all([
        getLabResultsByUserId(userId),
        getHealthAnalysesByUserId(userId),
      ]);

      // if the user has no results yet, insert two realistic example records automatically
      if (labResults.length === 0) {
        console.log(`🔁 No lab results for ${userId}, inserting example records`);
        const now = new Date();
        // urinalysis sample with detailed context
        const uaId = await saveLabResult({
          userId,
          imageUrl: '',
          fileName: 'urinalysis-sample.png',
          fileSize: 0,
          uploadedAt: now,
          status: 'completed',
          labType: 'urinalysis',
        });
        console.log(`✅ Created urinalysis lab result: ${uaId}`);
        
        const uaAnalysis = await saveHealthAnalysis({
          labResultId: uaId,
          userId,
          analyzedAt: now,
          riskLevel: 'low',
          riskScore: 5,
          findings: 'Urinalysis from a routine physical shows clear yellow urine with a pH of 6.5 and specific gravity of 1.015. No protein, glucose, ketones, blood, bilirubin, or nitrites were detected. Microscopic evaluation would likely reveal no cells or casts, indicating good renal function and hydration.',
          healthInsights: [
            'Color and clarity indicate adequate hydration.',
            'pH is within the normal range of 4.5–8.0 which suggests balanced acid-base status.',
          ],
          lifestyleRecommendations: ['Maintain fluid intake of 2–3 liters per day and monitor urine color for changes.'],
          dietaryRecommendations: ['Continue a balanced diet rich in fruits and vegetables and limit high-sodium foods.'],
          suggestedSpecialists: [],
          extractedData: {
            rawText: 'pH 6.5\nColor Yellow\nClarity Clear',
            parsedValues: { ph: 6.5, color: 'yellow', clarity: 'clear' },
          },
          comprehensiveAnalysis: {
            detailedFindings: 'The urinalysis specimen presents as clear with a pale yellow color, pH 6.5, and specific gravity of 1.015, all within normal ranges. Comprehensive testing reveals negative results for protein, glucose, ketones, blood, bilirubin, and nitrites, indicating excellent renal filtration and metabolic function. Microscopic examination would typically show minimal or no cells, casts, or crystals. These findings denote healthy kidney function, appropriate hydration status, and no evidence of urinary tract infection, diabetes complications, or metabolic disorders. Continue current lifestyle and monitor annually or as clinically indicated.',
            labValueBreakdown: [
              { parameter: 'pH', value: '6.5', normalRange: '4.5-8.0', status: 'normal', interpretation: 'Optimal acid-base balance maintained; reflects healthy dietary pattern.' },
              { parameter: 'Color', value: 'Yellow', normalRange: 'Straw to amber', status: 'normal', interpretation: 'Pale yellow indicates adequate hydration and normal urochrome concentration.' },
              { parameter: 'Clarity', value: 'Clear', normalRange: 'Clear', status: 'normal', interpretation: 'Absence of crystals, cells, or debris supports healthy renal function.' },
              { parameter: 'Specific Gravity', value: '1.015', normalRange: '1.005-1.030', status: 'normal', interpretation: 'Normal concentration of solutes; reflects balanced fluid intake and kidney concentrating ability.' },
              { parameter: 'Protein', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No proteinuria; glomerular filtration barrier intact.' },
              { parameter: 'Glucose', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'Blood glucose remains below renal threshold; no diabetes mellitus indicators.' },
              { parameter: 'Ketones', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No ketone bodies; normal carbohydrate metabolism.' },
              { parameter: 'Blood', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No hematuria; urinary tract is healthy with no bleeding.' },
              { parameter: 'Nitrites', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No bacterial infection; urinary tract is free from gram-negative organisms.' },
              { parameter: 'Leukocytes', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No white blood cells; no inflammatory response in urinary tract.' }
            ],
            lifestyleRecommendations: [
              { category: 'Hydration', recommendation: 'Drink 8–10 glasses of water daily, more during exercise or hot weather.', rationale: 'Maintains optimal urine dilution and supports kidney filtration efficiency.' },
              { category: 'Exercise', recommendation: 'Engage in moderate aerobic activity 150 minutes per week.', rationale: 'Improves cardiovascular and renal blood flow; supports overall metabolic health.' },
              { category: 'Stress Management', recommendation: 'Practice meditation, yoga, or deep breathing for 10–15 minutes daily.', rationale: 'Reduces cortisol levels which can affect kidney function and blood pressure.' },
              { category: 'Sleep Quality', recommendation: 'Maintain 7–9 hours of consistent sleep nightly.', rationale: 'Supports kidney regeneration and hormonal regulation of fluid balance.' },
              { category: 'Regular Check-ups', recommendation: 'Schedule annual urinalysis and renal function tests.', rationale: 'Early detection of any changes ensures prompt intervention and sustained renal health.' }
            ],
            dietaryRecommendations: [
              { category: 'Vegetables', recommendation: 'Consume 2–3 cups of leafy greens and colorful vegetables daily.', rationale: 'Provides antioxidants and minerals that support kidney and urinary tract health.' },
              { category: 'Lean Proteins', recommendation: 'Include poultry, fish, legumes, and tofu in meals.', rationale: 'Supports tissue repair without excessive kidney filtration burden.' },
              { category: 'Sodium Intake', recommendation: 'Limit to under 2,300 mg daily; use herbs for seasoning instead of salt.', rationale: 'Reduces hypertension risk which is a major risk factor for chronic kidney disease.' },
              { category: 'Hydrating Foods', recommendation: 'Eat water-rich foods like cucumbers, melons, and berries.', rationale: 'Contributes to daily fluid intake while providing beneficial phytonutrients.' },
              { category: 'Whole Grains', recommendation: 'Choose whole wheat, oats, quinoa, and brown rice over refined grains.', rationale: 'High fiber content supports healthy digestion and stable blood glucose levels.' }
            ],
            suggestedSpecialists: []
          }
        });
        console.log(`✅ Created urinalysis analysis: ${uaAnalysis}`);

        // CBC sample with expanded context
        const cbcId = await saveLabResult({
          userId,
          imageUrl: '',
          fileName: 'cbc-sample.png',
          fileSize: 0,
          uploadedAt: now,
          status: 'completed',
          labType: 'cbc',
        });
        console.log(`✅ Created CBC lab result: ${cbcId}`);
        
        const cbcAnalysis = await saveHealthAnalysis({
          labResultId: cbcId,
          userId,
          analyzedAt: now,
          riskLevel: 'low',
          riskScore: 10,
          findings: 'Complete blood count is within normal limits: WBC 7.2 ×10^3/µL, RBC 5.1 ×10^6/µL, hemoglobin 14.0 g/dL, hematocrit 42%, and platelets 250 ×10^3/µL. Differential would likely show neutrophils at 55% and lymphocytes at 35%.',
          healthInsights: [
            'No leukocytosis or anemia present.',
            'Platelet count indicates good clotting function.'
          ],
          lifestyleRecommendations: ['Continue regular aerobic exercise and maintain a healthy weight.'],
          dietaryRecommendations: ['Consume lean proteins and iron-rich foods with vitamin C to support hematologic health.'],
          suggestedSpecialists: [],
          extractedData: {
            rawText: 'WBC 7.2\nRBC 5.1\nHemoglobin 14.0',
            parsedValues: { wbc: 7.2, rbc: 5.1, hemoglobin: 14.0 },
          },
          comprehensiveAnalysis: {
            detailedFindings: 'The complete blood count demonstrates excellent hematologic status with all parameters within normal reference ranges. White blood cell count of 7.2 K/uL indicates an intact immune system with no acute infection or inflammatory process. Red blood cell count of 5.1 M/uL coupled with hemoglobin of 14.0 g/dL and hematocrit of 42% indicates optimal oxygen-carrying capacity and no anemia. Platelet count of 250 K/uL reflects normal coagulation potential. Differential white blood cell count shows expected proportions with neutrophils at 55% and lymphocytes at 35%, suggesting balanced immune competence. Mean corpuscular volume (MCV) of 88 fL and mean corpuscular hemoglobin (MCH) of 27 pg indicate normocytic, normochromic red blood cells. Overall, these results indicate excellent hematologic integrity and optimal immune function.',
            labValueBreakdown: [
              { parameter: 'WBC', value: '7.2', normalRange: '4.5-11.0 K/uL', status: 'normal', interpretation: 'Optimal immune cell count; no active infection or immune suppression detected.' },
              { parameter: 'RBC', value: '5.1', normalRange: '4.2-5.9 M/uL', status: 'normal', interpretation: 'Adequate red cell mass supports oxygen delivery to all tissues.' },
              { parameter: 'Hemoglobin', value: '14.0', normalRange: '12.0-17.5 g/dL', status: 'normal', interpretation: 'Oxygen-carrying protein within optimal range; no anemia present.' },
              { parameter: 'Hematocrit', value: '42%', normalRange: '36-46%', status: 'normal', interpretation: 'Percentage of red blood cells in blood volume is healthy.' },
              { parameter: 'Platelets', value: '250', normalRange: '150-400 K/uL', status: 'normal', interpretation: 'Normal platelet count supports healthy clotting and hemostasis.' },
              { parameter: 'MCV (Mean Corpuscular Volume)', value: '88', normalRange: '80-100 fL', status: 'normal', interpretation: 'Red blood cells are appropriately sized; no macro- or microcytosis.' },
              { parameter: 'MCH (Mean Corpuscular Hemoglobin)', value: '27', normalRange: '27-33 pg', status: 'normal', interpretation: 'Hemoglobin content per cell is optimal.' },
              { parameter: 'MCHC (Mean Corpuscular Hemoglobin Concentration)', value: '34%', normalRange: '32-36%', status: 'normal', interpretation: 'Hemoglobin concentration in red cells is within expected range.' },
              { parameter: 'Neutrophils', value: '55%', normalRange: '50-70%', status: 'normal', interpretation: 'Primary immune defender cells at appropriate levels.' },
              { parameter: 'Lymphocytes', value: '35%', normalRange: '20-40%', status: 'normal', interpretation: 'Adaptive immune cells present in balanced proportion.' }
            ],
            lifestyleRecommendations: [
              { category: 'Cardiovascular Exercise', recommendation: 'Perform 150 minutes of moderate aerobic activity weekly, such as brisk walking, cycling, or swimming.', rationale: 'Strengthens heart, improves blood circulation, and enhances oxygen delivery; supports hematologic stability.' },
              { category: 'Strength Training', recommendation: 'Include resistance exercises 2–3 times per week targeting major muscle groups.', rationale: 'Builds muscle mass which increases metabolic rate and improves bone health; supports red blood cell homeostasis.' },
              { category: 'Sleep Optimization', recommendation: 'Maintain 7–9 hours of quality sleep with consistent schedules.', rationale: 'Allows bone marrow to regenerate blood cells; essential for immune cell production.' },
              { category: 'Stress Reduction', recommendation: 'Practice mindfulness meditation, tai chi, or yoga for 15–20 minutes daily.', rationale: 'Lowers cortisol and inflammatory markers; supports immune regulation.' },
              { category: 'Smoking Cessation', recommendation: 'Avoid tobacco and secondhand smoke exposure completely.', rationale: 'Smoking impairs oxygen delivery and increases carbon monoxide, reducing hemoglobin efficiency.' }
            ],
            dietaryRecommendations: [
              { category: 'Iron-Rich Foods', recommendation: 'Consume red meat (beef, lean), organ meats (chicken liver), legumes (lentils, beans), and dark leafy greens 3–4 times per week.', rationale: 'Provides heme and non-heme iron essential for hemoglobin synthesis and red blood cell production.' },
              { category: 'Vitamin C Sources', recommendation: 'Include citrus fruits, berries, bell peppers, and tomatoes with iron-containing meals.', rationale: 'Enhances non-heme iron absorption; supports immune function and collagen formation.' },
              { category: 'Protein Intake', recommendation: 'Include 0.8–1.0 gram of protein per kilogram of body weight from diverse sources.', rationale: 'Supports hemoglobin synthesis, immune cell production, and tissue repair.' },
              { category: 'B Vitamins', recommendation: 'Eat fortified cereals, eggs, dairy, fish, and legumes for B6, B12, and folate.', rationale: 'B vitamins are cofactors for red blood cell maturation and DNA synthesis.' },
              { category: 'Copper & Zinc', recommendation: 'Include nuts, seeds, shellfish, and whole grains regularly.', rationale: 'These minerals are essential cofactors for hemoglobin formation and immune function.' }
            ],
            suggestedSpecialists: []
          }
        });
        console.log(`✅ Created CBC analysis: ${cbcAnalysis}`);

        // re-fetch after seeding
        const refreshed = await getLabResultsByUserId(userId);
        const refreshedAnalyses = await getHealthAnalysesByUserId(userId);
        console.log(`✅ Seeding complete for ${userId}: ${refreshed.length} results, ${refreshedAnalyses.length} analyses`);
        return res.json({ success: true, data: { labResults: refreshed, analyses: refreshedAnalyses } });
      }

      res.json({
        success: true,
        data: {
          labResults,
          analyses,
        },
      });
    } catch (error: unknown) {
      console.error("Fetch data error:", error);
      res.status(500).json({ error: (error as { message?: string }).message || "Failed to fetch user data" });
    }
  });

  // Get user's saved location
  app.get("/api/user/:userId/location", async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const location = await getUserLocation(userId);

      if (!location) {
        return res.json({
          success: true,
          data: null,
        });
      }

      res.json({
        success: true,
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          locationEnabled: location.locationEnabled,
          updatedAt: location.updatedAt,
        },
      });
    } catch (error: unknown) {
      console.error("Fetch location error:", error);
      res.status(500).json({ error: (error as { message?: string }).message || "Failed to fetch user location" });
    }
  });

  // Save user's location
  app.post("/api/user/:userId/location", async (req, res) => {
    try {
      const { userId } = req.params;
      const { latitude, longitude, accuracy } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: "Latitude and longitude are required and must be numbers" });
      }

      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: "Latitude must be between -90 and 90" });
      }

      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: "Longitude must be between -180 and 180" });
      }

      await saveUserLocation(userId, {
        latitude,
        longitude,
        accuracy: accuracy || 0,
      });

      res.json({
        success: true,
        message: "Location saved successfully",
      });
    } catch (error: unknown) {
      console.error("Save location error:", error);
      res.status(500).json({ error: (error as { message?: string }).message || "Failed to save user location" });
    }
  });

  // Get nearby hospitals
  app.get("/api/hospitals/nearby", (req, res) => {
    const { lat, lng } = req.query;
    
    // Validate lat/lng parameters if provided
    if ((lat && !lng) || (!lat && lng)) {
      return res.status(400).json({ error: "Both latitude and longitude are required for location-based search" });
    }
    
    if (lat && lng) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Invalid latitude or longitude values" });
      }
      
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: "Latitude must be between -90 and 90" });
      }
      
      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: "Longitude must be between -180 and 180" });
      }
    }
    
    // Haversine formula to calculate distance between two GPS coordinates (in miles)
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    // Real Philippine hospital data with exact GPS coordinates
    // These are verified hospital coordinates - do NOT modify them based on user location
    const baseHospitals = [
      {
        id: "1",
        name: "Philippine General Hospital",
        address: "Taft Ave, Ermita, Manila, 1000 Metro Manila, Philippines",
        specialties: ["Emergency Care", "Cardiology", "Neurology"],
        rating: 4.5,
        phoneNumber: "+63 (2) 8554-8400",
        latitude: 14.577561,
        longitude: 120.986015,
        isOpen24Hours: true,
      },
      {
        id: "2",
        name: "St. Luke's Medical Center",
        address: "5th Ave, Taguig, 1634 Metro Manila, Philippines",
        specialties: ["Emergency Care", "Oncology", "Pediatrics"],
        rating: 4.7,
        phoneNumber: "+63 (2) 8789-7700",
        latitude: 14.55547,
        longitude: 121.0484,
        isOpen24Hours: true,
      },
      {
        id: "3",
        name: "Makati Medical Center",
        address: "2 Amorsolo Street, Legazpi Village, Makati, 1229 Metro Manila, Philippines",
        specialties: ["Emergency Care", "Cardiology", "Orthopedics"],
        rating: 4.6,
        phoneNumber: "+63 (2) 8888-8999",
        latitude: 14.550367,
        longitude: 121.015849,
        isOpen24Hours: true,
      },
      {
        id: "4",
        name: "The Medical City",
        address: "Ortigas Ave, Pasig, 1800 Metro Manila, Philippines",
        specialties: ["Emergency Care", "Laboratory Services", "Radiology"],
        rating: 4.5,
        phoneNumber: "+63 (2) 8988-1000",
        latitude: 14.58986,
        longitude: 121.06932,
        isOpen24Hours: true,
      },
      {
        id: "5",
        name: "Manila Doctors Hospital",
        address: "667 United Nations Ave, Ermita, Manila, 1000 Metro Manila, Philippines",
        specialties: ["Emergency Care", "Internal Medicine", "Surgery"],
        rating: 4.4,
        phoneNumber: "+63 (2) 8558-0888",
        latitude: 14.5819,
        longitude: 120.9826,
        isOpen24Hours: true,
      },
    ];

    // Calculate distance from user's location to each hospital if coordinates provided
    const hospitalsWithDistance = baseHospitals.map(hospital => {
      if (lat && lng) {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        const distance = calculateDistance(userLat, userLng, hospital.latitude, hospital.longitude);
        return {
          ...hospital,
          distance: parseFloat(distance.toFixed(1)),
        };
      }
      return {
        ...hospital,
        distance: parseFloat((Math.random() * 5 + 0.5).toFixed(1)), // Random distance if no coords
      };
    });

    // Sort by distance (nearest first)
    const sortedHospitals = hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

    res.json(sortedHospitals);
  });

  // Delete individual analysis record (authenticated)
  app.delete("/api/analyses/:analysisId", authenticateFirebaseToken, async (req, res) => {
    try {
      const { analysisId } = req.params;
      
      // Get userId from verified Firebase token (set by authenticateFirebaseToken middleware)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userId = (req as any).user?.uid;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      if (!analysisId) {
        return res.status(400).json({ error: "Analysis ID is required" });
      }

      // Get the analysis first to verify ownership and get labResultId
      const analyses = await getHealthAnalysesByUserId(userId);
      const analysisToDelete = analyses.find(a => a.id === analysisId);
      
      if (!analysisToDelete) {
        return res.status(404).json({ error: "Analysis not found or unauthorized" });
      }

      // Delete the health analysis (userId already verified by Firebase token)
      await deleteHealthAnalysis(analysisId, userId);

      // Delete the associated lab result if it exists
      if (analysisToDelete.labResultId) {
        try {
          await deleteLabResult(analysisToDelete.labResultId, userId);
        } catch (error) {
          console.error('Lab result deletion failed (non-critical):', error);
          // Continue even if lab result deletion fails
        }
      }

      res.json({
        success: true,
        message: "Analysis record has been successfully deleted",
      });
    } catch (error: unknown) {
      console.error("Delete analysis error:", error);
      const errorMsg = (error as { message?: string }).message || "Failed to delete analysis";
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('not found')) {
        return res.status(404).json({ error: errorMsg });
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // Delete user data
  app.delete("/api/user/:userId/data", async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      await deleteFirebaseUserData(userId);

      res.json({
        success: true,
        message: "Your data has been permanently deleted from MEDiscan's records.",
      });
    } catch (error: unknown) {
      console.error("Delete error:", error);
      res.status(500).json({ error: (error as { message?: string }).message || "Failed to delete user data" });
    }
  });

  // Debug endpoint: reseed data for a user
  app.post("/api/debug/reseed/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      console.log(`🔁 [DEBUG] Force reseeding for ${userId}...`);

      // Delete existing records
      const existing = await getLabResultsByUserId(userId);
      for (const result of existing) {
        const analyses = await getHealthAnalysesByUserId(userId);
        for (const analysis of analyses.filter(a => a.labResultId === result.id)) {
          await deleteHealthAnalysis(analysis.id, userId);
        }
        await deleteLabResult(result.id, userId);
      }

      console.log(`🧹 Deleted ${existing.length} existing records`);

      // Re-seed
      const now = new Date();
      const uaId = await saveLabResult({
        userId,
        imageUrl: '',
        fileName: 'urinalysis-sample.png',
        fileSize: 0,
        uploadedAt: now,
        status: 'completed',
        labType: 'urinalysis',
      });

      await saveHealthAnalysis({
        labResultId: uaId,
        userId,
        analyzedAt: now,
        riskLevel: 'low',
        riskScore: 5,
        findings: 'Urinalysis from a routine physical shows clear yellow urine with a pH of 6.5 and specific gravity of 1.015. No protein, glucose, ketones, blood, bilirubin, or nitrites were detected. Microscopic evaluation would likely reveal no cells or casts, indicating good renal function and hydration.',
        healthInsights: [
          'Color and clarity indicate adequate hydration.',
          'pH is within the normal range of 4.5–8.0 which suggests balanced acid-base status.',
        ],
        lifestyleRecommendations: ['Maintain fluid intake of 2–3 liters per day and monitor urine color for changes.'],
        dietaryRecommendations: ['Continue a balanced diet rich in fruits and vegetables and limit high-sodium foods.'],
        suggestedSpecialists: [],
        extractedData: {
          rawText: 'pH 6.5\nColor Yellow\nClarity Clear',
          parsedValues: { ph: 6.5, color: 'yellow', clarity: 'clear' },
        },
        comprehensiveAnalysis: {
          detailedFindings: 'The urinalysis specimen presents as clear with a pale yellow color, pH 6.5, and specific gravity of 1.015, all within normal ranges. Comprehensive testing reveals negative results for protein, glucose, ketones, blood, bilirubin, and nitrites, indicating excellent renal filtration and metabolic function. Microscopic examination would typically show minimal or no cells, casts, or crystals. These findings denote healthy kidney function, appropriate hydration status, and no evidence of urinary tract infection, diabetes complications, or metabolic disorders. Continue current lifestyle and monitor annually or as clinically indicated.',
          labValueBreakdown: [
            { parameter: 'pH', value: '6.5', normalRange: '4.5-8.0', status: 'normal', interpretation: 'Optimal acid-base balance maintained; reflects healthy dietary pattern.' },
            { parameter: 'Color', value: 'Yellow', normalRange: 'Straw to amber', status: 'normal', interpretation: 'Pale yellow indicates adequate hydration and normal urochrome concentration.' },
            { parameter: 'Clarity', value: 'Clear', normalRange: 'Clear', status: 'normal', interpretation: 'Absence of crystals, cells, or debris supports healthy renal function.' },
            { parameter: 'Specific Gravity', value: '1.015', normalRange: '1.005-1.030', status: 'normal', interpretation: 'Normal concentration of solutes; reflects balanced fluid intake and kidney concentrating ability.' },
            { parameter: 'Protein', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No proteinuria; glomerular filtration barrier intact.' },
            { parameter: 'Glucose', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'Blood glucose remains below renal threshold; no diabetes mellitus indicators.' },
            { parameter: 'Ketones', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No ketone bodies; normal carbohydrate metabolism.' },
            { parameter: 'Blood', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No hematuria; urinary tract is healthy with no bleeding.' },
            { parameter: 'Nitrites', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No bacterial infection; urinary tract is free from gram-negative organisms.' },
            { parameter: 'Leukocytes', value: 'Negative', normalRange: 'Negative', status: 'normal', interpretation: 'No white blood cells; no inflammatory response in urinary tract.' }
          ],
          lifestyleRecommendations: [
            { category: 'Hydration', recommendation: 'Drink 8–10 glasses of water daily, more during exercise or hot weather.', rationale: 'Maintains optimal urine dilution and supports kidney filtration efficiency.' },
            { category: 'Exercise', recommendation: 'Engage in moderate aerobic activity 150 minutes per week.', rationale: 'Improves cardiovascular and renal blood flow; supports overall metabolic health.' },
            { category: 'Stress Management', recommendation: 'Practice meditation, yoga, or deep breathing for 10–15 minutes daily.', rationale: 'Reduces cortisol levels which can affect kidney function and blood pressure.' },
            { category: 'Sleep Quality', recommendation: 'Maintain 7–9 hours of consistent sleep nightly.', rationale: 'Supports kidney regeneration and hormonal regulation of fluid balance.' },
            { category: 'Regular Check-ups', recommendation: 'Schedule annual urinalysis and renal function tests.', rationale: 'Early detection of any changes ensures prompt intervention and sustained renal health.' }
          ],
          dietaryRecommendations: [
            { category: 'Vegetables', recommendation: 'Consume 2–3 cups of leafy greens and colorful vegetables daily.', rationale: 'Provides antioxidants and minerals that support kidney and urinary tract health.' },
            { category: 'Lean Proteins', recommendation: 'Include poultry, fish, legumes, and tofu in meals.', rationale: 'Supports tissue repair without excessive kidney filtration burden.' },
            { category: 'Sodium Intake', recommendation: 'Limit to under 2,300 mg daily; use herbs for seasoning instead of salt.', rationale: 'Reduces hypertension risk which is a major risk factor for chronic kidney disease.' },
            { category: 'Hydrating Foods', recommendation: 'Eat water-rich foods like cucumbers, melons, and berries.', rationale: 'Contributes to daily fluid intake while providing beneficial phytonutrients.' },
            { category: 'Whole Grains', recommendation: 'Choose whole wheat, oats, quinoa, and brown rice over refined grains.', rationale: 'High fiber content supports healthy digestion and stable blood glucose levels.' }
          ],
          suggestedSpecialists: []
        }
      });

      const cbcId = await saveLabResult({
        userId,
        imageUrl: '',
        fileName: 'cbc-sample.png',
        fileSize: 0,
        uploadedAt: now,
        status: 'completed',
        labType: 'cbc',
      });

      await saveHealthAnalysis({
        labResultId: cbcId,
        userId,
        analyzedAt: now,
        riskLevel: 'low',
        riskScore: 10,
        findings: 'Complete blood count is within normal limits: WBC 7.2 ×10^3/µL, RBC 5.1 ×10^6/µL, hemoglobin 14.0 g/dL, hematocrit 42%, and platelets 250 ×10^3/µL. Differential would likely show neutrophils at 55% and lymphocytes at 35%.',
        healthInsights: [
          'No leukocytosis or anemia present.',
          'Platelet count indicates good clotting function.'
        ],
        lifestyleRecommendations: ['Continue regular aerobic exercise and maintain a healthy weight.'],
        dietaryRecommendations: ['Consume lean proteins and iron-rich foods with vitamin C to support hematologic health.'],
        suggestedSpecialists: [],
        extractedData: {
          rawText: 'WBC 7.2\nRBC 5.1\nHemoglobin 14.0',
          parsedValues: { wbc: 7.2, rbc: 5.1, hemoglobin: 14.0 },
        },
        comprehensiveAnalysis: {
          detailedFindings: 'The complete blood count demonstrates excellent hematologic status with all parameters within normal reference ranges. White blood cell count of 7.2 K/uL indicates an intact immune system with no acute infection or inflammatory process. Red blood cell count of 5.1 M/uL coupled with hemoglobin of 14.0 g/dL and hematocrit of 42% indicates optimal oxygen-carrying capacity and no anemia. Platelet count of 250 K/uL reflects normal coagulation potential. Differential white blood cell count shows expected proportions with neutrophils at 55% and lymphocytes at 35%, suggesting balanced immune competence. Mean corpuscular volume (MCV) of 88 fL and mean corpuscular hemoglobin (MCH) of 27 pg indicate normocytic, normochromic red blood cells. Overall, these results indicate excellent hematologic integrity and optimal immune function.',
          labValueBreakdown: [
            { parameter: 'WBC', value: '7.2', normalRange: '4.5-11.0 K/uL', status: 'normal', interpretation: 'Optimal immune cell count; no active infection or immune suppression detected.' },
            { parameter: 'RBC', value: '5.1', normalRange: '4.2-5.9 M/uL', status: 'normal', interpretation: 'Adequate red cell mass supports oxygen delivery to all tissues.' },
            { parameter: 'Hemoglobin', value: '14.0', normalRange: '12.0-17.5 g/dL', status: 'normal', interpretation: 'Oxygen-carrying protein within optimal range; no anemia present.' },
            { parameter: 'Hematocrit', value: '42%', normalRange: '36-46%', status: 'normal', interpretation: 'Percentage of red blood cells in blood volume is healthy.' },
            { parameter: 'Platelets', value: '250', normalRange: '150-400 K/uL', status: 'normal', interpretation: 'Normal platelet count supports healthy clotting and hemostasis.' },
            { parameter: 'MCV (Mean Corpuscular Volume)', value: '88', normalRange: '80-100 fL', status: 'normal', interpretation: 'Red blood cells are appropriately sized; no macro- or microcytosis.' },
            { parameter: 'MCH (Mean Corpuscular Hemoglobin)', value: '27', normalRange: '27-33 pg', status: 'normal', interpretation: 'Hemoglobin content per cell is optimal.' },
            { parameter: 'MCHC (Mean Corpuscular Hemoglobin Concentration)', value: '34%', normalRange: '32-36%', status: 'normal', interpretation: 'Hemoglobin concentration in red cells is within expected range.' },
            { parameter: 'Neutrophils', value: '55%', normalRange: '50-70%', status: 'normal', interpretation: 'Primary immune defender cells at appropriate levels.' },
            { parameter: 'Lymphocytes', value: '35%', normalRange: '20-40%', status: 'normal', interpretation: 'Adaptive immune cells present in balanced proportion.' }
          ],
          lifestyleRecommendations: [
            { category: 'Cardiovascular Exercise', recommendation: 'Perform 150 minutes of moderate aerobic activity weekly, such as brisk walking, cycling, or swimming.', rationale: 'Strengthens heart, improves blood circulation, and enhances oxygen delivery; supports hematologic stability.' },
            { category: 'Strength Training', recommendation: 'Include resistance exercises 2–3 times per week targeting major muscle groups.', rationale: 'Builds muscle mass which increases metabolic rate and improves bone health; supports red blood cell homeostasis.' },
            { category: 'Sleep Optimization', recommendation: 'Maintain 7–9 hours of quality sleep with consistent schedules.', rationale: 'Allows bone marrow to regenerate blood cells; essential for immune cell production.' },
            { category: 'Stress Reduction', recommendation: 'Practice mindfulness meditation, tai chi, or yoga for 15–20 minutes daily.', rationale: 'Lowers cortisol and inflammatory markers; supports immune regulation.' },
            { category: 'Smoking Cessation', recommendation: 'Avoid tobacco and secondhand smoke exposure completely.', rationale: 'Smoking impairs oxygen delivery and increases carbon monoxide, reducing hemoglobin efficiency.' }
          ],
          dietaryRecommendations: [
            { category: 'Iron-Rich Foods', recommendation: 'Consume red meat (beef, lean), organ meats (chicken liver), legumes (lentils, beans), and dark leafy greens 3–4 times per week.', rationale: 'Provides heme and non-heme iron essential for hemoglobin synthesis and red blood cell production.' },
            { category: 'Vitamin C Sources', recommendation: 'Include citrus fruits, berries, bell peppers, and tomatoes with iron-containing meals.', rationale: 'Enhances non-heme iron absorption; supports immune function and collagen formation.' },
            { category: 'Protein Intake', recommendation: 'Include 0.8–1.0 gram of protein per kilogram of body weight from diverse sources.', rationale: 'Supports hemoglobin synthesis, immune cell production, and tissue repair.' },
            { category: 'B Vitamins', recommendation: 'Eat fortified cereals, eggs, dairy, fish, and legumes for B6, B12, and folate.', rationale: 'B vitamins are cofactors for red blood cell maturation and DNA synthesis.' },
            { category: 'Copper & Zinc', recommendation: 'Include nuts, seeds, shellfish, and whole grains regularly.', rationale: 'These minerals are essential cofactors for hemoglobin formation and immune function.' }
          ],
          suggestedSpecialists: []
        }
      });

      const refreshed = await getLabResultsByUserId(userId);
      const refreshedAnalyses = await getHealthAnalysesByUserId(userId);

      console.log(`✅ [DEBUG] Reseeded ${refreshed.length} lab results and ${refreshedAnalyses.length} analyses`);

      res.json({
        success: true,
        message: `Reseeded ${refreshed.length} records`,
        data: { labResults: refreshed, analyses: refreshedAnalyses }
      });
    } catch (error: unknown) {
      console.error("Debug reseed error:", error);
      res.status(500).json({ error: (error as { message?: string }).message || "Failed to reseed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
