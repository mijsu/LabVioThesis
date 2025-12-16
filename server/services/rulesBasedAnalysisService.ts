// Rules-Based Health Analysis Service
// Implements medical decision rules based on clinical guidelines
// Integrates trained ML model predictions with clinical rule analysis

export interface RulesBasedAnalysis {
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
  correctedRiskLevel: 'low' | 'moderate' | 'high';
  correctedRiskScore: number;
}

interface LabValue {
  parameter: string;
  value: string;
  normalRange: string;
  status: 'normal' | 'borderline' | 'abnormal';
  interpretation: string;
}

/**
 * Calculate combined risk assessment using ML predictions and clinical rules
 * Strategy: Use max(ML, Clinical) to ensure safety - never downgrade clinical severity
 * ML model enhances detection, clinical rules ensure patient safety
 */
function calculateCombinedRiskAssessment(
  mlRiskData: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number },
  abnormalCount: number,
  borderlineCount: number,
  urgentCount: number,
  soonCount: number,
  labType: string
): { correctedRiskLevel: 'low' | 'moderate' | 'high'; correctedRiskScore: number } {
  
  // Convert ML risk level to numeric for calculations
  const mlRiskNumeric = mlRiskData.riskLevel === 'high' ? 2 : mlRiskData.riskLevel === 'moderate' ? 1 : 0;
  
  // Calculate clinical rules risk
  let clinicalRiskNumeric: number;
  let clinicalScore: number;
  
  if (urgentCount > 0 || abnormalCount >= 3) {
    clinicalRiskNumeric = 2; // high
    clinicalScore = Math.min(100, 75 + (abnormalCount * 5) + (urgentCount * 10));
  } else if (soonCount > 0 || abnormalCount >= 2) {
    clinicalRiskNumeric = 1; // moderate
    clinicalScore = Math.min(100, 50 + (abnormalCount * 5) + (soonCount * 5));
  } else if (abnormalCount >= 1 || borderlineCount >= 2) {
    clinicalRiskNumeric = 1; // moderate
    clinicalScore = Math.min(100, 40 + (abnormalCount * 3) + (borderlineCount * 2));
  } else if (borderlineCount >= 1) {
    clinicalRiskNumeric = 0; // low
    clinicalScore = 25 + (borderlineCount * 2);
  } else {
    clinicalRiskNumeric = 0; // low
    clinicalScore = 15;
  }
  
  // Use MAX strategy: Take the higher of ML or Clinical to ensure safety
  // ML can escalate risk (catches patterns clinical rules miss)
  // Clinical rules can never be downgraded by ML (patient safety)
  const finalRiskNumeric = Math.max(mlRiskNumeric, clinicalRiskNumeric);
  const finalScore = Math.max(mlRiskData.riskScore, clinicalScore);
  
  // Convert to risk level
  let correctedRiskLevel: 'low' | 'moderate' | 'high';
  if (finalRiskNumeric >= 2) {
    correctedRiskLevel = 'high';
  } else if (finalRiskNumeric >= 1) {
    correctedRiskLevel = 'moderate';
  } else {
    correctedRiskLevel = 'low';
  }
  
  // Log the combined assessment for debugging
  const mlRiskLabel = mlRiskData.riskLevel;
  const clinicalRiskLabel = clinicalRiskNumeric === 2 ? 'high' : clinicalRiskNumeric === 1 ? 'moderate' : 'low';
  const source = finalRiskNumeric === mlRiskNumeric && finalRiskNumeric > clinicalRiskNumeric ? 'ML' : 
                 finalRiskNumeric === clinicalRiskNumeric && finalRiskNumeric > mlRiskNumeric ? 'Clinical' : 'Both';
  
  console.log(`[Risk Assessment - ${labType}] ML: ${mlRiskLabel}(${mlRiskData.riskScore}) | Clinical: ${clinicalRiskLabel}(${clinicalScore}) => Final: ${correctedRiskLevel}(${finalScore}) [Source: ${source}]`);
  
  return {
    correctedRiskLevel,
    correctedRiskScore: Math.min(100, finalScore)
  };
}

export function generateRulesBasedAnalysis(
  labType: string,
  labValues: Record<string, string | number>,
  mlRiskData: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number }
): RulesBasedAnalysis {

  const normalizedLabType = labType.toLowerCase().trim();

  switch (normalizedLabType) {
    case 'cbc':
      return analyzeCBCRules(labValues, mlRiskData);
    case 'lipid':
    case 'lipid profile':
      return analyzeLipidProfileRules(labValues, mlRiskData);
    case 'urinalysis':
      return analyzeUrinalysisRules(labValues, mlRiskData);
    default:
      return analyzeGenericRules(labValues, mlRiskData);
  }
}

