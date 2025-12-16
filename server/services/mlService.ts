// ML Service for health analysis
// Uses Python scikit-learn models via Flask API

import { generateRulesBasedAnalysis, type RulesBasedAnalysis } from './rulesBasedAnalysisService';

const ML_API_URL = process.env.ML_API_URL || 'https://mijsu-labvio-ml-api.hf.space';

export interface HealthAnalysisResult {
  riskLevel: 'low' | 'moderate' | 'high';
  riskScore: number;
  findings: string;
  healthInsights: string[];
  lifestyleRecommendations: string[];
  dietaryRecommendations: string[];
  suggestedSpecialists: Array<{
    type: string;
    reason: string;
    urgency?: 'routine' | 'soon' | 'urgent';
  }>;
  comprehensiveAnalysis?: RulesBasedAnalysis;
}

interface MLPrediction {
  riskLevel: 'low' | 'moderate' | 'high';
  riskScore: number;
  confidence: number;
  probabilities?: {
    low: number;
    moderate: number;
    high: number;
  };
}

async function callPythonML(labValues: Record<string, string | number>, labType: string = 'cbc'): Promise<MLPrediction> {
  try {
    console.log(`\n[ML Service] Calling trained ML model for ${labType.toUpperCase()}`);
    console.log(`[ML Service] Input values:`, JSON.stringify(labValues, null, 2));
    console.log(`[ML Service] API endpoint: ${ML_API_URL}/predict`);

    // Construct the endpoint URL
    const endpoint = `${ML_API_URL}/predict`;

    // Build request body with lab_type for unified model
    const requestBody = {
      ...labValues,
      lab_type: labType
    };

    console.log('Request body:', JSON.stringify(requestBody));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ML API error (${response.status}):`, errorText);
      throw new Error(`ML API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ML Service] SUCCESS - Trained model response:`, JSON.stringify(data));
    console.log(`[ML Service] Model used: ${data.model || 'gradient_boosting_unified'}`);
    console.log(`[ML Service] Risk: ${data.riskLevel} (Score: ${data.riskScore}, Confidence: ${data.confidence}%)\n`);
    return data;
  } catch (error: any) {
    console.error(`[ML Service] ERROR - Failed to call trained ML model:`, error.message);
    console.warn(`[ML Service] FALLBACK - Using default moderate risk (not from trained model)`);
    // Fallback to moderate risk if API fails
    return {
      riskLevel: 'moderate',
      riskScore: 50,
      confidence: 50,
    };
  }
}

export async function analyzeLabResults(
  labType: string,
  extractedValues: Record<string, string | number>
): Promise<HealthAnalysisResult> {
  // Use lab-type-specific ML models for all lab types
  // Each model is trained on data specific to its lab type
  const mlPrediction = await callPythonML(extractedValues, labType);

  // Generate rules-based medical analysis (no OpenAI)
  const comprehensiveAnalysis = generateRulesBasedAnalysis(
    labType,
    extractedValues,
    mlPrediction
  );

  // Convert comprehensive analysis to HealthAnalysisResult format
  return {
    riskLevel: mlPrediction.riskLevel,
    riskScore: mlPrediction.riskScore,
    findings: comprehensiveAnalysis.detailedFindings,
    healthInsights: comprehensiveAnalysis.labValueBreakdown.map(
      lab => `${lab.parameter}: ${lab.interpretation}`
    ),
    lifestyleRecommendations: comprehensiveAnalysis.lifestyleRecommendations.map(
      rec => `[${rec.category}] ${rec.recommendation} - ${rec.rationale}`
    ),
    dietaryRecommendations: comprehensiveAnalysis.dietaryRecommendations.map(
      rec => `[${rec.category}] ${rec.recommendation} - ${rec.rationale}`
    ),
    suggestedSpecialists: comprehensiveAnalysis.suggestedSpecialists.map(
      spec => ({ type: spec.type, reason: spec.reason, urgency: spec.urgency })
    ),
    comprehensiveAnalysis, // Include full detailed analysis
  };
}

function analyzeCBC(
  values: Record<string, string | number>,
  mlPrediction: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number; confidence: number }
): HealthAnalysisResult {
  const wbc = values.wbc as number || 7.5;
  const rbc = values.rbc as number || 4.7;
  const hemoglobin = values.hemoglobin as number || 14.5;

  // Use ML model's prediction as base
  let riskLevel = mlPrediction.riskLevel;
  let riskScore = mlPrediction.riskScore;
  const findings: string[] = [];
  const insights: string[] = [];
  const lifestyleRecs: string[] = [];
  const dietaryRecs: string[] = [];
  const specialists: Array<{type: string; reason: string}> = [];

  // WBC Analysis (normal: 4.5-11.0 K/uL)
  if (wbc < 4.5) {
    riskLevel = 'moderate';
    riskScore = 45;
    findings.push('Low white blood cell count');
    insights.push('Your WBC count is below normal range, which may indicate a weakened immune system.');
    specialists.push({ type: 'Hematologist', reason: 'Low white blood cell count evaluation' });
  } else if (wbc > 11.0) {
    riskLevel = 'moderate';
    riskScore = 50;
    findings.push('Elevated white blood cell count');
    insights.push('Elevated WBC may indicate an infection or inflammation.');
    specialists.push({ type: 'Internal Medicine', reason: 'Investigate cause of elevated WBC' });
  }

  // Hemoglobin Analysis (normal: 13.5-17.5 g/dL for men, 12.0-15.5 for women)
  if (hemoglobin < 12.0) {
    riskLevel = riskLevel === 'low' ? 'moderate' : 'high';
    riskScore = Math.max(riskScore, 55);
    findings.push('Low hemoglobin levels');
    insights.push('Low hemoglobin may indicate anemia, which can cause fatigue and weakness.');
    dietaryRecs.push('Increase iron-rich foods: red meat, spinach, lentils, fortified cereals');
    dietaryRecs.push('Consume vitamin C with iron sources to enhance absorption');
    specialists.push({type: 'Hematologist', reason: 'Anemia diagnosis and treatment'});
  }

  if (findings.length === 0) {
    findings.push('All CBC values are within normal range');
    insights.push('Your complete blood count shows healthy levels across all measured parameters.');
  }

  // General recommendations
  lifestyleRecs.push('Maintain regular sleep schedule (7-9 hours per night)');
  lifestyleRecs.push('Stay hydrated - drink at least 8 glasses of water daily');
  lifestyleRecs.push('Practice stress management through meditation or yoga');

  dietaryRecs.push('Eat a balanced diet rich in fruits and vegetables');
  dietaryRecs.push('Include lean proteins in your daily meals');

  return {
    riskLevel,
    riskScore,
    findings: findings.join('. ') + '.',
    healthInsights: insights,
    lifestyleRecommendations: lifestyleRecs,
    dietaryRecommendations: dietaryRecs,
    suggestedSpecialists: specialists,
  };
}

function analyzeLipidProfile(
  values: Record<string, string | number>,
  mlPrediction: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number; confidence: number }
): HealthAnalysisResult {
  const cholesterol = values.cholesterol as number || 180;
  const hdl = values.hdl as number || 55;
  const ldl = values.ldl as number || 100;
  const triglycerides = values.triglycerides as number || 140;

  // Use ML model's prediction as base
  let riskLevel = mlPrediction.riskLevel;
  let riskScore = mlPrediction.riskScore;
  const findings: string[] = [];
  const insights: string[] = [];
  const lifestyleRecs: string[] = [];
  const dietaryRecs: string[] = [];
  const specialists: Array<{type: string; reason: string}> = [];

  // Total Cholesterol (Desirable: <200 mg/dL)
  if (cholesterol >= 240) {
    riskLevel = 'high';
    riskScore = 75;
    findings.push('High total cholesterol');
    insights.push('High cholesterol increases risk of heart disease and stroke.');
    specialists.push({ type: 'Cardiologist', reason: 'High cholesterol management' });
  } else if (cholesterol >= 200) {
    riskLevel = 'moderate';
    riskScore = 50;
    findings.push('Borderline high cholesterol');
    insights.push('Your cholesterol is in the borderline range. Lifestyle changes can help lower it.');
  }

  // LDL (Optimal: <100 mg/dL)
  if (ldl >= 160) {
    riskLevel = 'high';
    riskScore = Math.max(riskScore, 70);
    findings.push('High LDL (bad cholesterol)');
    insights.push('Elevated LDL cholesterol can lead to plaque buildup in arteries.');
  }

  // HDL (Optimal: ≥60 mg/dL)
  if (hdl < 40) {
    riskLevel = riskLevel === 'low' ? 'moderate' : riskLevel;
    riskScore = Math.max(riskScore, 55);
    findings.push('Low HDL (good cholesterol)');
    insights.push('Low HDL cholesterol is a risk factor for heart disease.');
  }

  if (cholesterol >= 200 || ldl >= 130 || triglycerides >= 150) {
    dietaryRecs.push('Reduce saturated fats: limit red meat, butter, and cheese');
    dietaryRecs.push('Increase omega-3 fatty acids: salmon, walnuts, flaxseeds');
    dietaryRecs.push('Add more soluble fiber: oats, beans, apples, citrus fruits');
    dietaryRecs.push('Avoid trans fats completely');

    lifestyleRecs.push('Exercise 150 minutes per week (brisk walking, cycling, swimming)');
    lifestyleRecs.push('Lose weight if overweight (even 5-10% helps)');
    lifestyleRecs.push('Quit smoking if applicable');
    lifestyleRecs.push('Limit alcohol consumption');
  }

  if (findings.length === 0) {
    findings.push('Lipid profile values are within optimal range');
    insights.push('Your cholesterol levels are healthy. Continue your current lifestyle habits.');
  }

  return {
    riskLevel,
    riskScore,
    findings: findings.join('. ') + '.',
    healthInsights: insights,
    lifestyleRecommendations: lifestyleRecs.length > 0 ? lifestyleRecs : ['Maintain current healthy lifestyle', 'Regular cardiovascular exercise'],
    dietaryRecommendations: dietaryRecs.length > 0 ? dietaryRecs : ['Continue balanced, heart-healthy diet', 'Emphasize fruits, vegetables, and whole grains'],
    suggestedSpecialists: specialists,
  };
}

function analyzeGlucose(
  values: Record<string, string | number>,
  mlPrediction: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number; confidence: number }
): HealthAnalysisResult {
  const glucose = values.glucose as number || 95;
  const a1c = values.a1c as number || 5.4;

  // Use ML model's prediction as base
  let riskLevel = mlPrediction.riskLevel;
  let riskScore = mlPrediction.riskScore;
  const findings: string[] = [];
  const insights: string[] = [];
  const lifestyleRecs: string[] = [];
  const dietaryRecs: string[] = [];
  const specialists: Array<{type: string; reason: string}> = [];

  // Fasting Glucose (Normal: 70-100 mg/dL, Prediabetes: 100-125, Diabetes: ≥126)
  if (glucose >= 126) {
    riskLevel = 'high';
    riskScore = 80;
    findings.push('Elevated fasting glucose indicating diabetes');
    insights.push('Blood glucose levels suggest diabetes. Immediate medical consultation recommended.');
    specialists.push({ type: 'Endocrinologist', reason: 'Diabetes management and treatment' });
  } else if (glucose >= 100) {
    riskLevel = 'moderate';
    riskScore = 55;
    findings.push('Elevated glucose levels (prediabetes range)');
    insights.push('Your glucose is in the prediabetes range. Lifestyle changes can prevent type 2 diabetes.');
    specialists.push({ type: 'Endocrinologist', reason: 'Prediabetes evaluation and prevention strategies' });
  }

  if (glucose >= 100) {
    dietaryRecs.push('Reduce refined carbohydrates and sugary foods');
    dietaryRecs.push('Choose whole grains over white bread and rice');
    dietaryRecs.push('Increase fiber intake (vegetables, legumes, whole fruits)');
    dietaryRecs.push('Control portion sizes');

    lifestyleRecs.push('Engage in regular physical activity (30 minutes daily)');
    lifestyleRecs.push('Aim for gradual weight loss if overweight');
    lifestyleRecs.push('Monitor blood sugar levels regularly');
  }

  if (findings.length === 0) {
    findings.push('Blood glucose levels are within normal range');
    insights.push('Your glucose levels are healthy, indicating good metabolic function.');
  }

  return {
    riskLevel,
    riskScore,
    findings: findings.join('. ') + '.',
    healthInsights: insights,
    lifestyleRecommendations: lifestyleRecs.length > 0 ? lifestyleRecs : ['Maintain regular exercise routine', 'Keep consistent meal times'],
    dietaryRecommendations: dietaryRecs.length > 0 ? dietaryRecs : ['Continue balanced diet', 'Maintain healthy carbohydrate intake'],
    suggestedSpecialists: specialists,
  };
}

function analyzeUrinalysis(
  values: Record<string, string | number>,
  mlPrediction: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number; confidence: number }
): HealthAnalysisResult {
  const ph = values.ph as number || 6.0;
  const protein = values.protein as string || 'Negative';

  // Use ML model's prediction as base
  let riskLevel = mlPrediction.riskLevel;
  let riskScore = mlPrediction.riskScore;
  const findings: string[] = [];
  const insights: string[] = [];

  if (protein === 'Positive' || protein === 'Trace') {
    riskLevel = 'moderate';
    riskScore = 45;
    findings.push('Protein detected in urine');
    insights.push('Protein in urine may indicate kidney stress or damage.');
  }

  if (findings.length === 0) {
    findings.push('Urinalysis results are normal');
    insights.push('Your urinalysis shows no concerning findings.');
  }

  return {
    riskLevel,
    riskScore,
    findings: findings.join('. ') + '.',
    healthInsights: insights,
    lifestyleRecommendations: ['Stay well hydrated', 'Maintain healthy weight'],
    dietaryRecommendations: ['Limit sodium intake', 'Avoid excessive protein consumption'],
    suggestedSpecialists: riskLevel !== 'low' ? [{ type: 'Nephrologist', reason: 'Kidney function evaluation' }] : [],
  };
}

function analyzeGeneric(
  values: Record<string, string | number>,
  mlPrediction: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number; confidence: number }
): HealthAnalysisResult {
  return {
    riskLevel: mlPrediction.riskLevel,
    riskScore: mlPrediction.riskScore,
    findings: 'Lab results have been extracted and are available for review.',
    healthInsights: ['Please consult with a healthcare professional to interpret these results.'],
    lifestyleRecommendations: ['Maintain healthy lifestyle habits', 'Get regular check-ups'],
    dietaryRecommendations: ['Eat a balanced diet', 'Stay hydrated'],
    suggestedSpecialists: [],
  };
}