// Comprehensive Health Analysis Service
// Uses OpenAI GPT-4o-mini to generate detailed, doctor-level health analysis

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ComprehensiveAnalysis {
  detailedFindings: string;
  labValueBreakdown: Array<{
    parameter: string;
    value: string;
    normalRange: string;
    status: 'normal' | 'borderline' | 'abnormal';
    interpretation: string;
  }>;
  lifestyleRecommendations: Array<{
    category: string;
    recommendation: string;
    rationale: string;
  }>;
  dietaryRecommendations: Array<{
    category: string;
    recommendation: string;
    rationale: string;
  }>;
  suggestedSpecialists: Array<{
    type: string;
    reason: string;
    urgency: 'routine' | 'soon' | 'urgent';
  }>;
  correctedRiskLevel?: 'low' | 'moderate' | 'high';
  correctedRiskScore?: number;
}

// Medical reference ranges for common lab parameters
const MEDICAL_REFERENCES = {
  wbc: {
    normal: '4.5-11.0 K/uL',
    low: { threshold: 4.5, concern: 'weakened immune system, bone marrow issues' },
    high: { threshold: 11.0, concern: 'infection, inflammation, leukemia' }
  },
  rbc: {
    normal: '4.2-5.9 M/uL',
    low: { threshold: 4.2, concern: 'anemia, blood loss, nutritional deficiency' },
    high: { threshold: 5.9, concern: 'dehydration, polycythemia, lung disease' }
  },
  hemoglobin: {
    normal: '12.0-17.5 g/dL',
    low: { threshold: 12.0, concern: 'anemia, nutritional deficiency, chronic disease' },
    high: { threshold: 17.5, concern: 'dehydration, COPD, polycythemia vera' }
  },
  platelets: {
    normal: '150-400 K/uL',
    low: { threshold: 150, concern: 'bleeding risk, bone marrow disorders, ITP' },
    high: { threshold: 400, concern: 'thrombocytosis, iron deficiency, inflammation' }
  },
  cholesterol: {
    normal: '<200 mg/dL',
    borderline: { threshold: 200, max: 239 },
    high: { threshold: 240, concern: 'cardiovascular disease risk, atherosclerosis' }
  },
  hdl: {
    normal: '≥40 mg/dL (men), ≥50 mg/dL (women)',
    optimal: '≥60 mg/dL',
    low: { threshold: 40, concern: 'increased cardiovascular risk' }
  },
  ldl: {
    optimal: '<100 mg/dL',
    nearOptimal: { threshold: 100, max: 129 },
    borderline: { threshold: 130, max: 159 },
    high: { threshold: 160, concern: 'high cardiovascular disease risk, plaque buildup' }
  },
  triglycerides: {
    normal: '<150 mg/dL',
    borderline: { threshold: 150, max: 199 },
    high: { threshold: 200, concern: 'pancreatitis risk, metabolic syndrome' }
  },
  glucose: {
    normal: '70-100 mg/dL (fasting)',
    prediabetes: { threshold: 100, max: 125 },
    diabetes: { threshold: 126, concern: 'diabetes, insulin resistance, metabolic syndrome' }
  },
  a1c: {
    normal: '<5.7%',
    prediabetes: { threshold: 5.7, max: 6.4 },
    diabetes: { threshold: 6.5, concern: 'diabetes, poor glycemic control' }
  },
  ph: {
    normal: '4.5-8.0 (urine)',
    acidic: { threshold: 4.5, concern: 'metabolic acidosis, kidney stones' },
    alkaline: { threshold: 8.0, concern: 'UTI, kidney disease' }
  },
  protein: {
    normal: 'Negative',
    abnormal: { values: ['Positive', 'Trace'], concern: 'kidney disease, diabetes, hypertension' }
  }
};