function analyzeCBCRules(
  values: Record<string, string | number>,
  mlRiskData: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number }
): RulesBasedAnalysis {

  const wbc = parseFloat(String(values.wbc || 7.5));
  const rbc = parseFloat(String(values.rbc || 4.7));
  const hemoglobin = parseFloat(String(values.hemoglobin || 14.0));
  const hematocrit = parseFloat(String(values.hematocrit || 42.0)); // Assuming hematocrit is also provided or derived
  
  // Handle "Adequate" platelet count or numeric value
  let platelets: number;
  if (typeof values.platelets === 'string' && values.platelets.toLowerCase().includes('adequate')) {
    platelets = 250; // Mid-range normal
  } else {
    platelets = parseFloat(String(values.platelets || 250));
  }
  
  // Differential counts (as decimals, e.g., 0.67 for 67%)
  const neutrophils = parseFloat(String(values.neutrophils || 0.60));
  const stabCells = parseFloat(String(values.stab_cells || 0));
  const lymphocytes = parseFloat(String(values.lymphocytes || 0.30));
  const monocytes = parseFloat(String(values.monocytes || 0.05));
  const eosinophils = parseFloat(String(values.eosinophils || 0.03));
  const basophils = parseFloat(String(values.basophils || 0.01));

  const breakdown: LabValue[] = [];
  const lifestyleRecs: Array<{ category: string; recommendation: string; rationale: string }> = [];
  const dietaryRecs: Array<{ category: string; recommendation: string; rationale: string }> = [];
  const specialists: Array<{ type: string; reason: string; urgency: 'routine' | 'soon' | 'urgent' }> = [];

  // WBC Analysis (Normal: 4.5-11.0 K/uL)
  let wbcStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let wbcInterpretation = 'White blood cell count is within normal range, indicating healthy immune function.';

  if (wbc < 4.5) {
    wbcStatus = 'abnormal';
    wbcInterpretation = 'Low white blood cell count (leukopenia) may indicate a weakened immune system, bone marrow disorders, or certain medications. This requires medical evaluation.';
    specialists.push({
      type: 'Hematologist',
      reason: 'Low white blood cell count requires evaluation for potential bone marrow disorders or immune system issues',
      urgency: 'soon'
    });
  } else if (wbc > 11.0) {
    wbcStatus = 'abnormal';
    wbcInterpretation = 'Elevated white blood cell count (leukocytosis) suggests infection, inflammation, stress, or potentially blood disorders. Further investigation needed.';
    specialists.push({
      type: 'Internal Medicine',
      reason: 'Elevated WBC requires investigation to determine underlying cause (infection, inflammation, or blood disorder)',
      urgency: 'soon'
    });
  }

  breakdown.push({
    parameter: 'White Blood Cell Count (WBC)',
    value: `${wbc.toFixed(1)} K/uL`,
    normalRange: '4.5-11.0 K/uL',
    status: wbcStatus,
    interpretation: wbcInterpretation
  });

  // RBC Analysis (Normal: 4.2-5.9 M/uL)
  let rbcStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let rbcInterpretation = 'Red blood cell count is within normal range, supporting adequate oxygen delivery to tissues.';

  if (rbc < 4.2) {
    rbcStatus = 'abnormal';
    rbcInterpretation = 'Low red blood cell count (anemia) may result from blood loss, nutritional deficiencies (iron, B12, folate), or chronic diseases. Can cause fatigue and weakness.';
    specialists.push({
      type: 'Hematologist',
      reason: 'Low RBC count requires evaluation for anemia and underlying causes',
      urgency: 'soon'
    });
    dietaryRecs.push({
      category: 'Iron-Rich Foods',
      recommendation: 'Consume iron-rich foods daily: red meat, chicken liver, spinach, lentils, fortified cereals, and pumpkin seeds',
      rationale: 'Iron is essential for red blood cell production. Dietary iron helps correct anemia and restore healthy RBC levels.'
    });
  } else if (rbc > 5.9) {
    rbcStatus = 'abnormal';
    rbcInterpretation = 'Elevated red blood cell count (polycythemia) may indicate dehydration, lung disease, or bone marrow disorders. Increases risk of blood clots.';
    specialists.push({
      type: 'Hematologist',
      reason: 'Elevated RBC requires evaluation for polycythemia or secondary causes',
      urgency: 'soon'
    });
    lifestyleRecs.push({
      category: 'Hydration',
      recommendation: 'Increase water intake to 8-10 glasses daily, especially if dehydration suspected',
      rationale: 'Dehydration concentrates blood cells. Proper hydration helps normalize RBC count if elevated due to fluid loss.'
    });
  }

  breakdown.push({
    parameter: 'Red Blood Cell Count (RBC)',
    value: `${rbc.toFixed(2)} M/uL`,
    normalRange: '4.2-5.9 M/uL',
    status: rbcStatus,
    interpretation: rbcInterpretation
  });

  // Hemoglobin Analysis (Normal: 12.0-17.5 g/dL)
  let hbStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let hbInterpretation = 'Hemoglobin level is within normal range, ensuring adequate oxygen-carrying capacity of blood.';

  if (hemoglobin < 12.0) {
    hbStatus = 'abnormal';
    hbInterpretation = 'Low hemoglobin (anemia) reduces oxygen delivery to organs and tissues, causing fatigue, weakness, shortness of breath, and pale skin. Requires treatment.';
    if (!specialists.find(s => s.type === 'Hematologist')) {
      specialists.push({
        type: 'Hematologist',
        reason: 'Anemia evaluation and treatment planning',
        urgency: 'soon'
      });
    }
    dietaryRecs.push({
      category: 'Vitamin C',
      recommendation: 'Consume vitamin C with iron sources: citrus fruits, bell peppers, strawberries, tomatoes',
      rationale: 'Vitamin C enhances iron absorption by up to 300%, helping to correct low hemoglobin levels more effectively.'
    });
    dietaryRecs.push({
      category: 'Folate & B12',
      recommendation: 'Include folate-rich foods (leafy greens, beans) and B12 sources (eggs, dairy, fortified foods)',
      rationale: 'Folate and vitamin B12 are essential for red blood cell formation and hemoglobin synthesis.'
    });
  } else if (hemoglobin > 17.5) {
    hbStatus = 'abnormal';
    hbInterpretation = 'Elevated hemoglobin may indicate dehydration, lung disease, or polycythemia. Can increase blood viscosity and clotting risk.';
    if (!specialists.find(s => s.type === 'Hematologist')) {
      specialists.push({
        type: 'Hematologist',
        reason: 'Elevated hemoglobin evaluation',
        urgency: 'soon'
      });
    }
  }

  breakdown.push({
    parameter: 'Hemoglobin',
    value: `${hemoglobin.toFixed(1)} g/dL`,
    normalRange: '12.0-17.5 g/dL',
    status: hbStatus,
    interpretation: hbInterpretation
  });

  // Hematocrit Analysis (Normal: 36-46% for women, 41-50% for men) - using a general range
  let hctStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let hctInterpretation = 'Hematocrit level is within normal range, indicating appropriate red blood cell volume in blood.';

  if (hematocrit < 36) { // Lower end of general range
    hctStatus = 'abnormal';
    hctInterpretation = 'Low hematocrit suggests anemia, possibly due to iron deficiency, blood loss, or other underlying conditions. Reduced oxygen transport capacity.';
    if (!specialists.find(s => s.type === 'Hematologist')) {
      specialists.push({
        type: 'Hematologist',
        reason: 'Low hematocrit requires evaluation for anemia',
        urgency: 'soon'
      });
    }
  } else if (hematocrit > 50) { // Upper end of general range
    hctStatus = 'abnormal';
    hctInterpretation = 'High hematocrit may indicate dehydration, polycythemia, or other conditions. Increases blood viscosity and potential for clotting.';
    if (!specialists.find(s => s.type === 'Hematologist')) {
      specialists.push({
        type: 'Hematologist',
        reason: 'High hematocrit requires evaluation for polycythemia or dehydration',
        urgency: 'soon'
      });
    }
  }

  breakdown.push({
    parameter: 'Hematocrit',
    value: `${hematocrit.toFixed(1)}%`,
    normalRange: 'Approx. 36-50%',
    status: hctStatus,
    interpretation: hctInterpretation
  });

  // Platelet Analysis (Normal: 150-400 K/uL)
  let pltStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let pltInterpretation = 'Platelet count is within normal range, supporting proper blood clotting function.';

  if (platelets < 150) {
    pltStatus = 'abnormal';
    pltInterpretation = 'Low platelet count (thrombocytopenia) increases bleeding risk. May result from bone marrow disorders, autoimmune conditions, or medications.';
    if (!specialists.find(s => s.type === 'Hematologist')) {
      specialists.push({
        type: 'Hematologist',
        reason: 'Low platelet count evaluation for bleeding disorders',
        urgency: 'urgent'
      });
    }
  } else if (platelets > 400) {
    pltStatus = 'abnormal';
    pltInterpretation = 'Elevated platelet count (thrombocytosis) may increase clotting risk. Can result from inflammation, iron deficiency, or bone marrow disorders.';
    if (!specialists.find(s => s.type === 'Hematologist')) {
      specialists.push({
        type: 'Hematologist',
        reason: 'Elevated platelet count evaluation',
        urgency: 'soon'
      });
    }
  }

  breakdown.push({
    parameter: 'Platelet Count',
    value: typeof values.platelets === 'string' && values.platelets.toLowerCase().includes('adequate') 
      ? 'Adequate' 
      : `${platelets.toFixed(0)} K/uL`,
    normalRange: '150-400 K/uL',
    status: pltStatus,
    interpretation: pltInterpretation
  });

  // Differential Count Analysis
  // Neutrophils (Normal: 0.54-0.70 or 54-70%)
  let neutStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let neutInterpretation = 'Neutrophil percentage is within normal range, indicating healthy infection-fighting capability.';

  if (neutrophils < 0.40) {
    neutStatus = 'abnormal';
    neutInterpretation = 'Low neutrophils (neutropenia) may indicate bone marrow suppression, viral infection, or autoimmune disorders. Increases infection risk.';
  } else if (neutrophils > 0.75) {
    neutStatus = 'abnormal';
    neutInterpretation = 'Elevated neutrophils suggest bacterial infection, inflammation, stress response, or tissue damage. Further evaluation needed.';
  } else if (neutrophils < 0.54) {
    neutStatus = 'borderline';
    neutInterpretation = 'Neutrophils are slightly below normal range. Monitor for signs of infection or immune system issues.';
  } else if (neutrophils > 0.70) {
    neutStatus = 'borderline';
    neutInterpretation = 'Neutrophils are slightly elevated, possibly indicating mild infection or stress response.';
  }

  breakdown.push({
    parameter: 'Neutrophils (Segmenters)',
    value: `${(neutrophils * 100).toFixed(0)}%`,
    normalRange: '54-70%',
    status: neutStatus,
    interpretation: neutInterpretation
  });

  // Lymphocytes (Normal: 0.20-0.40 or 20-40%)
  let lymphStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let lymphInterpretation = 'Lymphocyte percentage is within normal range, supporting healthy immune function.';

  if (lymphocytes < 0.15) {
    lymphStatus = 'abnormal';
    lymphInterpretation = 'Low lymphocytes (lymphopenia) may indicate viral infection, immunodeficiency, or bone marrow disorders. Weakens immune response.';
  } else if (lymphocytes > 0.45) {
    lymphStatus = 'abnormal';
    lymphInterpretation = 'Elevated lymphocytes suggest viral infection, chronic inflammation, or lymphoproliferative disorders. Further testing recommended.';
  } else if (lymphocytes < 0.20) {
    lymphStatus = 'borderline';
    lymphInterpretation = 'Lymphocytes are slightly low. Monitor immune function and consider further evaluation if symptoms present.';
  } else if (lymphocytes > 0.40) {
    lymphStatus = 'borderline';
    lymphInterpretation = 'Lymphocytes are slightly elevated, possibly indicating recent viral infection or immune response.';
  }

  breakdown.push({
    parameter: 'Lymphocytes',
    value: `${(lymphocytes * 100).toFixed(0)}%`,
    normalRange: '20-40%',
    status: lymphStatus,
    interpretation: lymphInterpretation
  });

  // Monocytes (Normal: 0.02-0.08 or 2-8%)
  let monoStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let monoInterpretation = 'Monocyte percentage is within normal range, supporting healthy immune surveillance.';

  if (monocytes < 0.02 && monocytes > 0) {
    monoStatus = 'borderline';
    monoInterpretation = 'Monocytes are slightly below normal range. This is often not clinically significant if other values are normal and may occur during stress or natural variation.';
  } else if (monocytes === 0) {
    monoStatus = 'borderline';
    monoInterpretation = 'Monocytes are at the lower limit. This is typically not dangerous if all other CBC values are normal and can occur naturally or during mild stress/infection. No immediate concern.';
  } else if (monocytes > 0.12) {
    monoStatus = 'abnormal';
    monoInterpretation = 'Elevated monocytes suggest chronic infection, inflammation, or recovery phase from acute infection. May warrant follow-up.';
  } else if (monocytes > 0.08) {
    monoStatus = 'borderline';
    monoInterpretation = 'Monocytes are slightly elevated, possibly indicating ongoing immune response or inflammation.';
  }

  breakdown.push({
    parameter: 'Monocytes',
    value: `${(monocytes * 100).toFixed(0)}%`,
    normalRange: '2-8%',
    status: monoStatus,
    interpretation: monoInterpretation
  });

  // Eosinophils (Normal: 0-0.05 or 0-5%)
  let eosinStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let eosinInterpretation = 'Eosinophil percentage is within normal range, indicating no allergic or parasitic conditions.';

  if (eosinophils > 0.08) {
    eosinStatus = 'abnormal';
    eosinInterpretation = 'Elevated eosinophils suggest allergic conditions, parasitic infection, or autoimmune disorders. Further evaluation recommended.';
  } else if (eosinophils > 0.05) {
    eosinStatus = 'borderline';
    eosinInterpretation = 'Eosinophils are slightly elevated, possibly indicating mild allergic response or environmental sensitivity.';
  }

  breakdown.push({
    parameter: 'Eosinophils',
    value: `${(eosinophils * 100).toFixed(0)}%`,
    normalRange: '0-5%',
    status: eosinStatus,
    interpretation: eosinInterpretation
  });

  // Basophils (Normal: 0-0.01 or 0-1%)
  let basoStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let basoInterpretation = 'Basophil percentage is within normal range.';

  if (basophils > 0.02) {
    basoStatus = 'abnormal';
    basoInterpretation = 'Elevated basophils may indicate allergic conditions, chronic inflammation, or rare blood disorders. Further evaluation needed.';
  } else if (basophils > 0.01) {
    basoStatus = 'borderline';
    basoInterpretation = 'Basophils are slightly elevated, possibly indicating mild allergic response.';
  }

  breakdown.push({
    parameter: 'Basophils',
    value: `${(basophils * 100).toFixed(0)}%`,
    normalRange: '0-1%',
    status: basoStatus,
    interpretation: basoInterpretation
  });

  // Stab Cells (Band Cells) - if present (Normal: 0-0.05 or 0-5%)
  if (stabCells > 0) {
    let stabStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
    let stabInterpretation = 'Stab cells (immature neutrophils) are within normal range.';

    if (stabCells > 0.10) {
      stabStatus = 'abnormal';
      stabInterpretation = 'Elevated stab cells (left shift) indicate acute bacterial infection or bone marrow response. Suggests active infection requiring treatment.';
    } else if (stabCells > 0.05) {
      stabStatus = 'borderline';
      stabInterpretation = 'Slightly elevated stab cells may indicate early infection or immune response.';
    }

    breakdown.push({
      parameter: 'Stab Cells (Bands)',
      value: `${(stabCells * 100).toFixed(0)}%`,
      normalRange: '0-5%',
      status: stabStatus,
      interpretation: stabInterpretation
    });
  }

  // Dynamic lifestyle recommendations based on specific findings
  if (wbcStatus !== 'normal' || rbcStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Sleep Optimization',
      recommendation: 'Prioritize 8-9 hours of quality sleep nightly. Maintain consistent sleep/wake times, even on weekends. Create a dark, cool bedroom environment',
      rationale: `Your ${wbcStatus !== 'normal' ? 'white' : 'red'} blood cell levels indicate need for enhanced sleep. Deep sleep stages are when bone marrow produces most blood cells. Quality sleep can improve cell production by 20-30%.`
    });
  } else {
    lifestyleRecs.push({
      category: 'Sleep Maintenance',
      recommendation: 'Maintain consistent sleep schedule of 7-9 hours per night with regular bedtime routine',
      rationale: 'Continue supporting healthy blood cell production through quality sleep. Your current levels suggest good sleep habits.'
    });
  }

  if (wbcStatus === 'abnormal' || rbcStatus === 'abnormal' || pltStatus === 'abnormal') {
    lifestyleRecs.push({
      category: 'Stress Reduction (Critical)',
      recommendation: 'Practice daily stress management: 20-30 minutes meditation, progressive muscle relaxation, or gentle yoga. Consider stress counseling if chronic stress present',
      rationale: 'Your abnormal blood cell levels may be stress-related. Chronic stress elevates cortisol which suppresses bone marrow. Stress reduction can improve blood cell counts by 15-25% within 4-6 weeks.'
    });

    lifestyleRecs.push({
      category: 'Avoid Environmental Toxins',
      recommendation: 'Minimize exposure to chemicals, pollutants, and toxins. Use natural cleaning products, avoid pesticides, ensure good ventilation at home/work',
      rationale: 'Abnormal blood cell levels can result from environmental toxin exposure. Reducing toxic exposure protects bone marrow and supports healthy cell production.'
    });
  } else {
    lifestyleRecs.push({
      category: 'Stress Management',
      recommendation: 'Continue stress reduction practices: 10-15 minutes daily meditation, deep breathing, or relaxation exercises',
      rationale: 'Maintain balanced blood cell levels through ongoing stress management. Your current values suggest effective stress control.'
    });
  }

  if (rbcStatus !== 'normal' || hbStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Moderate Exercise',
      recommendation: 'Engage in 30-45 minutes moderate aerobic exercise 4-5 days/week: brisk walking, swimming, cycling. Avoid overexertion until levels normalize',
      rationale: `Your ${rbcStatus !== 'normal' ? 'low red blood cell' : 'low hemoglobin'} levels may cause fatigue. Moderate exercise stimulates red blood cell production while avoiding exhaustion. Gradual increase improves oxygen capacity.`
    });
  } else {
    lifestyleRecs.push({
      category: 'Regular Exercise',
      recommendation: 'Maintain regular physical activity: 150 minutes moderate aerobic exercise weekly, plus 2-3 strength training sessions',
      rationale: 'Continue supporting healthy blood cell levels through exercise. Your current values indicate good cardiovascular fitness.'
    });
  }

  if (!dietaryRecs.find(d => d.category === 'Antioxidants')) {
    dietaryRecs.push({
      category: 'Antioxidant-Rich Foods',
      recommendation: 'Consume antioxidant-rich foods daily: berries (blueberries, strawberries), dark leafy greens, nuts, seeds, colorful vegetables, green tea',
      rationale: 'Antioxidants protect blood cells from oxidative damage and support healthy cell production. Regular intake improves cell lifespan and function.'
    });
  }

  // Calculate counts and risk assessment
  const abnormalCount = breakdown.filter(b => b.status === 'abnormal').length;
  const borderlineCount = breakdown.filter(b => b.status === 'borderline').length;

  if (abnormalCount > 0) {
    dietaryRecs.push({
      category: 'Hydration Enhancement',
      recommendation: 'Increase water intake to 10-12 glasses daily. Add electrolyte-rich foods: coconut water, fresh fruits, vegetables',
      rationale: 'Your abnormal blood cell levels require enhanced hydration. Proper hydration optimizes blood volume, nutrient delivery, and waste removal. Dehydration concentrates blood cells artificially.'
    });
  } else {
    if (!dietaryRecs.find(d => d.category === 'Hydration')) {
      dietaryRecs.push({
        category: 'Hydration',
        recommendation: 'Maintain adequate hydration: 8-10 glasses of water daily, more if exercising or in hot weather',
        rationale: 'Continue supporting optimal blood volume and nutrient transport through proper hydration. Your current levels indicate good hydration status.'
      });
    }
  }

  if (!dietaryRecs.find(d => d.category === 'Protein Quality')) {
    dietaryRecs.push({
      category: 'Protein Quality',
      recommendation: 'Consume high-quality lean proteins: fish, chicken, turkey, eggs, Greek yogurt, legumes. Aim for 0.8-1.0g per kg body weight daily',
      rationale: 'Protein provides amino acids essential for blood cell production and hemoglobin synthesis. Quality protein supports healthy blood cell turnover and immune function.'
    });
  }
  const urgentCount = specialists.filter(s => s.urgency === 'urgent').length;
  const soonCount = specialists.filter(s => s.urgency === 'soon').length;

  // Calculate combined risk using ML predictions + clinical rules
  const { correctedRiskLevel, correctedRiskScore } = calculateCombinedRiskAssessment(
    mlRiskData,
    abnormalCount,
    borderlineCount,
    urgentCount,
    soonCount,
    'CBC'
  );

  let detailedFindings: string;

  // If all values are normal, provide positive feedback
  if (abnormalCount === 0 && borderlineCount === 0) {
    detailedFindings = `Excellent news! Your CBC results show all parameters within healthy ranges. Your white blood cell count (${wbc} K/uL), red blood cell count (${rbc} M/uL), hemoglobin (${hemoglobin} g/dL), hematocrit (${hematocrit}%), and platelet count (${platelets} K/uL) are all optimal. This indicates a healthy immune system, good oxygen-carrying capacity, and proper blood clotting function. Continue your current lifestyle and health maintenance practices.`;

    // Add general wellness recommendations even for normal results
    lifestyleRecs.push({
      category: 'Continue Healthy Habits',
      recommendation: 'Maintain 7-9 hours of quality sleep per night, engage in 150 minutes of moderate aerobic activity weekly, and practice stress management',
      rationale: 'Your healthy blood counts reflect good overall wellness. Consistent healthy habits will help maintain these optimal levels.'
    });

    dietaryRecs.push({
      category: 'Balanced Nutrition',
      recommendation: 'Continue eating a variety of colorful fruits and vegetables, lean proteins, whole grains, and healthy fats',
      rationale: 'Nutritious, varied diet supports overall health and optimal blood cell production'
    });

    // Add routine follow-up recommendation
    specialists.push({
      type: 'General Practitioner',
      reason: 'Annual health check-up to monitor and maintain your healthy blood values',
      urgency: 'routine'
    });
  } else {
    const abnormalParams = breakdown.filter(b => b.status === 'abnormal').map(b => b.parameter);
    const borderlineParams = breakdown.filter(b => b.status === 'borderline').map(b => b.parameter);

    detailedFindings = `Your Complete Blood Count (CBC) reveals ${abnormalCount} abnormal parameter(s)${borderlineCount > 0 ? ` and ${borderlineCount} borderline value(s)` : ''} that require attention. `;

    if (abnormalParams.length > 0) {
      detailedFindings += `Abnormal findings include: ${abnormalParams.join(', ')}. `;
    }
    if (borderlineParams.length > 0) {
      detailedFindings += `Borderline values: ${borderlineParams.join(', ')}. `;
    }

    detailedFindings += `These results suggest ${correctedRiskLevel} health risk and warrant ${specialists.length > 0 ? 'consultation with ' + specialists[0].type : 'medical follow-up'}. The recommended lifestyle and dietary changes below can help improve these values and support overall blood health.`;
  }

  // Ensure at least one specialist is always recommended
  if (specialists.length === 0) {
    specialists.push({
      type: 'General Practitioner',
      reason: 'Regular health checkup and blood test review',
      urgency: 'routine'
    });
  }

  return {
    detailedFindings,
    labValueBreakdown: breakdown,
    lifestyleRecommendations: lifestyleRecs,
    dietaryRecommendations: dietaryRecs,
    suggestedSpecialists: specialists,
    correctedRiskLevel,
    correctedRiskScore
  };
}

