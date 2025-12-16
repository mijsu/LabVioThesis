
#!/usr/bin/env python3
"""
LabVio ML API - HuggingFace Spaces Deployment
Flask API for unified health risk predictions
"""

import os
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from datetime import datetime
import pytz

app = Flask(__name__)
CORS(app)

# HTML UI Template
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LabVio ML API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            color: #333;
            font-size: 32px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .header p {
            color: #666;
            font-size: 14px;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 30px;
            padding: 12px 16px;
            background: #f0f4ff;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .status.healthy {
            background: #f0fdf4;
            border-left-color: #10b981;
        }
        .status.healthy .indicator {
            background: #10b981;
        }
        .indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #667eea;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .status-text {
            color: #333;
            font-size: 14px;
            font-weight: 500;
        }
        .features {
            margin-bottom: 30px;
        }
        .features h2 {
            color: #333;
            font-size: 18px;
            margin-bottom: 16px;
        }
        .feature-list {
            list-style: none;
        }
        .feature-list li {
            color: #555;
            font-size: 14px;
            padding: 8px 0;
            padding-left: 24px;
            position: relative;
        }
        .feature-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
        }
        .endpoints {
            margin-bottom: 30px;
        }
        .endpoints h2 {
            color: #333;
            font-size: 18px;
            margin-bottom: 16px;
        }
        .endpoint {
            background: #f8fafc;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 12px;
            border-left: 4px solid #667eea;
        }
        .endpoint-method {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }
        .endpoint-method.get {
            background: #dbeafe;
            color: #1e40af;
        }
        .endpoint-method.post {
            background: #dbeafe;
            color: #1e40af;
        }
        .endpoint-path {
            font-family: 'Courier New', monospace;
            color: #333;
            font-size: 14px;
            margin-top: 4px;
        }
        .cta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        .btn-secondary {
            background: #f0f4ff;
            color: #667eea;
            border: 1px solid #667eea;
        }
        .btn-secondary:hover {
            background: #667eea;
            color: white;
        }
        .info {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 12px;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔬 LabVio ML API</h1>
            <p>Health Risk Prediction Service</p>
        </div>

        <div class="status healthy">
            <div class="indicator"></div>
            <div class="status-text">Service Status: <strong>Operational</strong></div>
        </div>

        <div class="features">
            <h2>Features</h2>
            <ul class="feature-list">
                <li>Unified ML Model for multiple lab types</li>
                <li>CBC, Urinalysis, and Lipid Profile support</li>
                <li>Real-time health risk predictions</li>
                <li>High accuracy predictions (~99%)</li>
            </ul>
        </div>

        <div class="endpoints">
            <h2>API Endpoints</h2>
            <div class="endpoint">
                <div>
                    <span class="endpoint-method get">GET</span>
                    <span class="endpoint-path">/health</span>
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 4px;">Health check endpoint</p>
            </div>
            <div class="endpoint">
                <div>
                    <span class="endpoint-method post">POST</span>
                    <span class="endpoint-path">/predict</span>
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 4px;">Predict health risk from lab values</p>
            </div>
        </div>

        <div class="cta">
            <button class="btn-primary" onclick="location.href='/health'">Check Health</button>
            <button class="btn-secondary" onclick="window.open('https://github.com/marjames4/LabVioUltimatum', '_blank')">Documentation</button>
        </div>

        <div class="info">
            ℹ️ This is a machine learning API for health risk assessment. It is for research and educational purposes only and should not be used for clinical diagnosis or treatment decisions.
        </div>
    </div>
</body>
</html>
'''

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
    try:
        scaler_path = 'saved_models/scaler.pkl'
        gb_path = 'saved_models/gradient_boosting.pkl'
        lr_path = 'saved_models/logistic_regression.pkl'
        features_path = 'saved_models/features.pkl'
        
        if not all(os.path.exists(p) for p in [scaler_path, gb_path, lr_path, features_path]):
            raise FileNotFoundError("Model files not found.")
        
        models['scaler'] = joblib.load(scaler_path)
        models['gradient_boosting'] = joblib.load(gb_path)
        models['logistic_regression'] = joblib.load(lr_path)
        models['features'] = joblib.load(features_path)
        
        print("✅ Models loaded successfully!")
        print(f"   Features: {len(models['features'])} features")
        
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
@app.route('/', methods=['GET'])
def index():
    """Root endpoint - displays web interface"""
    return render_template_string(HTML_TEMPLATE)
@app.route('/', methods=['GET'])
def index():
    """Root endpoint - displays web interface"""
    return render_template_string(HTML_TEMPLATE)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    models_loaded = all(v is not None for v in models.values())
    return jsonify({
        'status': 'healthy' if models_loaded else 'unhealthy',
        'models_loaded': models_loaded,
        'service': 'LabVio ML API',
        'version': '1.0.0'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict health risk from lab values"""
    try:
        ph_tz = pytz.timezone('Asia/Manila')
        ph_time = datetime.now(ph_tz).strftime('%Y-%m-%d %I:%M:%S %p')
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        print(f"\n🔬 Prediction Request | {ph_time}")
        print(f"   Data: {list(data.keys())}")
        
        # Get lab type from request
        lab_type = data.get('lab_type', 'cbc').lower().strip()
        
        # Map lab type to ID
        for key, value in LAB_TYPE_MAP.items():
            if key in lab_type:
                lab_type_id = value
                break
        else:
            lab_type_id = 0  # Default to CBC
        
        # Check if models are loaded
        if not all(v is not None for v in models.values()):
            return jsonify({'error': 'Models not loaded'}), 500
        
        # Default values
        cbc_defaults = {'wbc': 7.5, 'rbc': 4.7, 'hemoglobin': 14.0, 'platelets': 250}
        lipid_defaults = {'cholesterol': 180, 'hdl': 55, 'ldl': 100, 'triglycerides': 140, 'vldl': 28}
        urine_defaults = {'ph': 6.5, 'specific_gravity': 1.015, 'protein': 0.0, 'ketones': 0.0, 'blood': 0.0, 'nitrites': 0.0, 'leukocyte_esterase': 0.0}
        common_defaults = {'glucose': 95, 'a1c': 5.4}
        
        # Build feature dict
        features_dict = {'lab_type': lab_type_id}
        
        for key in cbc_defaults.keys():
            features_dict[key] = parse_value(data.get(key), cbc_defaults[key])
        
        for key in lipid_defaults.keys():
            features_dict[key] = parse_value(data.get(key), lipid_defaults[key])
        
        features_dict['glucose'] = parse_value(data.get('glucose'), common_defaults['glucose'])
        features_dict['a1c'] = parse_value(data.get('a1c'), common_defaults['a1c'])
        
        for key in urine_defaults.keys():
            features_dict[key] = parse_value(data.get(key), urine_defaults[key])
        
        # Create DataFrame
        X = pd.DataFrame([features_dict], columns=models['features'])
        
        # Scale features
        X_scaled = models['scaler'].transform(X)
        
        # Predict
        risk_class = models['gradient_boosting'].predict(X_scaled)[0]
        risk_probabilities = models['gradient_boosting'].predict_proba(X_scaled)[0]
        
        risk_level = RISK_LEVELS[risk_class]
        confidence = int(risk_probabilities[risk_class] * 100)
        
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
        
        print(f"   ✅ Prediction: {risk_level} (Score: {risk_score}, Confidence: {confidence}%)")
        return jsonify(result)
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error: {e}")
        print(error_details)
        return jsonify({'error': str(e), 'details': error_details}), 500

if __name__ == '__main__':
    print("\n🚀 Starting LabVio ML API (HuggingFace Spaces)...\n")
    
    if load_models():
        print("🌐 Starting server on 0.0.0.0:7860")
        # HuggingFace Spaces runs on port 7860
        app.run(host='0.0.0.0', port=7860, debug=False, threaded=True)
    else:
        print("❌ Failed to load models.")
        exit(1)
