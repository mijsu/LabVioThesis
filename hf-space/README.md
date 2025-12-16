
---
title: LabVio ML API
emoji: 🔬
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# LabVio ML API

Health risk prediction API using machine learning models trained on medical lab data.

## Features

- **Unified Model**: Single model handles CBC, Urinalysis, and Lipid profiles
- **High Accuracy**: Trained on 10,000 synthetic medical samples
- **Fast Inference**: Gradient Boosting Classifier with ~99% accuracy
- **Lab Types**: Supports CBC, Urinalysis (Urine), and Lipid Profile tests

## API Endpoints

### Health Check
```bash
GET /health
```

### Predict Risk
```bash
POST /predict
Content-Type: application/json

{
  "lab_type": "lipid",
  "cholesterol": 200,
  "hdl": 45,
  "ldl": 130,
  "triglycerides": 150
}
```

**Response:**
```json
{
  "riskLevel": "moderate",
  "riskScore": 50,
  "confidence": 85,
  "model": "gradient_boosting_unified",
  "probabilities": {
    "low": 0.05,
    "moderate": 0.85,
    "high": 0.10
  }
}
```

## Supported Lab Parameters

### CBC (Complete Blood Count)
- WBC, RBC, Hemoglobin, Platelets

### Lipid Profile
- Cholesterol, HDL, LDL, Triglycerides, VLDL

### Urinalysis
- pH, Specific Gravity, Protein, Ketones, Blood, Nitrites, Leukocyte Esterase

### Common
- Glucose, A1C

## Model Information

- **Training Samples**: 10,000 (distributed across CBC, Urinalysis, Lipid)
- **Algorithm**: Gradient Boosting Classifier
- **Accuracy**: ~99% on test data
- **Features**: 19 features including lab_type identifier
- **Classes**: 3 (Low, Moderate, High risk)

## Deployment

This API is deployed on HuggingFace Spaces using Docker.

## License

MIT License - Educational and research purposes only. Not for clinical use.