function analyzeLipidProfileRules(
  values: Record<string, string | number>,
  mlRiskData: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number }
): RulesBasedAnalysis {

  const cholesterol = parseFloat(String(values.cholesterol || 180));
  const hdl = parseFloat(String(values.hdl || 55));
  const ldl = parseFloat(String(values.ldl || 100));
  const triglycerides = parseFloat(String(values.triglycerides || 140));

  const breakdown: LabValue[] = [];
  const lifestyleRecs: Array<{ category: string; recommendation: string; rationale: string }> = [];
  const dietaryRecs: Array<{ category: string; recommendation: string; rationale: string }> = [];
  const specialists: Array<{ type: string; reason: string; urgency: 'routine' | 'soon' | 'urgent' }> = [];

  // Total Cholesterol (Desirable: <200, Borderline: 200-239, High: ≥240)
  let cholStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let cholInterpretation = 'Total cholesterol is at desirable level, indicating good overall cholesterol balance.';

  if (cholesterol >= 240) {
    cholStatus = 'abnormal';
    cholInterpretation = 'High total cholesterol significantly increases risk of heart disease and stroke. Plaque buildup in arteries can lead to cardiovascular events. Requires aggressive management.';
    specialists.push({
      type: 'Cardiologist',
      reason: 'High cholesterol requires cardiovascular risk assessment and potential medication management',
      urgency: 'soon'
    });
  } else if (cholesterol >= 200) {
    cholStatus = 'borderline';
    cholInterpretation = 'Borderline high cholesterol indicates moderate cardiovascular risk. Lifestyle modifications can prevent progression to high cholesterol levels.';
  }

  breakdown.push({
    parameter: 'Total Cholesterol',
    value: `${cholesterol.toFixed(0)} mg/dL`,
    normalRange: '<200 mg/dL (Desirable)',
    status: cholStatus,
    interpretation: cholInterpretation
  });

  // LDL (Optimal: <100, Near Optimal: 100-129, Borderline: 130-159, High: ≥160)
  let ldlStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let ldlInterpretation = 'LDL cholesterol is at optimal level, minimizing risk of arterial plaque formation.';

  if (ldl >= 160) {
    ldlStatus = 'abnormal';
    ldlInterpretation = 'High LDL (bad cholesterol) promotes plaque buildup in arteries, significantly increasing heart attack and stroke risk. This level requires medical intervention.';
    if (!specialists.find(s => s.type === 'Cardiologist')) {
      specialists.push({
        type: 'Cardiologist',
        reason: 'High LDL cholesterol management and cardiovascular risk reduction',
        urgency: 'soon'
      });
    }
  } else if (ldl >= 130) {
    ldlStatus = 'borderline';
    ldlInterpretation = 'Borderline high LDL cholesterol increases cardiovascular risk. Diet and exercise modifications recommended to lower levels.';
  } else if (ldl >= 100) {
    ldlInterpretation = 'LDL cholesterol is near optimal. Maintaining healthy habits will keep it in this favorable range.';
  }

  breakdown.push({
    parameter: 'LDL Cholesterol (Bad)',
    value: `${ldl.toFixed(0)} mg/dL`,
    normalRange: '<100 mg/dL (Optimal)',
    status: ldlStatus,
    interpretation: ldlInterpretation
  });

  // HDL (Low: <40, Desirable: ≥40, Optimal: ≥60)
  let hdlStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let hdlInterpretation = 'HDL cholesterol is at desirable level, providing protective cardiovascular benefits.';

  if (hdl < 40) {
    hdlStatus = 'abnormal';
    hdlInterpretation = 'Low HDL (good cholesterol) is a major risk factor for heart disease. HDL removes cholesterol from arteries. Low levels increase cardiovascular risk even if other values are normal.';
    if (!specialists.find(s => s.type === 'Cardiologist')) {
      specialists.push({
        type: 'Cardiologist',
        reason: 'Low HDL cholesterol requires cardiovascular risk evaluation',
        urgency: 'soon'
      });
    }
  } else if (hdl >= 60) {
    hdlInterpretation = 'Optimal HDL cholesterol provides strong protection against heart disease. This high level is considered a negative risk factor.';
  }

  breakdown.push({
    parameter: 'HDL Cholesterol (Good)',
    value: `${hdl.toFixed(0)} mg/dL`,
    normalRange: '≥40 mg/dL (men), ≥50 mg/dL (women)',
    status: hdlStatus,
    interpretation: hdlInterpretation
  });

  // Triglycerides (Normal: <150, Borderline: 150-199, High: ≥200)
  let tgStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let tgInterpretation = 'Triglyceride level is normal, indicating healthy fat metabolism and low pancreatitis risk.';

  if (triglycerides >= 200) {
    tgStatus = 'abnormal';
    tgInterpretation = 'High triglycerides increase risk of pancreatitis, heart disease, and metabolic syndrome. Often associated with obesity, diabetes, and excessive alcohol or sugar intake.';
    if (!specialists.find(s => s.type === 'Cardiologist')) {
      specialists.push({
        type: 'Cardiologist',
        reason: 'High triglycerides management and metabolic syndrome evaluation',
        urgency: 'soon'
      });
    }
  } else if (triglycerides >= 150) {
    tgStatus = 'borderline';
    tgInterpretation = 'Borderline high triglycerides suggest need for lifestyle modifications. Reducing sugars and refined carbs can lower levels.';
  }

  breakdown.push({
    parameter: 'Triglycerides',
    value: `${triglycerides.toFixed(0)} mg/dL`,
    normalRange: '<150 mg/dL',
    status: tgStatus,
    interpretation: tgInterpretation
  });

  // Dietary recommendations based on findings
  if (cholStatus !== 'normal' || ldlStatus !== 'normal' || tgStatus !== 'normal') {
    dietaryRecs.push({
      category: 'Reduce Saturated Fats (Priority)',
      recommendation: `Limit saturated fats to <7% of daily calories (about 15g/day for 2000 cal diet): minimize red meat to 1-2x/week, eliminate butter/cheese/full-fat dairy, choose lean proteins`,
      rationale: `Your ${cholStatus !== 'normal' ? `total cholesterol (${cholesterol} mg/dL)` : ldlStatus !== 'normal' ? `LDL (${ldl} mg/dL)` : `triglycerides (${triglycerides} mg/dL)`} will benefit from saturated fat reduction. Each 1% reduction in saturated fat intake lowers LDL by 1-2 mg/dL. Target reduction: 10-20 mg/dL improvement.`
    });

    dietaryRecs.push({
      category: 'Increase Omega-3 Fatty Acids (Critical)',
      recommendation: 'Consume fatty fish 3-4 times weekly (salmon, mackerel, sardines, herring) OR take high-quality fish oil: 2000-3000mg EPA+DHA daily',
      rationale: `Your triglycerides (${triglycerides} mg/dL) require omega-3 intervention. Clinical studies show 2-3g EPA+DHA daily can lower triglycerides by 25-35% (target: ${Math.round(triglycerides * 0.7)}-${Math.round(triglycerides * 0.75)} mg/dL). Also raises HDL by 5-10%.`
    });

    dietaryRecs.push({
      category: 'Soluble Fiber (Essential)',
      recommendation: 'Consume 15-30g soluble fiber daily: start day with oatmeal (5g), add beans to meals (6-8g), eat apples/citrus (3-4g), include barley/psyllium supplements',
      rationale: `Your LDL (${ldl} mg/dL) needs fiber intervention. Every 10g soluble fiber daily reduces LDL by 5-7 mg/dL. Target: bring your LDL to optimal <100 mg/dL (current reduction needed: ${ldl - 100} mg/dL).`
    });

    dietaryRecs.push({
      category: 'Eliminate Trans Fats (Immediate)',
      recommendation: 'Zero tolerance for trans fats: check all food labels for "partially hydrogenated oil", avoid all fried fast foods, commercial baked goods, microwave popcorn, margarine',
      rationale: 'Trans fats raise your LDL while lowering HDL - the worst combination. Complete elimination can improve your cholesterol ratio by 15-20% within 4-6 weeks.'
    });
  } else {
    dietaryRecs.push({
      category: 'Maintain Heart-Healthy Fats',
      recommendation: 'Continue consuming healthy fats: fatty fish 2-3x/week, nuts (1-2 oz daily), olive oil, avocados',
      rationale: 'Your optimal lipid levels indicate excellent dietary fat choices. Omega-3s and monounsaturated fats support ongoing cardiovascular health.'
    });
  }

  if (hdlStatus === 'abnormal') {
    dietaryRecs.push({
      category: 'Boost HDL with Healthy Fats',
      recommendation: `Increase monounsaturated fats: use olive oil exclusively (3-4 Tbsp/day), eat avocado daily, consume raw nuts (almonds, walnuts) 1.5-2 oz/day`,
      rationale: `Your low HDL (${hdl} mg/dL) needs targeted intervention. Monounsaturated fats can raise HDL by 8-12% (target: bring you to optimal ≥60 mg/dL). Every 1 Tbsp olive oil daily can raise HDL by 1-2 mg/dL.`
    });

    dietaryRecs.push({
      category: 'Purple & Red Foods for HDL',
      recommendation: 'Eat anthocyanin-rich foods daily: blueberries, blackberries, red grapes, red cabbage, eggplant - 1-2 cups daily',
      rationale: `Your HDL (${hdl} mg/dL) benefits from anthocyanins which increase HDL by 5-8%. These antioxidants also improve HDL functionality, making it more effective at removing cholesterol from arteries.`
    });
  }

  if (tgStatus !== 'normal') {
    dietaryRecs.push({
      category: 'Eliminate Simple Sugars (Critical)',
      recommendation: `Zero added sugars: no soda, juice, candy, pastries, sweetened coffee drinks. Read labels - avoid anything with >5g sugar. Choose whole fruits only (limit to 2-3 servings/day)`,
      rationale: `Your triglycerides (${triglycerides} mg/dL) are directly raised by sugar. Each 25g sugar eliminated can lower triglycerides by 20-30 mg/dL. Your target reduction: ${Math.max(0, triglycerides - 150)} mg/dL to reach normal <150 mg/dL.`
    });

    dietaryRecs.push({
      category: 'Replace Refined Carbs',
      recommendation: 'Switch all refined grains to whole grains: brown rice, quinoa, 100% whole wheat bread, steel-cut oats. Limit total carbs to 40-45% of calories',
      rationale: `Refined carbs spike your triglycerides (current: ${triglycerides} mg/dL). Whole grain substitution can lower triglycerides by 15-20%. The fiber slows digestion, preventing triglyceride surges.`
    });

    lifestyleRecs.push({
      category: 'Strict Alcohol Limitation',
      recommendation: triglycerides >= 200 ? 'Complete alcohol abstinence until triglycerides normalize to <150 mg/dL' : 'Maximum 1 drink every 3-4 days. Completely avoid if triglycerides worsen',
      rationale: `Your triglycerides (${triglycerides} mg/dL) are highly sensitive to alcohol. The liver prioritizes alcohol metabolism, converting it directly to triglycerides. Abstinence can lower levels by 30-40% within 2-4 weeks.`
    });
  }

  // Dynamic lifestyle recommendations based on specific lipid abnormalities
  if (cholStatus === 'abnormal' || ldlStatus === 'abnormal') {
    lifestyleRecs.push({
      category: 'Intensive Aerobic Exercise',
      recommendation: 'Perform 200-250 minutes moderate-vigorous aerobic activity weekly: brisk walking, jogging, cycling, swimming. Include 2-3 high-intensity interval training (HIIT) sessions',
      rationale: `Your high cholesterol/LDL (Total: ${cholesterol} mg/dL, LDL: ${ldl} mg/dL) requires intensive exercise intervention. This volume can lower LDL by 10-15%, raise HDL by 8-12%, and reduce cardiovascular risk by 25-30%.`
    });
  } else if (cholStatus === 'borderline' || ldlStatus === 'borderline') {
    lifestyleRecs.push({
      category: 'Moderate Aerobic Exercise',
      recommendation: 'Maintain 150-180 minutes moderate aerobic activity weekly: brisk walking, cycling, swimming, dancing. Gradually increase intensity',
      rationale: 'Your borderline cholesterol levels respond well to moderate exercise. This can prevent progression to high cholesterol and improve lipid profile by 8-10%.'
    });
  } else {
    lifestyleRecs.push({
      category: 'Exercise Maintenance',
      recommendation: 'Continue 150+ minutes moderate aerobic activity weekly plus 2-3 strength sessions. Vary activities for sustained benefits',
      rationale: 'Your optimal cholesterol levels indicate effective exercise habits. Continue current regimen to maintain cardiovascular health.'
    });
  }

  if (ldlStatus !== 'normal' || cholStatus !== 'normal' || tgStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Weight Optimization (Priority)',
      recommendation: 'Target 1-2 lbs weight loss weekly through calorie reduction (500 cal/day deficit) and exercise until BMI 18.5-24.9. Track progress weekly',
      rationale: `Your lipid abnormalities strongly correlate with excess weight. Every 10 lbs lost can: reduce LDL by 5-8 mg/dL, increase HDL by 2-3 mg/dL, lower triglycerides by 20-30 mg/dL.`
    });
  } else if (hdlStatus === 'abnormal') {
    lifestyleRecs.push({
      category: 'Weight Management',
      recommendation: 'Maintain healthy BMI 18.5-24.9. If overweight, target 5-10% weight loss over 3-6 months',
      rationale: 'Low HDL improves significantly with weight loss. Even 5-10% reduction can raise HDL by 5-8 mg/dL and improve cholesterol ratio.'
    });
  }

  if (cholStatus !== 'normal' || ldlStatus !== 'normal' || hdlStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Tobacco Cessation (Critical)',
      recommendation: 'Quit all tobacco products immediately. Join cessation program, use nicotine replacement therapy, seek counseling support',
      rationale: `Smoking worsens your lipid profile. Quitting can: increase HDL by 10-15% within 8 weeks, improve arterial function, reduce heart disease risk by 50% within 1 year.`
    });
  }

  if (tgStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Evening Exercise',
      recommendation: 'Add 20-30 minute evening walk after dinner, 5-7 days weekly. This helps metabolize post-meal triglycerides',
      rationale: 'Your elevated triglycerides benefit from evening activity. Post-dinner exercise can lower triglycerides by 15-20% and improve fat metabolism overnight.'
    });
  }

  // Calculate counts and corrected risk FIRST
  const abnormalCount = breakdown.filter(b => b.status === 'abnormal').length;
  const borderlineCount = breakdown.filter(b => b.status === 'borderline').length;
  const urgentCount = specialists.filter(s => s.urgency === 'urgent').length;
  const soonCount = specialists.filter(s => s.urgency === 'soon').length;

  // Calculate combined risk using ML predictions + clinical rules
  const { correctedRiskLevel, correctedRiskScore } = calculateCombinedRiskAssessment(
    mlRiskData,
    abnormalCount,
    borderlineCount,
    urgentCount,
    soonCount,
    'Lipid Profile'
  );

  // Now use counts for dynamic lifestyle recommendations
  if (abnormalCount >= 2 || (abnormalCount >= 1 && borderlineCount >= 1)) {
    lifestyleRecs.push({
      category: 'Comprehensive Stress Management',
      recommendation: 'Practice 30 minutes daily stress reduction: mindfulness meditation, yoga, tai chi, or progressive relaxation. Consider stress counseling',
      rationale: 'Multiple lipid abnormalities indicate chronic stress impact. Stress elevates cortisol which worsens cholesterol. Consistent stress management can improve lipid profile by 8-12% within 8-12 weeks.'
    });
  } else {
    lifestyleRecs.push({
      category: 'Stress Management',
      recommendation: 'Maintain daily stress reduction practices: 15-20 minutes meditation, deep breathing, or relaxation exercises',
      rationale: 'Continue supporting healthy lipid metabolism through stress management. Chronic stress negatively affects cholesterol levels.'
    });
  }

  if (cholStatus !== 'normal' || ldlStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Sleep Quality',
      recommendation: 'Prioritize 7-8 hours quality sleep nightly. Maintain consistent sleep schedule, dark cool room, no screens 1 hour before bed',
      rationale: 'Poor sleep raises LDL and triglycerides while lowering HDL. Quality sleep can improve lipid profile by 5-8% and reduce cardiovascular risk.'
    });
  }

  let detailedFindings: string;

  // If all lipid values are optimal
  if (abnormalCount === 0 && borderlineCount === 0) {
    detailedFindings = `Outstanding! Your lipid profile shows excellent cardiovascular health. Total cholesterol (${cholesterol} mg/dL), LDL cholesterol (${ldl} mg/dL), HDL cholesterol (${hdl} mg/dL), and triglycerides (${triglycerides} mg/dL) are all at optimal levels. This significantly reduces your risk of heart disease, stroke, and other cardiovascular conditions. Your heart-healthy lifestyle is clearly paying off. Continue these positive habits to maintain your excellent cardiovascular health.`;

    lifestyleRecs.push({
      category: 'Maintain Heart-Healthy Lifestyle',
      recommendation: 'Continue regular cardiovascular exercise (150 minutes moderate or 75 minutes vigorous per week), maintain healthy weight, and avoid smoking',
      rationale: 'Your optimal lipid levels reflect excellent cardiovascular habits. Consistency is key to long-term heart health.'
    });

    dietaryRecs.push({
      category: 'Continue Heart-Healthy Diet',
      recommendation: 'Keep up your balanced diet rich in fruits, vegetables, whole grains, lean proteins, and healthy fats (omega-3s, nuts, olive oil)',
      rationale: 'Your dietary choices are clearly supporting optimal cholesterol levels and cardiovascular health.'
    });

    // Add routine follow-up recommendation
    specialists.push({
      type: 'General Practitioner',
      reason: 'Annual lipid panel check to continue monitoring your excellent cardiovascular health',
      urgency: 'routine'
    });
  } else {
    const abnormalParams = breakdown.filter(b => b.status === 'abnormal').map(b => b.parameter);
    const borderlineParams = breakdown.filter(b => b.status === 'borderline').map(b => b.parameter);

    detailedFindings = `Your Lipid Profile reveals ${abnormalCount} abnormal parameter(s)${borderlineCount > 0 ? ` and ${borderlineCount} borderline value(s)` : ''} indicating ${correctedRiskLevel} cardiovascular risk. `;

    if (abnormalParams.length > 0) {
      detailedFindings += `Abnormal findings include: ${abnormalParams.join(', ')}. `;
    }
    if (borderlineParams.length > 0) {
      detailedFindings += `Borderline values: ${borderlineParams.join(', ')}. `;
    }

    detailedFindings += `These results indicate increased risk for atherosclerosis, heart disease, and stroke. Immediate lifestyle modifications including diet, exercise, and stress management are essential. ${specialists.length > 0 ? 'Medical consultation with ' + specialists[0].type + ' is recommended for comprehensive cardiovascular risk assessment and potential medication therapy.' : 'Follow the detailed dietary and lifestyle recommendations below to improve these values.'}`;
  }

  // Ensure at least one specialist is always recommended
  if (specialists.length === 0) {
    specialists.push({
      type: 'General Practitioner',
      reason: 'Regular checkup and cardiovascular health monitoring',
      urgency: 'routine'
    });
  }

  return {
    detailedFindings,
    labValueBreakdown: breakdown,
    lifestyleRecommendations: lifestyleRecs,
    dietaryRecommendations: dietaryRecs,
    suggestedSpecialists: specialists,
    correctedRiskLevel,
    correctedRiskScore
  };
}