function calculateCorrectedRiskAssessment(
  analysis: ComprehensiveAnalysis,
  mlRiskData: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number }
): { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number } {
  // Count abnormal and borderline lab values
  const abnormalCount = analysis.labValueBreakdown.filter(lab => lab.status === 'abnormal').length;
  const borderlineCount = analysis.labValueBreakdown.filter(lab => lab.status === 'borderline').length;
  const totalParameters = analysis.labValueBreakdown.length;
  
  // Check specialist urgency
  const urgentSpecialists = analysis.suggestedSpecialists.filter(spec => spec.urgency === 'urgent').length;
  const soonSpecialists = analysis.suggestedSpecialists.filter(spec => spec.urgency === 'soon').length;
  
  let riskScore = mlRiskData.riskScore;
  let riskLevel = mlRiskData.riskLevel;
  
  // Calculate severity percentage
  const abnormalPercentage = totalParameters > 0 ? (abnormalCount / totalParameters) * 100 : 0;
  const borderlinePercentage = totalParameters > 0 ? (borderlineCount / totalParameters) * 100 : 0;
  
  // Override ML assessment if comprehensive analysis shows severe issues
  if (urgentSpecialists > 0 || abnormalCount >= 3) {
    // Urgent specialists or 3+ abnormal values = HIGH risk
    riskLevel = 'high';
    riskScore = Math.max(70, 70 + (abnormalCount * 5) + (urgentSpecialists * 10));
  } else if (soonSpecialists > 0 || abnormalCount >= 2 || abnormalPercentage >= 50) {
    // Soon specialists or 2+ abnormal or 50%+ abnormal = MODERATE risk
    riskLevel = 'moderate';
    riskScore = Math.max(45, 45 + (abnormalCount * 5) + (soonSpecialists * 5));
  } else if (abnormalCount >= 1 || borderlineCount >= 2) {
    // 1 abnormal or 2+ borderline = MODERATE risk
    riskLevel = 'moderate';
    riskScore = Math.max(40, 40 + (abnormalCount * 3) + (borderlineCount * 2));
  } else if (borderlineCount >= 1) {
    // 1 borderline = LOW-MODERATE risk
    riskLevel = 'low';
    riskScore = Math.max(25, 25 + (borderlineCount * 2));
  }
  
  // Cap risk score at 100
  riskScore = Math.min(100, riskScore);
  
  console.log('[Risk Correction]', {
    originalRisk: mlRiskData.riskLevel,
    originalScore: mlRiskData.riskScore,
    correctedRisk: riskLevel,
    correctedScore: riskScore,
    abnormalCount,
    borderlineCount,
    urgentSpecialists,
    soonSpecialists
  });
  
  return { riskLevel, riskScore };
}

