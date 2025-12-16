
#!/bin/bash

echo "🚀 Preparing HuggingFace Space deployment..."

# Create saved_models directory if it doesn't exist
mkdir -p saved_models

# Copy model files from ml_model
echo "📦 Copying model files..."
cp ../ml_model/saved_models/*.pkl saved_models/
cp ../ml_model/saved_models/model_info.txt saved_models/

echo "✅ Files copied successfully!"
echo ""
echo "📋 Files ready for HuggingFace deployment:"
ls -lh saved_models/
echo ""
echo "📝 Next steps:"
echo "1. Go to https://huggingface.co/spaces"
echo "2. Create a new Space with Docker SDK"
echo "3. Upload all files from the hf-space directory"
echo "4. Wait for build to complete"
echo "5. Update ML_API_URL in your .env file"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