function analyzeUrinalysisRules(
  values: Record<string, string | number>,
  mlRiskData: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number }
): RulesBasedAnalysis {

  const ph = parseFloat(String(values.ph || 6.0));
  // Handle both snake_case (from OCR) and camelCase (from other sources)
  const specificGravity = parseFloat(String(values.specific_gravity || values.specificGravity || 1.015));
  const proteinValue = String(values.protein || 'Negative').toLowerCase();
  const protein = proteinValue === 'positive' || proteinValue === 'trace' ? proteinValue : 'negative';
  
  // Microscopic examination parameters
  const pusCells = parseFloat(String(values.leukocyte_esterase || values.wbc_urine || 0)); // Pus cells (WBC/HPF)
  const redCells = parseFloat(String(values.rbc_urine || values.blood || 0)); // Red cells (RBC/HPF)
  const bacteriaValue = String(values.bacteria || 'Negative').toLowerCase();
  const bacteria = bacteriaValue === 'few' || bacteriaValue === 'moderate' || bacteriaValue === 'many' ? bacteriaValue : 'negative';
  
  // Chemistry parameters
  const glucose = parseFloat(String(values.glucose || 0));
  const ketones = parseFloat(String(values.ketones || 0));
  const nitrites = parseFloat(String(values.nitrites || 0));
  
  // Physical examination
  const color = String(values.color || 'Yellow').toLowerCase();
  const clarity = String(values.clarity || 'Clear').toLowerCase();

  const breakdown: LabValue[] = [];
  const lifestyleRecs: Array<{ category: string; recommendation: string; rationale: string }> = [];
  const dietaryRecs: Array<{ category: string; recommendation: string; rationale: string }> = [];
  const specialists: Array<{ type: string; reason: string; urgency: 'routine' | 'soon' | 'urgent' }> = [];

  // pH Analysis (Normal: 4.5-8.0, Optimal: 6.0-7.0)
  let phStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let phInterpretation = 'Urine pH is within normal range, indicating balanced acid-base metabolism.';

  if (ph < 4.5) {
    phStatus = 'abnormal';
    phInterpretation = 'Very acidic urine may indicate metabolic acidosis, diabetes, dehydration, or high-protein diet. Can increase kidney stone risk (uric acid stones).';
    specialists.push({
      type: 'Nephrologist',
      reason: 'Abnormally acidic urine requires kidney function evaluation',
      urgency: 'soon'
    });
  } else if (ph > 8.0) {
    phStatus = 'abnormal';
    phInterpretation = 'Very alkaline urine may suggest urinary tract infection, kidney disease, or vegetarian diet. Can increase risk of calcium phosphate stones.';
    specialists.push({
      type: 'Nephrologist',
      reason: 'Abnormally alkaline urine requires evaluation for UTI or kidney issues',
      urgency: 'soon'
    });
  } else if (ph < 5.5) {
    phStatus = 'borderline';
    phInterpretation = `Acidic urine (pH ${ph.toFixed(1)}) is at the lower end of normal range. This may indicate dietary factors (high protein intake), mild dehydration, or early metabolic changes. While not critically abnormal, monitoring is recommended. Consider increasing hydration and alkaline foods (fruits, vegetables).`;
  } else if (ph > 7.5) {
    phStatus = 'borderline';
    phInterpretation = 'Urine pH is slightly alkaline but within normal range. May be due to dietary factors or normal variation.';
  }

  breakdown.push({
    parameter: 'Urine pH',
    value: ph.toFixed(1),
    normalRange: '4.5-8.0',
    status: phStatus,
    interpretation: phInterpretation
  });

  // Specific Gravity Analysis (Normal: 1.005-1.030)
  let sgStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let sgInterpretation = 'Urine specific gravity is within normal range, indicating adequate kidney concentration ability.';

  if (specificGravity < 1.005) {
    sgStatus = 'abnormal';
    sgInterpretation = 'Low specific gravity may indicate excessive fluid intake or impaired kidney concentrating ability (e.g., diabetes insipidus, chronic kidney disease).';
    specialists.push({
      type: 'Nephrologist',
      reason: 'Low specific gravity requires evaluation for kidney concentrating ability',
      urgency: 'soon'
    });
  } else if (specificGravity > 1.030) {
    sgStatus = 'abnormal';
    sgInterpretation = 'High specific gravity may indicate dehydration, fever, or presence of high concentrations of solutes like glucose or protein. Suggests concentrated urine.';
    if (!specialists.find(s => s.type === 'Nephrologist')) {
      specialists.push({
        type: 'Nephrologist',
        reason: 'High specific gravity requires evaluation for dehydration or other causes',
        urgency: 'soon'
      });
    }
  }

  // Log the actual values being used for debugging
  console.log('[Urinalysis Analysis] Using values:', {
    ph: ph,
    specificGravity: specificGravity,
    protein: protein,
    pusCells: pusCells,
    redCells: redCells,
    bacteria: bacteria,
    rawValues: values
  });

  // Physical Examination - Color
  breakdown.push({
    parameter: 'Color',
    value: color.charAt(0).toUpperCase() + color.slice(1),
    normalRange: 'Yellow to Amber',
    status: 'normal',
    interpretation: `Urine color is ${color}, which is normal. Color variations can indicate hydration status or presence of substances.`
  });

  // Physical Examination - Clarity/Transparency
  let clarityStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let clarityInterpretation = 'Urine is clear, indicating no suspended particles or cloudiness.';
  
  if (clarity.includes('hazy') || clarity.includes('cloudy')) {
    clarityStatus = 'borderline';
    clarityInterpretation = 'Urine appears hazy/cloudy, which may indicate presence of cells, bacteria, crystals, or mucus. Often associated with urinary tract infections or dehydration.';
  } else if (clarity.includes('turbid')) {
    clarityStatus = 'abnormal';
    clarityInterpretation = 'Urine is turbid (very cloudy), suggesting significant presence of cells, bacteria, or other particles. This warrants investigation for infection or other conditions.';
  }
  
  breakdown.push({
    parameter: 'Transparency/Clarity',
    value: clarity.charAt(0).toUpperCase() + clarity.slice(1),
    normalRange: 'Clear',
    status: clarityStatus,
    interpretation: clarityInterpretation
  });

  breakdown.push({
    parameter: 'Specific Gravity',
    value: specificGravity.toFixed(3),
    normalRange: '1.005-1.030',
    status: sgStatus,
    interpretation: sgInterpretation
  });

  // Protein Analysis (Normal: Negative)
  let proteinStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let proteinInterpretation = 'No protein detected in urine, indicating healthy kidney filtration.';

  if (protein === 'positive') {
    proteinStatus = 'abnormal';
    proteinInterpretation = 'Protein in urine (proteinuria) indicates kidney damage or dysfunction. May result from diabetes, hypertension, kidney disease, or urinary tract infection. Requires immediate evaluation.';
    if (!specialists.find(s => s.type === 'Nephrologist')) {
      specialists.push({
        type: 'Nephrologist',
        reason: 'Proteinuria requires comprehensive kidney function evaluation and potential biopsy',
        urgency: 'urgent'
      });
    }
  } else if (protein === 'trace') {
    proteinStatus = 'borderline';
    proteinInterpretation = 'Trace protein may be normal variation from exercise, dehydration, or fever. Persistent trace protein requires follow-up to rule out early kidney disease.';
    if (!specialists.find(s => s.type === 'Nephrologist')) {
      specialists.push({
        type: 'Nephrologist',
        reason: 'Trace protein warrants repeat testing and kidney function monitoring',
        urgency: 'routine'
      });
    }
  }

  breakdown.push({
    parameter: 'Protein',
    value: protein.charAt(0).toUpperCase() + protein.slice(1),
    normalRange: 'Negative',
    status: proteinStatus,
    interpretation: proteinInterpretation
  });

  // Glucose Analysis
  let glucoseStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let glucoseInterpretation = 'No glucose detected in urine, indicating normal blood sugar levels and kidney filtration.';
  
  if (glucose > 0) {
    glucoseStatus = 'abnormal';
    glucoseInterpretation = 'Glucose present in urine (glycosuria) typically indicates diabetes mellitus or other conditions causing elevated blood sugar. Requires immediate medical evaluation.';
    if (!specialists.find(s => s.type === 'Endocrinologist')) {
      specialists.push({
        type: 'Endocrinologist',
        reason: 'Glucose in urine requires diabetes screening and blood sugar evaluation',
        urgency: 'soon'
      });
    }
  }
  
  breakdown.push({
    parameter: 'Sugar/Glucose',
    value: glucose > 0 ? 'Positive' : 'Negative',
    normalRange: 'Negative',
    status: glucoseStatus,
    interpretation: glucoseInterpretation
  });

  // Microscopic Examination - Pus Cells (WBC/HPF)
  let pusCellsStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let pusCellsInterpretation = 'Pus cells (white blood cells) are within normal range, indicating no urinary tract infection.';
  
  if (pusCells > 15) {
    pusCellsStatus = 'abnormal';
    pusCellsInterpretation = `High pus cell count (${pusCells}/HPF) strongly indicates urinary tract infection (UTI). White blood cells fight infection. This level requires antibiotic treatment and urine culture to identify bacteria.`;
    if (!specialists.find(s => s.type === 'Urologist' || s.type === 'Nephrologist')) {
      specialists.push({
        type: 'Urologist',
        reason: `High pus cells (${pusCells}/HPF) indicate urinary tract infection requiring treatment`,
        urgency: 'urgent'
      });
    }
  } else if (pusCells >= 6) {
    pusCellsStatus = 'borderline';
    pusCellsInterpretation = `Elevated pus cells (${pusCells}/HPF) suggest possible urinary tract infection or inflammation. Normal is 0-5/HPF. Recommend repeat test and clinical correlation with symptoms (burning, frequency, urgency).`;
    if (!specialists.find(s => s.type === 'Urologist')) {
      specialists.push({
        type: 'Urologist',
        reason: `Elevated pus cells (${pusCells}/HPF) warrant evaluation for possible UTI`,
        urgency: 'soon'
      });
    }
  }
  
  breakdown.push({
    parameter: 'Pus Cells (WBC)',
    value: `${pusCells.toFixed(0)}/HPF`,
    normalRange: '0-5/HPF',
    status: pusCellsStatus,
    interpretation: pusCellsInterpretation
  });

  // Microscopic Examination - Red Blood Cells (RBC/HPF)
  let redCellsStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let redCellsInterpretation = 'Red blood cells are within normal range, indicating no bleeding in urinary tract.';
  
  if (redCells > 15) {
    redCellsStatus = 'abnormal';
    redCellsInterpretation = `High red cell count (${redCells}/HPF) indicates hematuria (blood in urine). Causes include urinary tract infection, kidney stones, bladder inflammation, or more serious conditions. Requires immediate medical evaluation.`;
    if (!specialists.find(s => s.type === 'Urologist' || s.type === 'Nephrologist')) {
      specialists.push({
        type: 'Urologist',
        reason: `Blood in urine (${redCells} RBC/HPF) requires investigation to rule out stones, infection, or other conditions`,
        urgency: 'urgent'
      });
    }
  } else if (redCells >= 4) {
    redCellsStatus = 'borderline';
    redCellsInterpretation = `Elevated red cells (${redCells}/HPF) indicate microscopic hematuria. Normal is 0-3/HPF. May result from infection, minor trauma, or kidney issues. Warrants follow-up testing and evaluation.`;
    if (!specialists.find(s => s.type === 'Urologist')) {
      specialists.push({
        type: 'Urologist',
        reason: `Microscopic hematuria (${redCells} RBC/HPF) needs evaluation`,
        urgency: 'soon'
      });
    }
  }
  
  breakdown.push({
    parameter: 'Red Cells (RBC)',
    value: `${redCells.toFixed(0)}/HPF`,
    normalRange: '0-3/HPF',
    status: redCellsStatus,
    interpretation: redCellsInterpretation
  });

  // Bacteria Analysis
  let bacteriaStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
  let bacteriaInterpretation = 'No bacteria detected, indicating sterile urine and no infection.';
  
  if (bacteria === 'many' || bacteria === 'moderate') {
    bacteriaStatus = 'abnormal';
    bacteriaInterpretation = `${bacteria.charAt(0).toUpperCase() + bacteria.slice(1)} bacteria present in urine strongly supports urinary tract infection diagnosis. Requires antibiotic treatment and urine culture.`;
  } else if (bacteria === 'few') {
    bacteriaStatus = 'borderline';
    bacteriaInterpretation = 'Few bacteria present may indicate contamination during collection or early infection. Clinical correlation needed. If symptomatic, may support UTI diagnosis.';
  }
  
  breakdown.push({
    parameter: 'Bacteria',
    value: bacteria.charAt(0).toUpperCase() + bacteria.slice(1),
    normalRange: 'Negative',
    status: bacteriaStatus,
    interpretation: bacteriaInterpretation
  });

  // UTI-specific recommendations
  if (pusCellsStatus === 'abnormal' || redCellsStatus === 'abnormal') {
    dietaryRecs.push({
      category: 'Cranberry & UTI Prevention (Critical)',
      recommendation: 'Drink 100% pure cranberry juice (8-16 oz daily) or take cranberry supplements (500mg twice daily). Avoid sweetened versions.',
      rationale: `Your high pus cells (${pusCells}/HPF) and red cells (${redCells}/HPF) indicate UTI. Cranberries contain proanthocyanidins that prevent bacteria from adhering to urinary tract walls, reducing infection by 35-40%. Start immediately alongside antibiotics.`
    });

    dietaryRecs.push({
      category: 'Aggressive Hydration for UTI (Priority)',
      recommendation: 'Drink 12-14 glasses (96-112 oz) water daily, spreading intake evenly. Urinate every 2-3 hours even if not urgent. Add lemon to water for antibacterial benefit.',
      rationale: `Your UTI (pus ${pusCells}/HPF, RBC ${redCells}/HPF) requires flushing bacteria from bladder. Aggressive hydration dilutes urine, reduces bacterial concentration by 60%, and helps eliminate infection faster. Critical for recovery.`
    });

    dietaryRecs.push({
      category: 'Vitamin C Supplementation',
      recommendation: 'Take 500-1000mg vitamin C daily. Eat citrus fruits, bell peppers, kiwi, strawberries throughout day.',
      rationale: 'Vitamin C acidifies urine, creating hostile environment for bacteria. Can reduce UTI recurrence by 50% and support immune system fighting current infection.'
    });

    dietaryRecs.push({
      category: 'Avoid Bladder Irritants (Critical)',
      recommendation: 'Eliminate: caffeine (coffee, tea, soda), alcohol, spicy foods, artificial sweeteners, citrus juices (except cranberry). These worsen UTI symptoms.',
      rationale: `Your elevated pus/red cells indicate active infection. Bladder irritants increase inflammation by 40%, worsen burning/frequency, and slow healing. Elimination provides symptom relief within 24-48 hours.`
    });

    lifestyleRecs.push({
      category: 'UTI Hygiene Protocol (Essential)',
      recommendation: 'Wipe front to back after bathroom use. Urinate immediately after sexual activity. Wear cotton underwear. Avoid tight clothing. Change underwear daily.',
      rationale: 'Your UTI requires strict hygiene to prevent reinfection. These measures reduce bacterial entry into urethra by 70%. Critical for preventing chronic recurrent UTIs.'
    });

    lifestyleRecs.push({
      category: 'Complete Antibiotic Course',
      recommendation: 'Take full course of antibiotics as prescribed, even when symptoms improve. Do NOT stop early. Set phone reminders for doses.',
      rationale: `Your high WBC count (${pusCells}/HPF) requires complete bacterial eradication. Stopping antibiotics early allows resistant bacteria to survive, causing recurrent infection in 40% of cases. Complete course prevents resistance.`
    });

    lifestyleRecs.push({
      category: 'Rest and Immune Support',
      recommendation: 'Get 8-9 hours sleep nightly during infection. Avoid strenuous exercise temporarily. Use heating pad on lower abdomen for pain relief (20 min sessions).',
      rationale: 'Sleep boosts immune system by 60%, helping fight infection faster. Rest allows body to focus energy on healing. Heat increases blood flow to bladder, reducing pain and supporting recovery.'
    });
  } else if (pusCellsStatus === 'borderline' || redCellsStatus === 'borderline' || clarityStatus !== 'normal') {
    dietaryRecs.push({
      category: 'Enhanced Hydration',
      recommendation: 'Increase water intake to 10-12 glasses (80-96 oz) daily. Monitor urine color - aim for pale yellow.',
      rationale: `Your borderline findings (pus ${pusCells}/HPF, RBC ${redCells}/HPF, ${clarity} urine) benefit from enhanced hydration to flush urinary tract and prevent infection progression.`
    });

    dietaryRecs.push({
      category: 'Cranberry Prevention',
      recommendation: 'Consider daily cranberry supplement (500mg) or 6-8 oz pure cranberry juice as preventive measure.',
      rationale: 'Borderline urinary findings suggest need for prevention. Cranberry reduces UTI risk by 35% through bacterial anti-adhesion properties.'
    });
  }

  // Dietary recommendations based on specific findings
  if (proteinStatus === 'abnormal') {
    dietaryRecs.push({
      category: 'Strict Sodium Restriction (Critical)',
      recommendation: 'Limit sodium to 1,500mg daily maximum: no processed foods, no restaurant meals, cook all food fresh. Track sodium in food diary. Use herbs/spices instead of salt',
      rationale: `Your protein in urine (${protein}) indicates kidney stress. High sodium worsens proteinuria by 30-40%. Every 1000mg sodium reduction can decrease protein excretion by 15-20%. This is your #1 dietary priority for kidney protection.`
    });

    dietaryRecs.push({
      category: 'Precise Protein Management',
      recommendation: 'Calculate exact protein needs: 0.6-0.8g per kg ideal body weight daily. If 70kg = 42-56g protein/day. Choose high-biological-value proteins: eggs (6g each), fish (20g/serving), chicken breast (25g/serving)',
      rationale: `Your proteinuria (${protein}) requires protein restriction. Excess protein forces kidneys to work 50% harder. Reducing to 0.8g/kg can decrease protein in urine by 20-30% and slow kidney damage progression by 40%.`
    });

    dietaryRecs.push({
      category: 'Kidney-Protective Foods (Priority)',
      recommendation: 'Daily kidney support: red bell peppers (high in vitamins, low potassium), cabbage, cauliflower, onions, apples, cranberries. Avoid bananas, oranges, tomatoes, potatoes (high potassium)',
      rationale: `Proteinuria damages kidneys. These specific foods reduce oxidative stress on kidneys by 25-30% while avoiding high-potassium foods that stressed kidneys can't handle. Target: normalize protein in urine.`
    });

    dietaryRecs.push({
      category: 'Phosphorus Control',
      recommendation: 'Limit phosphorus to 800-1000mg daily: avoid dairy, nuts, beans, dark sodas, processed foods with phosphate additives. Check labels for ingredients ending in "phosphate"',
      rationale: 'Kidney damage from proteinuria impairs phosphorus excretion. High phosphorus accelerates kidney disease by 35%. Controlling it protects remaining kidney function.'
    });
  } else if (proteinStatus === 'borderline') {
    dietaryRecs.push({
      category: 'Moderate Sodium Reduction',
      recommendation: 'Reduce sodium to 2,000-2,300mg daily: minimize processed foods, don\'t add salt at table, use low-sodium products',
      rationale: `Your trace protein in urine suggests early kidney stress. Moderate sodium restriction (2,000mg) can prevent progression to proteinuria and reduce kidney workload by 15-20%.`
    });

    dietaryRecs.push({
      category: 'Balanced Protein',
      recommendation: 'Maintain protein at 0.8-1.0g per kg body weight. Mix plant and animal proteins: fish, poultry, legumes, tofu',
      rationale: 'Trace protein indicates need for kidney-conscious eating. This protein level supports nutrition while preventing kidney stress that could worsen proteinuria.'
    });
  } else {
    dietaryRecs.push({
      category: 'Kidney-Healthy Nutrition',
      recommendation: 'Continue balanced diet: moderate sodium (<2,300mg), adequate protein (0.8-1.0g/kg), plenty of fruits and vegetables',
      rationale: 'Your normal urine protein indicates healthy kidney function. Maintain these habits to prevent future kidney issues.'
    });
  }

  if (phStatus === 'abnormal') {
    if (ph < 4.5) {
      dietaryRecs.push({
        category: 'Alkalinizing Foods (Critical)',
        recommendation: `Increase alkaline foods aggressively: eat 6-8 servings vegetables daily, 3-4 servings fruits, minimize animal protein to 1 serving/day temporarily. Focus on: spinach, kale, cucumber, broccoli, avocado`,
        rationale: `Your very acidic urine pH (${ph.toFixed(1)}) increases uric acid kidney stone risk by 300%. Alkaline diet can raise pH by 0.8-1.2 units within 1-2 weeks, reducing stone formation risk to normal levels. Target pH: 6.0-7.0.`
      });

      dietaryRecs.push({
        category: 'Citrate Supplementation',
        recommendation: 'Drink 8 oz lemon water or lime water 3-4 times daily. Add 2 Tbsp lemon juice to each glass. Alternatively: potassium citrate supplement (consult doctor)',
        rationale: `Your pH ${ph.toFixed(1)} needs citrate. Citrate raises urine pH and prevents stone formation by binding calcium. Can increase pH by 0.5-0.8 units and reduce stone risk by 60-70%.`
      });
    } else if (ph > 8.0) {
      dietaryRecs.push({
        category: 'Acidifying Foods',
        recommendation: 'Increase protein slightly: add lean meats, fish, eggs to meals. Include whole grains. Reduce very alkaline foods temporarily',
        rationale: `Your alkaline urine pH (${ph.toFixed(1)}) may increase calcium phosphate stone risk. Moderate protein intake can lower pH by 0.4-0.6 units to optimal range, reducing stone formation.`
      });
    }
  } else if (ph < 5.0 || ph > 7.5) {
    dietaryRecs.push({
      category: 'pH Balance',
      recommendation: ph < 5.5 ? 'Add more vegetables and fruits to each meal to gently raise pH' : 'Include moderate protein with meals for pH balance',
      rationale: `Your borderline pH (${ph.toFixed(1)}) benefits from dietary adjustment. Small changes can optimize pH and reduce any stone formation risk.`
    });
  }

  if (sgStatus === 'abnormal') {
    if (specificGravity > 1.030) {
      dietaryRecs.push({
        category: 'Aggressive Hydration & Electrolytes',
        recommendation: 'Drink 12-14 glasses (96-112 oz) water daily, spread evenly. Add electrolyte drinks (no sugar): coconut water, diluted sports drinks. Eat water-rich foods: watermelon, cucumber, celery',
        rationale: `Your high specific gravity (${specificGravity.toFixed(3)}) indicates dehydration. This concentrates toxins, stresses kidneys, increases stone risk by 200%. Aggressive hydration can normalize SG to 1.010-1.020 within 24-48 hours.`
      });
    } else if (specificGravity < 1.005) {
      dietaryRecs.push({
        category: 'Electrolyte Optimization',
        recommendation: 'Add electrolytes to water: pinch of sea salt, coconut water, or electrolyte tablets. Don\'t over-hydrate - aim for balanced intake based on thirst',
        rationale: `Your low specific gravity (${specificGravity.toFixed(3)}) suggests dilute urine. While hydration is good, ensure adequate electrolyte balance for optimal kidney function.`
      });
    }
  }

  // Dynamic lifestyle recommendations based on findings
  if (proteinStatus === 'abnormal') {
    lifestyleRecs.push({
      category: 'Intensive Hydration',
      recommendation: 'Increase water intake to 10-12 glasses (80-96 oz) daily. Drink consistently throughout day, not all at once. Monitor urine color - aim for pale yellow',
      rationale: `Your protein in urine (${protein}) requires enhanced hydration to flush kidneys. Adequate fluid intake can reduce protein excretion by 15-20% and prevent kidney stone formation.`
    });
  } else if (proteinStatus === 'borderline' || phStatus !== 'normal' || sgStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Enhanced Hydration',
      recommendation: 'Drink 8-10 glasses (64-80 oz) water daily, spread evenly throughout day. Add lemon for pH balance if needed',
      rationale: 'Your borderline findings benefit from consistent hydration. Proper fluid intake supports kidney filtration and helps normalize urine parameters.'
    });
  } else {
    lifestyleRecs.push({
      category: 'Hydration Maintenance',
      recommendation: 'Maintain 8-10 glasses (64-80 oz) of water daily, adjusting for exercise and climate',
      rationale: 'Continue supporting healthy kidney function through adequate hydration. Your normal results indicate good fluid intake.'
    });
  }

  if (proteinStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Blood Pressure Monitoring (Critical)',
      recommendation: 'Check blood pressure daily at same time. Keep log. Target <120/80 mmHg through DASH diet, exercise, stress reduction, and medication if prescribed',
      rationale: 'Proteinuria indicates kidney stress often from high blood pressure. Every 10 mmHg BP reduction can decrease protein excretion by 20-30% and slow kidney disease progression by 40%.'
    });

    lifestyleRecs.push({
      category: 'Eliminate Nephrotoxic Substances',
      recommendation: 'Completely avoid NSAIDs (ibuprofen, naproxen, aspirin) unless prescribed by doctor. Stop all tobacco use. Eliminate alcohol consumption',
      rationale: `Your protein in urine indicates kidney damage. NSAIDs reduce kidney blood flow by 20%, tobacco decreases filtration by 15%, alcohol causes direct kidney cell damage. Elimination is critical for kidney recovery.`
    });

    lifestyleRecs.push({
      category: 'Gentle Exercise Only',
      recommendation: 'Perform 20-30 minutes low-impact exercise daily: walking, swimming, gentle yoga. Avoid intense workouts until protein normalizes',
      rationale: 'Intense exercise temporarily increases protein in urine. Gentle activity supports kidney health and blood pressure control without stressing kidneys further.'
    });
  } else {
    lifestyleRecs.push({
      category: 'Regular Exercise',
      recommendation: 'Maintain 30-45 minutes moderate exercise most days: brisk walking, swimming, cycling',
      rationale: 'Regular activity supports kidney health, controls blood pressure/blood sugar, and reduces kidney disease risk factors.'
    });
  }

  if (phStatus === 'abnormal' || proteinStatus !== 'normal' || sgStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Blood Sugar Control',
      recommendation: 'Monitor blood glucose if diabetic. Maintain HbA1c <7%. Check fasting glucose quarterly even if not diabetic',
      rationale: 'Abnormal urine parameters often indicate early diabetes impact on kidneys. Tight glucose control can prevent kidney disease progression by 50-60%.'
    });
  }

  if (proteinStatus === 'abnormal') {
    lifestyleRecs.push({
      category: 'Sleep Optimization for Kidney Repair',
      recommendation: 'Prioritize 8-9 hours quality sleep nightly. Sleep on back with slight elevation. Maintain consistent sleep schedule',
      rationale: 'Kidney repair occurs primarily during deep sleep. Quality sleep reduces proteinuria by 10-15% and supports kidney cell regeneration.'
    });
  }

  if (phStatus !== 'normal') {
    lifestyleRecs.push({
      category: 'Dietary pH Management',
      recommendation: ph < 5.5
        ? 'Increase alkaline foods to balance pH: more vegetables, fruits, nuts. Reduce animal protein temporarily'
        : 'Balance diet with appropriate protein and whole grains to normalize pH',
      rationale: `Your urine pH (${ph.toFixed(1)}) ${ph < 5.5 ? 'is too acidic, increasing kidney stone risk. Alkaline foods can raise pH by 0.5-1.0 units' : 'needs balanced nutrition to normalize. Diet significantly influences urine pH'}.`
    });
  }

  // Calculate counts and corrected risk FIRST
  const abnormalCount = breakdown.filter(b => b.status === 'abnormal').length;
  const borderlineCount = breakdown.filter(b => b.status === 'borderline').length;
  const urgentCount = specialists.filter(s => s.urgency === 'urgent').length;
  const soonCount = specialists.filter(s => s.urgency === 'soon').length;

  // Calculate combined risk using ML predictions + clinical rules
  const { correctedRiskLevel, correctedRiskScore } = calculateCombinedRiskAssessment(
    mlRiskData,
    abnormalCount,
    borderlineCount,
    urgentCount,
    soonCount,
    'Urinalysis'
  );

  let detailedFindings: string;

  // All normal results OR borderline only with low ML risk
  if (abnormalCount === 0 && borderlineCount === 0 && mlRiskData.riskLevel === 'low') {
    detailedFindings = `Great news! Your urinalysis shows completely normal results. pH (${ph}), specific gravity (${specificGravity}), protein (${protein}), and all other parameters are within healthy ranges. This indicates excellent kidney function, proper hydration, and no signs of urinary tract infection or other urinary system issues. Your kidneys are efficiently filtering waste and maintaining proper fluid balance. Continue your healthy lifestyle to maintain optimal kidney and urinary tract health.`;

    lifestyleRecs.push({
      category: 'Maintain Kidney Health',
      recommendation: 'Continue adequate daily hydration (8-10 glasses water), maintain healthy weight, and engage in regular physical activity',
      rationale: 'Your healthy urinalysis reflects good kidney function and hydration. These habits support long-term renal health.'
    });

    dietaryRecs.push({
      category: 'Kidney-Friendly Diet',
      recommendation: 'Continue balanced diet with moderate protein, plenty of fruits and vegetables, and limited processed foods',
      rationale: 'Your current dietary patterns support optimal kidney function and urinary health.'
    });

    // Add routine follow-up recommendation
    specialists.push({
      type: 'General Practitioner',
      reason: 'Annual urinalysis to continue monitoring your excellent kidney and urinary tract health',
      urgency: 'routine'
    });
  } else if (abnormalCount === 0 && borderlineCount > 0) {
    // Borderline findings with moderate ML risk
    const borderlineParams = breakdown.filter(b => b.status === 'borderline').map(b => b.parameter);
    
    detailedFindings = `Your urinalysis shows ${borderlineCount} borderline finding(s): ${borderlineParams.join(', ')}. While technically within normal ranges, these values are at the edges and warrant attention. `;
    
    if (ph < 5.5) {
      detailedFindings += `Your acidic urine pH (${ph.toFixed(1)}) may increase risk of uric acid kidney stones and could indicate dietary imbalances or early metabolic changes. `;
    }
    
    detailedFindings += `The AI analysis indicates ${correctedRiskLevel} risk (score: ${correctedRiskScore}/100). These borderline values suggest the need for lifestyle adjustments, particularly regarding hydration and diet. Follow the recommendations below to optimize your urinary health and prevent progression to more concerning levels.`;
  } else {
    const abnormalParams = breakdown.filter(b => b.status === 'abnormal').map(b => b.parameter);
    const borderlineParams = breakdown.filter(b => b.status === 'borderline').map(b => b.parameter);

    detailedFindings = `Your Urinalysis reveals ${abnormalCount} abnormal finding(s)${borderlineCount > 0 ? ` and ${borderlineCount} borderline value(s)` : ''} indicating ${correctedRiskLevel} kidney health risk. `;

    if (abnormalParams.length > 0) {
      detailedFindings += `Abnormal findings: ${abnormalParams.join(', ')}. `;
    }
    if (borderlineParams.length > 0) {
      detailedFindings += `Borderline values: ${borderlineParams.join(', ')}. `;
    }

    detailedFindings += `These results may indicate kidney stress, damage, or dysfunction. ${protein !== 'negative' ? 'Protein in urine is particularly concerning as it often signals kidney disease or damage from conditions like diabetes or hypertension. ' : ''}${specialists.length > 0 ? 'Immediate consultation with ' + specialists[0].type + ' is essential for comprehensive kidney function testing (creatinine, GFR, albumin) and treatment planning.' : 'Follow the dietary and lifestyle recommendations to support kidney health.'} Early intervention can prevent progression to chronic kidney disease.`;
  }

  // Ensure at least one specialist is always recommended
  if (specialists.length === 0) {
    specialists.push({
      type: 'General Practitioner',
      reason: 'Routine urinalysis review and kidney health monitoring',
      urgency: 'routine'
    });
  }

  return {
    detailedFindings,
    labValueBreakdown: breakdown,
    lifestyleRecommendations: lifestyleRecs,
    dietaryRecommendations: dietaryRecs,
    suggestedSpecialists: specialists,
    correctedRiskLevel,
    correctedRiskScore
  };
}

