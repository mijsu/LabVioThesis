/**
 * Lab Type Validation Service
 * 
 * Validates that uploaded images contain medical lab data matching the selected lab type.
 * Uses keyword/pattern detection to quickly reject non-medical images before expensive AI processing.
 */

export type LabType = 'cbc' | 'urinalysis' | 'lipid';

/**
 * Allowed lab types for validation
 */
export const ALLOWED_LAB_TYPES: readonly LabType[] = ['cbc', 'urinalysis', 'lipid'] as const;

interface LabValidationRules {
  requiredKeywords: string[];
  expectedParameters: string[];
  minimumParameterMatches: number;
  commonPatterns: RegExp[];
}

/**
 * Validation rules for each lab type based on medical standards
 */
const LAB_VALIDATION_RULES: Record<LabType, LabValidationRules> = {
  cbc: {
    requiredKeywords: [
      'complete blood count', 'cbc', 'blood count', 'hematology',
      'hemoglobin', 'haemoglobin', 'hgb', 'platelet'
    ],
    expectedParameters: [
      // Core CBC parameters
      'wbc', 'white blood cell', 'white blood count', 'leucocyte', 'leukocyte',
      'rbc', 'red blood cell', 'red blood count', 'erythrocyte',
      'hemoglobin', 'haemoglobin', 'hgb', 'hb',
      'hematocrit', 'haematocrit', 'hct', 'packed cell volume', 'pcv',
      'platelet', 'plt', 'thrombocyte',
      // RBC indices
      'mcv', 'mean corpuscular volume',
      'mch', 'mean corpuscular hemoglobin',
      'mchc', 'mean corpuscular hemoglobin concentration',
      // Differential
      'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil',
      'neutro', 'lympho', 'mono', 'eosino', 'baso'
    ],
    minimumParameterMatches: 4,
    commonPatterns: [
      /\d+\.?\d*\s*(x\s*10[\^]?\d+|10\^\d+|\*10\^\d+)/i, // e.g., "5.2 x 10^9/L"
      /\d+\.?\d*\s*(\/mm3|\/ul|\/µl|cells\/ul|cells\/µl)/i, // e.g., "8000/mm3"
      /\d+\.?\d*\s*(g\/dl|g\/l)/i, // Hemoglobin units
      /\d+\.?\d*\s*(fl|pg|%)/i, // Indices and percentages
      /(wbc|rbc|hgb|hb|hct|plt|platelet)\s*[:=]\s*\d+/i,
    ]
  },
  urinalysis: {
    requiredKeywords: [
      'urinalysis', 'urine analysis', 'urine test', 'urine exam',
      'microscopy', 'microscopic examination', 'physical examination', 'chemical examination'
    ],
    expectedParameters: [
      // Physical examination
      'color', 'colour', 'appearance', 'clarity', 'turbidity',
      // Chemical examination
      'specific gravity', 'sp gr', 'sg', 'ph',
      'protein', 'albumin', 'glucose', 'sugar',
      'ketone', 'acetone', 'blood', 'hemoglobin', 'haemoglobin',
      'bilirubin', 'urobilinogen', 'nitrite', 'nitrate',
      'leukocyte esterase', 'leukocyte', 'leucocyte',
      // Microscopic examination
      'rbc', 'red blood cell', 'wbc', 'white blood cell',
      'epithelial cell', 'squamous', 'transitional',
      'bacteria', 'yeast', 'cast', 'crystal', 'mucus'
    ],
    minimumParameterMatches: 5,
    commonPatterns: [
      /(negative|positive|trace|small|moderate|large|\d+\+)/i,
      /(yellow|amber|straw|clear|cloudy|turbid|hazy)/i,
      /\d+\.?\d*\s*(cells\/hpf|\/hpf|cells\/lpf|\/lpf)/i, // e.g., "5-10 cells/hpf"
      /\d+\.?\d*\s*(mg\/dl|mg\/l)/i,
      /(color|colour|appearance|ph|protein|glucose|blood)\s*[:=]/i,
    ]
  },
  lipid: {
    requiredKeywords: [
      'lipid profile', 'lipid panel', 'lipid test',
      'cholesterol', 'triglyceride', 'hdl', 'ldl'
    ],
    expectedParameters: [
      // Core lipid parameters
      'total cholesterol', 'cholesterol total', 'cholesterol',
      'hdl', 'hdl cholesterol', 'high density lipoprotein',
      'ldl', 'ldl cholesterol', 'low density lipoprotein',
      'triglyceride', 'tg',
      // Additional metrics
      'vldl', 'very low density lipoprotein',
      'non-hdl', 'non hdl cholesterol',
      'tc/hdl ratio', 'chol/hdl ratio', 'cholesterol/hdl',
      'ldl/hdl ratio', 'risk ratio'
    ],
    minimumParameterMatches: 3,
    commonPatterns: [
      /\d+\.?\d*\s*(mg\/dl|mg\/l|mmol\/l)/i, // e.g., "180 mg/dL"
      /(total cholesterol|cholesterol|hdl|ldl|triglyceride|tg)\s*[:=]\s*\d+/i,
      /ratio\s*[:=]\s*\d+\.?\d*/i, // Cholesterol ratios
    ]
  }
};