export async function generateComprehensiveAnalysis(
  labType: string,
  labValues: Record<string, string | number>,
  mlRiskData: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number }
): Promise<ComprehensiveAnalysis> {
  
  const prompt = `You are an experienced medical doctor conducting a comprehensive analysis of laboratory test results. Provide a detailed, professional medical consultation based on the following lab data.

**Lab Test Type:** ${labType.toUpperCase()}
**ML Risk Assessment:** ${mlRiskData.riskLevel.toUpperCase()} risk (Score: ${mlRiskData.riskScore}/100)

**Lab Values:**
${Object.entries(labValues).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

**Medical Reference Ranges:**
${Object.entries(MEDICAL_REFERENCES).map(([key, ref]) => 
  `- ${key}: Normal ${ref.normal || 'varies'}`
).join('\n')}

Please provide a comprehensive medical analysis in the following JSON format:

{
  "detailedFindings": "A detailed, doctor-style paragraph (200-300 words) explaining the overall health picture, key patterns observed, clinical significance of abnormal values, potential causes, health implications, and urgency of concerns. Write as if explaining to a patient during a consultation. Be specific about what the numbers mean.",
  
  "labValueBreakdown": [
    {
      "parameter": "Parameter name (e.g., 'White Blood Cell Count')",
      "value": "Actual value with unit",
      "normalRange": "Reference range",
      "status": "normal|borderline|abnormal",
      "interpretation": "2-3 sentences explaining what this specific value means for the patient's health, why it matters, and what it indicates about their body function"
    }
  ],
  
  "lifestyleRecommendations": [
    {
      "category": "Exercise|Sleep|Stress|Hydration|etc",
      "recommendation": "Specific, actionable recommendation (e.g., '30 minutes of moderate cardio 5x/week, include strength training 2x/week')",
      "rationale": "Detailed explanation of WHY this specific recommendation helps address their specific lab findings (e.g., 'Aerobic exercise increases HDL cholesterol by 5-10% and improves insulin sensitivity, directly addressing your borderline glucose levels')"
    }
  ],
  
  "dietaryRecommendations": [
    {
      "category": "Protein|Carbohydrates|Fats|Vitamins|Minerals|etc",
      "recommendation": "Specific, actionable dietary advice with examples (e.g., 'Consume 25-30g fiber daily: oatmeal, beans, vegetables, berries')",
      "rationale": "Detailed explanation of HOW this dietary change addresses their specific lab abnormalities (e.g., 'Soluble fiber binds cholesterol in the digestive tract, reducing LDL by 5-10%, which would bring your current 145 mg/dL closer to the optimal <100 mg/dL range')"
    }
  ],
  
  "suggestedSpecialists": [
    {
      "type": "Specialist name (e.g., 'Cardiologist')",
      "reason": "Specific reason based on their lab findings (e.g., 'Elevated LDL cholesterol (145 mg/dL) and low HDL (38 mg/dL) indicate cardiovascular risk requiring lipid management evaluation')",
      "urgency": "routine|soon|urgent"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. **BE SPECIFIC TO THE ACTUAL LAB VALUES** - Reference the exact numbers and how they compare to normal ranges
2. **NO GENERIC ADVICE** - Every recommendation must directly address the patient's specific abnormal findings
3. **EXPLAIN THE "WHY"** - Always include the medical rationale connecting recommendations to their lab results
4. **COMPREHENSIVE** - Include at least 4-6 lifestyle recommendations and 4-6 dietary recommendations if there are any abnormalities
5. **ONLY include all lab parameters present in the data** - Analyze every value provided
6. **BE PROFESSIONAL** - Write like a knowledgeable doctor explaining to a patient
7. **If all values are normal**, still provide preventive recommendations to maintain health
8. **Use medical terminology** but explain it in understandable terms

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an experienced medical doctor providing comprehensive health analysis. You provide detailed, specific, evidence-based medical interpretations and recommendations. Always reference actual lab values and explain the medical reasoning behind your advice."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_completion_tokens: 2000,
    });

    const analysisText = response.choices[0].message.content;
    if (!analysisText) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(analysisText) as ComprehensiveAnalysis;
    
    console.log('[Comprehensive Analysis] Generated detailed analysis with:', {
      findingsLength: analysis.detailedFindings.length,
      labParameters: analysis.labValueBreakdown.length,
      lifestyleRecs: analysis.lifestyleRecommendations.length,
      dietaryRecs: analysis.dietaryRecommendations.length,
      specialists: analysis.suggestedSpecialists.length
    });

    // Add corrected risk assessment based on comprehensive analysis
    const correctedRisk = calculateCorrectedRiskAssessment(analysis, mlRiskData);
    
    return {
      ...analysis,
      correctedRiskLevel: correctedRisk.riskLevel,
      correctedRiskScore: correctedRisk.riskScore
    };

  } catch (error: any) {
    console.error('[Comprehensive Analysis] Error:', error);
    
    // Fallback to basic analysis if OpenAI fails
    return generateFallbackAnalysis(labValues, mlRiskData);
  }
}

function generateFallbackAnalysis(
  labValues: Record<string, string | number>,
  mlRiskData: { riskLevel: string; riskScore: number }
): ComprehensiveAnalysis {
  const labBreakdown = Object.entries(labValues).map(([key, value]) => ({
    parameter: key.toUpperCase(),
    value: String(value),
    normalRange: (MEDICAL_REFERENCES as any)[key]?.normal || 'Varies',
    status: 'normal' as const,
    interpretation: `${key} level is ${value}. Please consult with your healthcare provider for detailed interpretation.`
  }));

  return {
    detailedFindings: `Your lab results have been analyzed with a ${mlRiskData.riskLevel} risk assessment. All extracted values are available for review. For a comprehensive interpretation and personalized recommendations, please consult with a qualified healthcare professional who can consider your complete medical history and current health status.`,
    labValueBreakdown: labBreakdown,
    lifestyleRecommendations: [
      {
        category: 'General Health',
        recommendation: 'Maintain regular physical activity and healthy sleep patterns',
        rationale: 'General health maintenance supports optimal lab values'
      }
    ],
    dietaryRecommendations: [
      {
        category: 'Balanced Diet',
        recommendation: 'Follow a balanced diet with plenty of fruits and vegetables',
        rationale: 'Nutritious diet supports overall metabolic health'
      }
    ],
    suggestedSpecialists: []
  };
}