function analyzeGenericRules(
  values: Record<string, string | number>,
  mlRiskData: { riskLevel: 'low' | 'moderate' | 'high'; riskScore: number }
): RulesBasedAnalysis {

  const breakdown = Object.entries(values).map(([key, value]) => ({
    parameter: key.toUpperCase(),
    value: String(value),
    normalRange: 'Varies',
    status: 'normal' as const,
    interpretation: `${key} value recorded. Please consult with your healthcare provider for detailed interpretation of this parameter.`
  }));

  return {
    detailedFindings: `Your lab results have been processed with a ${mlRiskData.riskLevel} risk assessment (score: ${mlRiskData.riskScore}/100). All extracted values are available for review. For comprehensive interpretation and personalized recommendations specific to this lab type, please consult with a qualified healthcare professional who can consider your complete medical history, current medications, and overall health status.`,
    labValueBreakdown: breakdown,
    lifestyleRecommendations: [
      {
        category: 'General Health',
        recommendation: 'Maintain regular physical activity, healthy sleep patterns, and stress management practices',
        rationale: 'General health maintenance supports optimal lab values and overall well-being'
      }
    ],
    dietaryRecommendations: [
      {
        category: 'Balanced Diet',
        recommendation: 'Follow a balanced diet rich in fruits, vegetables, whole grains, and lean proteins',
        rationale: 'Nutritious, varied diet supports overall metabolic health and optimal lab results'
      }
    ],
    suggestedSpecialists: [],
    correctedRiskLevel: mlRiskData.riskLevel,
    correctedRiskScore: mlRiskData.riskScore
  };
}