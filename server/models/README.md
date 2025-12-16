# MEDiscan ML Models

## Overview
This directory contains the **pre-trained machine learning models** used for health risk analysis in MEDiscan.

## Current Model: Health Risk Predictor

### Technology Stack
- **Framework**: TensorFlow.js (Node.js)
- **Architecture**: Neural Network (Feed-forward)
- **Input**: 12 normalized lab values
- **Output**: Risk level (low/moderate/high) + confidence score

### Model Architecture

```
Input Layer (12 features):
  - WBC, RBC, Hemoglobin, Platelets
  - Cholesterol, HDL, LDL, Triglycerides
  - Glucose, A1C, pH, Protein

Hidden Layers:
  Layer 1: 32 neurons (ReLU activation) + Dropout (20%)
  Layer 2: 16 neurons (ReLU activation) + Dropout (20%)

Output Layer (3 classes):
  - Low Risk
  - Moderate Risk
  - High Risk
  (Softmax activation)
```

### How It Works

1. **Input Normalization**: Lab values are normalized to 0-1 range
2. **Prediction**: Neural network predicts risk distribution
3. **Classification**: Highest probability determines risk level
4. **Risk Score**: Calculated as weighted average (0-100 scale)

### Training Data

The model is **pre-trained** using synthetically generated health data that follows medical guidelines:

- **Normal ranges**: Based on clinical standards
- **Risk patterns**: Derived from medical research
- **1000 samples**: Balanced across risk levels

**Note**: For production use, this model should be retrained on real, de-identified medical datasets.

### Usage in Code

```typescript
import { getHealthRiskModel } from './models/healthRiskModel';

// Get model instance (singleton)
const model = await getHealthRiskModel();

// Predict risk from lab values
const prediction = await model.predict({
  wbc: 8.5,
  glucose: 110,
  cholesterol: 220,
  hdl: 45,
  ldl: 140,
  // ... other values
});

// Returns:
// {
//   riskLevel: 'moderate',
//   riskScore: 55,
//   confidence: 72
// }
```

### Model Files

After first run, the model is saved to:
```
server/models/saved-model/
├── model.json           # Model architecture & metadata
└── group1-shard1of1.bin # Model weights
```

### Replacing with a Custom Model

To use your own trained model:

1. **Train in Python** (XGBoost, scikit-learn, TensorFlow):
   ```python
   import tensorflowjs as tfjs
   
   # Train your model
   model = create_your_model()
   model.fit(X_train, y_train)
   
   # Export to TensorFlow.js format
   tfjs.converters.save_keras_model(model, 'tfjs_model')
   ```

2. **Copy to project**:
   ```
   cp -r tfjs_model/* server/models/saved-model/
   ```

3. **Restart server** - The model will be loaded automatically

### Performance

- **Initialization**: ~2-3 seconds (first load)
- **Prediction**: ~5-10ms per request
- **Memory**: ~50MB (model + TensorFlow runtime)

### Future Improvements

1. **Use Real Medical Data**: Train on de-identified EHR datasets
2. **Ensemble Models**: Combine multiple model types (XGBoost + Neural Network)
3. **ONNX Format**: For faster inference and compatibility
4. **Continuous Learning**: Update model with new anonymized patient data
5. **Explainability**: Add SHAP values to explain predictions

## Medical Disclaimer

⚠️ **This model is for educational and research purposes only.**
- Not approved for clinical use
- Should not replace professional medical advice
- Requires validation by medical professionals before deployment
