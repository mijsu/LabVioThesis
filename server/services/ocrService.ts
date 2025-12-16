// OCR Service using Tesseract.js to extract text from lab result images
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OCRResult {
  text: string;
  confidence: number;
  parsedValues: Record<string, string | number>;
}

export async function extractTextFromImage(imageBuffer: Buffer, labType?: string): Promise<OCRResult> {
  try {
    // Validate image buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Invalid or empty image file');
    }

    // Check file size (max 10MB)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      throw new Error('Image file too large (max 10MB)');
    }

    // Check for minimum file size (corrupted/truncated files)
    if (imageBuffer.length < 100) {
      throw new Error('Image file appears to be corrupted or truncated');
    }

    console.log(`Processing image: ${imageBuffer.length} bytes`);

    // Run OCR with timeout protection
    // Increased timeout for complex images like urinalysis (40s)
    const { data } = await Promise.race([
      Tesseract.recognize(imageBuffer, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OCR processing timeout (40s)')), 40000)
      )
    ]);

    // Extract text and confidence
    const text = data.text;
    const confidence = data.confidence;

    console.log(`OCR completed: ${text.length} characters, ${confidence}% confidence`);

    // Parse common lab values from text using OpenAI
    const parsedValues = await parseLabValues(text, labType);

    return {
      text,
      confidence,
      parsedValues,
    };
  } catch (error: any) {
    console.error('OCR extraction error:', error);
    
    // Return more specific error messages
    if (error.message?.includes('truncated') || error.message?.includes('corrupted')) {
      throw new Error('Image file is corrupted or incomplete. Please upload a valid image.');
    }
    if (error.message?.includes('timeout')) {
      throw new Error('OCR processing took too long. Please try a smaller or clearer image.');
    }
    if (error.message?.includes('format')) {
      throw new Error('Invalid image format. Please upload a PNG, JPG, or JPEG file.');
    }
    
    throw new Error(`Failed to extract text from image: ${error.message || 'Unknown error'}`);
  }
}

async function parseLabValues(text: string, labType?: string): Promise<Record<string, string | number>> {
  try {
    // Define parameters based on lab type
    let parametersGuide = '';
    
    switch (labType?.toLowerCase()) {
      case 'urinalysis':
        parametersGuide = `
Urinalysis parameters (use these exact keys if found):
- ph (pH level, REACTION)
- specific_gravity (Specific Gravity, SP. GR, SP GR)
- protein (Protein level)
- glucose (Glucose, SUGAR in urine)
- ketones (Ketone bodies)
- blood (Blood/Hemoglobin)
- bilirubin (Bilirubin)
- urobilinogen (Urobilinogen)
- nitrites (Nitrites)
- leukocyte_esterase (Leukocyte Esterase, PUS CELLS as numeric value)
- wbc_urine (White Blood Cells in urine, WBC)
- rbc_urine (Red Blood Cells in urine, RBC, RED CELLS as numeric value)
- bacteria (Bacteria presence)
- crystals (Crystals)
- epithelial_cells (Epithelial cells)
- mucus_threads (Mucus threads)
- amorphous_urates (Amorphous urates/phosphates, AMORPH.URATES/PO4)
- color (Urine color as string - YELLOW, AMBER, etc)
- clarity (Clarity/Appearance as string - CLEAR, HAZY, CLOUDY, TRANSPARENCY)

CRITICAL for microscopic findings:
- If you see "PUS CELLS" with a range like "6-10 /HPF" or "6-10", extract the UPPER number (10) as leukocyte_esterase
- If you see "RED CELLS" with a range like "0-1 /HPF" or "12-15", extract the UPPER number as rbc_urine
- If PROTEIN shows "TRACE", use 0.15 as the numeric value
- If PROTEIN shows "+" or "1+", use 1 as the numeric value
- Convert /HPF values to numbers only`;
        break;
        
      case 'lipid':
        parametersGuide = `
Lipid panel parameters (use these exact keys if found):
- cholesterol (Total Cholesterol)
- hdl (HDL Cholesterol - "good" cholesterol)
- ldl (LDL Cholesterol - "bad" cholesterol)
- triglycerides (Triglycerides)
- vldl (VLDL Cholesterol)
- chol_hdl_ratio (Cholesterol/HDL Ratio)`;
        break;
        
      case 'glucose':
        parametersGuide = `
Glucose test parameters (use these exact keys if found):
- glucose (Blood Glucose/Sugar)
- a1c (HbA1c - Hemoglobin A1c)
- fasting_glucose (Fasting Blood Glucose)
- random_glucose (Random Blood Glucose)`;
        break;
        
      case 'cbc':
      default:
        parametersGuide = `
CBC (Complete Blood Count) parameters (use these exact keys if found):
- wbc (White Blood Cell count, WBC COUNT)
- rbc (Red Blood Cell count, RBC COUNT)
- hemoglobin (Hemoglobin, Hgb)
- hematocrit (Hematocrit, Hct)
- platelets (Platelet count, PLT, can also be "Adequate")
- mcv (Mean Corpuscular Volume)
- mch (Mean Corpuscular Hemoglobin)
- mchc (Mean Corpuscular Hemoglobin Concentration)
- neutrophils (Neutrophil count/percentage, SEGMENTERS, SEGS)
- stab_cells (Stab cells, Band cells, immature neutrophils)
- lymphocytes (Lymphocyte count or percentage, LYMPHS)
- monocytes (Monocyte count or percentage, MONOS)
- eosinophils (Eosinophil count or percentage, EOSIN)
- basophils (Basophil count or percentage, BASO)

CRITICAL for differential counts:
- If you see percentages like "0.67" or "67%", convert to decimal form (0.67)
- If PLATELETS shows "Adequate", use 250 as numeric value (mid-range normal)
- Convert all percentage values to decimal (e.g., 67% = 0.67)`;
        break;
    }
    
    // Use OpenAI to intelligently extract lab values from any format
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a medical lab report parser. Extract lab values from the provided text and return ONLY a JSON object.

${parametersGuide}

Important rules:
- Return numeric values only (no units) except for color and clarity which should be strings
- If a value is not found, omit that key
- Be flexible with value names - match variations like "WBC", "White Blood Cells", "Leukocytes" to the same key
- Extract actual numerical values, not reference ranges
- If you see ranges like "5.0-10.0", extract the patient's actual value, not the range

Example for CBC: {"wbc": 7.5, "hemoglobin": 12.5, "platelets": 250}
Example for Urinalysis: {"ph": 6.5, "protein": 0, "glucose": 0, "wbc_urine": 2, "color": "yellow", "clarity": "clear"}

Return ONLY the JSON object, no other text.`
        },
        {
          role: 'user',
          content: `Extract lab values from this ${labType || 'lab'} report text:\n\n${text}`
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '{}';
    console.log('OpenAI lab parsing response:', responseText);
    
    // Parse the JSON response
    const parsedValues = JSON.parse(responseText);
    console.log('Parsed lab values:', parsedValues);
    
    return parsedValues;
  } catch (error) {
    console.error('Error parsing lab values with OpenAI:', error);
    // Fallback to empty object if OpenAI fails
    return {};
  }
}
