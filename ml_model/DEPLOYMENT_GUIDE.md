
# Deploying Updated ML Model to HuggingFace Spaces

## Files to Upload to Your HuggingFace Space

After retraining the model locally, upload these files to `mijsu-labvio-ml-api` HuggingFace Space:

### 1. Model Files (from `saved_models/`)
- `gradient_boosting.pkl`
- `logistic_regression.pkl`
- `scaler.pkl`
- `features.pkl`
- `model_info.txt`

### 2. Application Files
- `predict_api.py`
- `requirements.txt`
- `train_model.py` (for reference)

## HuggingFace Space Setup

1. Go to https://huggingface.co/spaces/mijsu/labvio-ml-api
2. Click "Files" → "Upload files"
3. Upload all files listed above
4. The Space will automatically rebuild and deploy

## Verify Deployment

Test the deployed API:

```bash
curl -X POST https://mijsu-labvio-ml-api.hf.space/predict \
  -H "Content-Type: application/json" \
  -d '{
    "labType": "urinalysis",
    "ph": 5.0,
    "specificGravity": 1.015,
    "protein": 0.15,
    "ketones": 0.0,
    "blood": 13.5,
    "nitrites": 0.0,
    "leukocyteEsterase": 11.0
  }'
```

Expected: MODERATE risk for the UTI example with pus cells 10-12/HPF.

## Model Changes Summary

- **Pus cells (Leukocyte Esterase)**: Now uses real cells/HPF scale (0-50+)
  - Normal: 0-5/HPF
  - Moderate: 6-15/HPF
  - High: 15+/HPF

- **Red cells (Blood)**: Now uses real cells/HPF scale (0-50+)
  - Normal: 0-3/HPF
  - Moderate: 4-15/HPF
  - High: 15+/HPF

These changes ensure the model correctly interprets actual lab report values.
