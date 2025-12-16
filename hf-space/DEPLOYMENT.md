
# Deploying LabVio ML API to HuggingFace Spaces

## Prerequisites

1. HuggingFace account (free): https://huggingface.co/join
2. Trained model files in `saved_models/` directory

## Steps to Deploy

### 1. Create a New Space

1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Choose:
   - **Name**: `labvio-ml-api` (or your preferred name)
   - **License**: MIT
   - **SDK**: Docker
   - **Visibility**: Public (or Private)

### 2. Upload Files

Upload these files from the `hf-space` directory to your Space:

**Required Files:**
- `app.py` - Main Flask application
- `requirements.txt` - Python dependencies
- `Dockerfile` - Docker configuration
- `README.md` - Space documentation
- `saved_models/` - Directory containing all .pkl files:
  - `gradient_boosting.pkl`
  - `logistic_regression.pkl`
  - `scaler.pkl`
  - `features.pkl`
  - `model_info.txt`

### 3. Copy Model Files

Before uploading, copy your trained models to the hf-space directory:

```bash
# From your project root
cp -r ml_model/saved_models hf-space/
```

### 4. Deploy

1. Upload all files to your HuggingFace Space
2. The Space will automatically build and deploy
3. Wait for the build to complete (usually 2-5 minutes)
4. Your API will be available at: `https://[your-username]-labvio-ml-api.hf.space`

### 5. Test Your Deployment

```bash
# Health check
curl https://[your-username]-labvio-ml-api.hf.space/health

# Test prediction
curl -X POST https://[your-username]-labvio-ml-api.hf.space/predict \
  -H "Content-Type: application/json" \
  -d '{
    "lab_type": "lipid",
    "cholesterol": 200,
    "hdl": 45,
    "ldl": 130,
    "triglycerides": 150
  }'
```

## Update Your Application

After deployment, update your `.env` file to point to the HuggingFace API:

```
ML_API_URL=https://[your-username]-labvio-ml-api.hf.space
```

## Troubleshooting

- **Build fails**: Check that all model files are uploaded
- **Models not loading**: Verify file paths in `saved_models/`
- **Import errors**: Ensure all dependencies are in `requirements.txt`

## Cost

HuggingFace Spaces offers free hosting for public Spaces with reasonable usage limits.
