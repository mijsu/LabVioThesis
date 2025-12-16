#!/usr/bin/env python3
"""
Flask API for unified health risk predictions
Single model handles CBC, Urinalysis, and Lipid profiles
Includes lab_type as a feature for context-aware predictions
"""

import os
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import pytz

app = Flask(__name__)
CORS(app)

# Global model storage
models = {
    'scaler': None,
    'gradient_boosting': None,
    'logistic_regression': None,
    'features': None
}

# Risk level mapping
RISK_LEVELS = {
    0: 'low',
    1: 'moderate',
    2: 'high'
}

# Lab type mapping
LAB_TYPE_MAP = {
    'cbc': 0,
    'urinalysis': 1,
    'urine': 1,
    'lipid': 2,
    'lipid profile': 2
}

def load_models():
    """Load unified trained models"""
    save_dir = os.path.join(os.path.dirname(__file__), 'saved_models')
    
    try:
        scaler_path = os.path.join(save_dir, 'scaler.pkl')
        gb_path = os.path.join(save_dir, 'gradient_boosting.pkl')
        lr_path = os.path.join(save_dir, 'logistic_regression.pkl')
        features_path = os.path.join(save_dir, 'features.pkl')
        
        if not all(os.path.exists(p) for p in [scaler_path, gb_path, lr_path, features_path]):
            raise FileNotFoundError("Model files not found. Please run train_model.py first.")
        
        models['scaler'] = joblib.load(scaler_path)
        models['gradient_boosting'] = joblib.load(gb_path)
        models['logistic_regression'] = joblib.load(lr_path)
        models['features'] = joblib.load(features_path)
        
        print("✅ Unified model loaded successfully!")
        print(f"   - Scaler: {scaler_path}")
        print(f"   - Gradient Boosting: {gb_path}")
        print(f"   - Features: {len(models['features'])} features\n")
        
        return True
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return False

def parse_value(value, default=0.0):
    """Parse value from string or number"""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            if value.lower() in ['positive', 'trace']:
                return 1.0
            if value.lower() in ['negative']:
                return 0.0
            return default
    return default

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    models_loaded = all(v is not None for v in models.values())
    return jsonify({
        'status': 'healthy' if models_loaded else 'unhealthy',
        'models_loaded': models_loaded
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict health risk from lab values
    Single unified model for all lab types
    
    Expected JSON format:
    {
        "lab_type": "cbc",  # or "urinalysis"/"lipid"
        "wbc": 8.5,
        "glucose": "110",
        ...
    }
    """
    try:
        # Get Philippine time
        ph_tz = pytz.timezone('Asia/Manila')
        ph_time = datetime.now(ph_tz).strftime('%Y-%m-%d %I:%M:%S %p')
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        print("\n" + "=" * 65)
        print(f"🔬 LabVio ML Model Prediction | {ph_time}")
        print("=" * 65)
        print(f"[API] Received data: {list(data.keys())}")
        print(f"[API] Raw data: {data}")
        
        # Get lab type from request
        lab_type = data.get('lab_type', 'cbc').lower().strip()
        print(f"[API] Lab type from request: {lab_type}")
        
        # Normalize and map lab type
        for key, value in LAB_TYPE_MAP.items():
            if key in lab_type:
                lab_type_id = value
                print(f"[API] Mapped '{lab_type}' to lab_type_id: {lab_type_id}")
                break
        else:
            lab_type_id = 0  # Default to CBC
            print(f"[API] Default mapping to lab_type_id: 0 (CBC)")
        
        # Check if models are loaded
        if not all(v is not None for v in models.values()):
            return jsonify({'error': 'Models not loaded'}), 500
        
        # Create feature dictionary with lab-type-specific defaults
        # CBC defaults: normal values
        cbc_defaults = {'wbc': 7.5, 'rbc': 4.7, 'hemoglobin': 14.0, 'platelets': 250}
        
        # Lipid defaults: normal values
        lipid_defaults = {'cholesterol': 180, 'hdl': 55, 'ldl': 100, 'triglycerides': 140, 'vldl': 28}
        
        # Urinalysis defaults: normal values
        # Using realistic clinical ranges: blood/leukocyte_esterase are cells/HPF (0-50+ scale)
        urine_defaults = {'ph': 6.5, 'specific_gravity': 1.015, 'protein': 0.0, 'ketones': 0.0, 'blood': 0.0, 'nitrites': 0.0, 'leukocyte_esterase': 0.0}
        
        # Common defaults
        common_defaults = {'glucose': 95, 'a1c': 5.4}
        
        # Build feature dict with appropriate defaults based on lab type
        features_dict = {'lab_type': lab_type_id}
        
        # Add CBC features
        for key in cbc_defaults.keys():
            features_dict[key] = parse_value(data.get(key), cbc_defaults[key])
        
        # Add Lipid features
        for key in lipid_defaults.keys():
            features_dict[key] = parse_value(data.get(key), lipid_defaults[key])
        
        # Add Glucose/A1C
        features_dict['glucose'] = parse_value(data.get('glucose'), common_defaults['glucose'])
        features_dict['a1c'] = parse_value(data.get('a1c'), common_defaults['a1c'])
        
        # Add Urinalysis features
        for key in urine_defaults.keys():
            features_dict[key] = parse_value(data.get(key), urine_defaults[key])
        
        # Create DataFrame with correct feature order
        X = pd.DataFrame([features_dict], columns=models['features'])
        print(f"[API] Feature dict created with lab_type={features_dict['lab_type']}")
        print(f"[API] DataFrame shape: {X.shape}, Columns: {list(X.columns)}")
        print(f"[API] First 5 features: {dict(list(features_dict.items())[:5])}")
        
        # Scale features
        X_scaled = models['scaler'].transform(X)
        
        # Predict using Gradient Boosting
        risk_class = models['gradient_boosting'].predict(X_scaled)[0]
        risk_probabilities = models['gradient_boosting'].predict_proba(X_scaled)[0]
        
        print(f"[API] Risk class: {risk_class}, Probabilities: {risk_probabilities}")
        
        # Get risk level and confidence
        risk_level = RISK_LEVELS[risk_class]
        confidence = int(risk_probabilities[risk_class] * 100)
        
        # Calculate risk score (0-100 scale)
        risk_score = int(
            risk_probabilities[0] * 15 +
            risk_probabilities[1] * 50 +
            risk_probabilities[2] * 85
        )
        
        result = {
            'riskLevel': risk_level,
            'riskScore': risk_score,
            'confidence': confidence,
            'model': 'gradient_boosting_unified',
            'probabilities': {
                'low': float(risk_probabilities[0]),
                'moderate': float(risk_probabilities[1]),
                'high': float(risk_probabilities[2])
            }
        }
        print(f"[API] Response: {result}")
        print("=" * 65 + "\n")
        return jsonify(result)
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[API ERROR] Prediction error: {e}")
        print(f"[API ERROR] Full traceback:\n{error_details}")
        print("=" * 65 + "\n")
        return jsonify({'error': str(e), 'details': error_details}), 500

if __name__ == '__main__':
    print("\n🚀 Starting LabVio Unified ML Prediction API...\n")
    print("=" * 60)
    
    # Load models on startup
    if load_models():
        print("=" * 60)
        print("🌐 Starting Flask server on http://localhost:5001")
        print("   Endpoints:")
        print("   - GET  /health    (Health check)")
        print("   - POST /predict   (Unified prediction for all lab types)\n")
        
        app.run(host='localhost', port=5001, debug=False)
    else:
        print("❌ Failed to load models. Please run train_model.py first.")
        exit(1)
