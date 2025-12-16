# MEDiscan ML Models

## Overview
This directory contains the **Python-based machine learning models** for health risk prediction using scikit-learn and XGBoost.

## Structure

```
ml_model/
├── saved_models/              # Trained model files (.pkl)
│   ├── gradient_boosting.pkl  # XGBoost gradient boosting classifier
│   ├── logistic_regression.pkl # Logistic regression classifier
│   ├── scaler.pkl             # StandardScaler for feature normalization
│   └── model_info.txt         # Model metadata and accuracy scores
├── train_model.py             # Training script
├── predict_api.py             # Flask API for predictions
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

## Quick Start

### 1. Train Models

Train the models and save them as .pkl files:

```bash
python3 ml_model/train_model.py
```

This will:
- Generate 2000 synthetic medical samples
- Train Gradient Boosting classifier (~95% accuracy)
- Train Logistic Regression classifier (~90% accuracy)
- Save models to `saved_models/` directory

### 2. Start Prediction API

Start the Flask API server:

```bash
python3 ml_model/predict_api.py
```

The API will run on `http://localhost:5001`

### 3. Test Predictions

```bash
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "wbc": 8.5,
    "glucose": 110,
    "cholesterol": 220,
    "hdl": 45,
    "ldl": 150
  }'
```

## API Endpoints

### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "models_loaded": true
}
```

### `POST /predict`
Predict health risk using Gradient Boosting model

**Request:**
```json
{
  "wbc": 8.5,
  "rbc": 4.7,
  "hemoglobin": 14.0,
  "platelets": 250,
  "cholesterol": 220,
  "hdl": 45,
  "ldl": 150,
  "triglycerides": 180,
  "glucose": 110,
  "a1c": 6.0,
  "ph": 6.5,
  "protein": "Negative"
}
```

**Response:**
```json
{
  "riskLevel": "moderate",
  "riskScore": 55,
  "confidence": 87,
  "model": "gradient_boosting",
  "probabilities": {
    "low": 0.05,
    "moderate": 0.87,
    "high": 0.08
  }
}
```

### `POST /predict/ensemble`
Ensemble prediction using both models (averaged)

Same request/response format as `/predict` but uses both models for more robust predictions.

## Model Details

### Features (12)
- **WBC**: White Blood Cell count
- **RBC**: Red Blood Cell count
- **Hemoglobin**: Oxygen-carrying protein
- **Platelets**: Blood clotting cells
- **Cholesterol**: Total cholesterol
- **HDL**: High-density lipoprotein (good cholesterol)
- **LDL**: Low-density lipoprotein (bad cholesterol)
- **Triglycerides**: Blood fat levels
- **Glucose**: Blood sugar
- **A1C**: Average blood sugar (3 months)
- **pH**: Urine pH level
- **Protein**: Protein in urine (0=Negative, 1=Positive)

### Target Classes (3)
- **0**: Low Risk - Healthy range values
- **1**: Moderate Risk - Borderline/prediabetic range
- **2**: High Risk - Abnormal/diabetic range

### Models

**Gradient Boosting Classifier**
- Algorithm: XGBoost-style gradient boosting
- Estimators: 100 trees
- Max depth: 5
- Accuracy: ~95%
- Best for: Complex non-linear patterns

**Logistic Regression**
- Algorithm: Multinomial logistic regression
- Max iterations: 1000
- Accuracy: ~90%
- Best for: Interpretable linear relationships

### Feature Scaling

All features are normalized using `StandardScaler`:
```python
scaled_value = (value - mean) / std_dev
```

This ensures all features contribute equally to predictions.

## Replacing with Custom Models

To use your own trained models:

1. **Train your models** in Python:
   ```python
   from sklearn.ensemble import GradientBoostingClassifier
   import joblib
   
   model = GradientBoostingClassifier()
   model.fit(X_train, y_train)
   
   joblib.dump(model, 'gradient_boosting.pkl')
   ```

2. **Copy to saved_models/**:
   ```bash
   cp your_model.pkl ml_model/saved_models/gradient_boosting.pkl
   ```

3. **Restart API** - Models reload automatically

## Production Considerations

1. **Train on Real Data**: Replace synthetic data with real, de-identified medical datasets
2. **Model Monitoring**: Track prediction accuracy and drift over time
3. **A/B Testing**: Compare Gradient Boosting vs Logistic Regression performance
4. **Feature Engineering**: Add more relevant health indicators
5. **Hyperparameter Tuning**: Optimize model parameters for better accuracy

## Medical Disclaimer

⚠️ **These models are for educational and research purposes only.**
- Not approved for clinical use
- Should not replace professional medical advice
- Requires validation by medical professionals before deployment