/**
 * General medical document indicators
 */
const MEDICAL_DOCUMENT_INDICATORS = [
  'laboratory', 'lab report', 'medical', 'hospital', 'clinic',
  'patient', 'specimen', 'reference range', 'normal range',
  'result', 'test', 'analysis', 'examination'
];

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reasons: string[];
  matchedKeywords: string[];
  matchedParameters: string[];
}

/**
 * Validates OCR text against lab type rules
 */
export function validateLabType(ocrText: string, labType: LabType): ValidationResult {
  const normalizedText = ocrText.toLowerCase();
  const rules = LAB_VALIDATION_RULES[labType];
  
  const matchedKeywords: string[] = [];
  const matchedParameters: string[] = [];
  const reasons: string[] = [];
  
  // Check for general medical document indicators
  const hasMedicalIndicators = MEDICAL_DOCUMENT_INDICATORS.some(indicator => 
    normalizedText.includes(indicator.toLowerCase())
  );
  
  if (!hasMedicalIndicators) {
    reasons.push('Document does not appear to be a medical lab report');
  }
  
  // Check required keywords (need at least 2 for high confidence)
  let requiredKeywordsFound = 0;
  for (const keyword of rules.requiredKeywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      requiredKeywordsFound++;
    }
  }
  
  // Check expected parameters FIRST (needed for lenient validation)
  for (const param of rules.expectedParameters) {
    if (normalizedText.includes(param.toLowerCase())) {
      matchedParameters.push(param);
    }
  }
  
  const hasEnoughParameters = matchedParameters.length >= rules.minimumParameterMatches;
  
  // For urinalysis, if we have enough parameter matches, we can be lenient on keywords
  // This handles cases where OCR doesn't pick up "urinalysis" header but gets the data
  const hasRequiredKeywords = requiredKeywordsFound >= 2 || 
    (labType === 'urinalysis' && hasEnoughParameters);
  
  if (!hasRequiredKeywords) {
    reasons.push(`Missing required ${labType.toUpperCase()} keywords (found ${requiredKeywordsFound}, need minimum 2 or ${rules.minimumParameterMatches}+ parameters)`);
  }
  if (!hasEnoughParameters) {
    reasons.push(`Insufficient ${labType.toUpperCase()} parameters detected (found ${matchedParameters.length}/${rules.minimumParameterMatches} minimum)`);
  }
  
  // Check common patterns
  const patternMatches = rules.commonPatterns.filter(pattern => 
    pattern.test(ocrText)
  ).length;
  
  const hasExpectedPatterns = patternMatches > 0;
  if (!hasExpectedPatterns) {
    reasons.push('Lab result format/units not detected');
  }
  
  // Calculate confidence score
  let confidence = 0;
  if (hasMedicalIndicators) confidence += 0.2;
  if (hasRequiredKeywords) confidence += 0.3;
  if (hasEnoughParameters) confidence += 0.3;
  if (hasExpectedPatterns) confidence += 0.2;
  
  // Boost confidence for urinalysis with strong parameter matches
  if (labType === 'urinalysis' && matchedParameters.length >= rules.minimumParameterMatches + 2) {
    confidence = Math.min(1.0, confidence + 0.1);
  }
  
  // Determine if valid
  const isValid = hasMedicalIndicators && hasRequiredKeywords && hasEnoughParameters;
  
  if (isValid) {
    reasons.push(`Valid ${labType.toUpperCase()} report detected`);
  }
  
  return {
    isValid,
    confidence,
    reasons,
    matchedKeywords,
    matchedParameters
  };
}

/**
 * Validates parsed lab values match the expected lab type
 */
export function validateParsedValues(
  parsedValues: Record<string, any>,
  labType: LabType
): ValidationResult {
  const rules = LAB_VALIDATION_RULES[labType];
  const parsedKeys = Object.keys(parsedValues).map(k => k.toLowerCase());
  
  const matchedParameters: string[] = [];
  const reasons: string[] = [];
  
  // Check if parsed parameters match expected ones
  for (const expectedParam of rules.expectedParameters) {
    const paramWords = expectedParam.toLowerCase().split(' ');
    const hasMatch = parsedKeys.some(key => 
      paramWords.every(word => key.includes(word)) || 
      key.includes(expectedParam.toLowerCase())
    );
    
    if (hasMatch) {
      matchedParameters.push(expectedParam);
    }
  }
  
  const hasEnoughMatches = matchedParameters.length >= rules.minimumParameterMatches;
  
  if (!hasEnoughMatches) {
    reasons.push(
      `Parsed values do not match ${labType.toUpperCase()} format. ` +
      `Expected parameters like: ${rules.expectedParameters.slice(0, 5).join(', ')}`
    );
  } else {
    reasons.push(`Parsed values match ${labType.toUpperCase()} format`);
  }
  
  const confidence = Math.min(matchedParameters.length / rules.minimumParameterMatches, 1.0);
  
  return {
    isValid: hasEnoughMatches,
    confidence,
    reasons,
    matchedKeywords: [],
    matchedParameters
  };
}
