#!/usr/bin/env python3
"""
Train unified health risk prediction model using scikit-learn
Single model handles CBC, Urinalysis, and Lipid profiles (10,000 samples)
Includes lab_type as a feature for differentiation
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import datetime

# Set random seed for reproducibility
np.random.seed(42)

def generate_unified_data(n_samples=10000):
    """
    Generate unified synthetic data for all lab types (10,000 samples total)
    Features: lab_type + all parameters from CBC, Urinalysis, Lipid profiles
    """
    data = []

    # Distribute samples evenly across lab types
    samples_per_type = n_samples // 3

    lab_types = ['cbc', 'urinalysis', 'lipid']

    for lab_type_idx, lab_type in enumerate(lab_types):
        for _ in range(samples_per_type):
            risk = np.random.choice([0, 1, 2], p=[0.5, 0.3, 0.2])

            # Initialize all features with defaults
            features = {
                'lab_type': lab_type_idx,  # 0=cbc, 1=urinalysis, 2=lipid
                'wbc': 7.5,
                'rbc': 4.7,
                'hemoglobin': 14.0,
                'platelets': 250,
                'cholesterol': 180,
                'hdl': 55,
                'ldl': 100,
                'triglycerides': 140,
                'vldl': 28,
                'glucose': 95,
                'a1c': 5.4,
                'ph': 6.0,
                'specific_gravity': 1.015,
                'protein': 0.0,
                'ketones': 0.0,
                'blood': 0.0,
                'nitrites': 0.0,
                'leukocyte_esterase': 0.0,
            }

            # Generate CBC-specific data
            if lab_type == 'cbc':
                if risk == 2:  # High risk
                    features['wbc'] = np.random.uniform(3.5, 20.0)
                    features['rbc'] = np.random.uniform(2.5, 4.0)
                    features['hemoglobin'] = np.random.uniform(8.0, 11.0)
                    features['platelets'] = np.random.uniform(50, 150)
                    features['glucose'] = np.random.uniform(126, 250)
                    features['a1c'] = np.random.uniform(6.5, 12.0)
                    # Differential counts (as decimals)
                    features['neutrophils'] = np.random.uniform(0.30, 0.85)
                    features['lymphocytes'] = np.random.uniform(0.10, 0.50)
                    features['monocytes'] = np.random.uniform(0.00, 0.15)
                    features['eosinophils'] = np.random.uniform(0.00, 0.10)
                    features['basophils'] = np.random.uniform(0.00, 0.03)
                elif risk == 1:  # Moderate
                    features['wbc'] = np.random.uniform(4.0, 12.0)
                    features['rbc'] = np.random.uniform(4.0, 5.0)
                    features['hemoglobin'] = np.random.uniform(11.5, 13.0)
                    features['platelets'] = np.random.uniform(200, 350)
                    features['glucose'] = np.random.uniform(100, 125)
                    features['a1c'] = np.random.uniform(5.7, 6.4)
                    # Differential counts (as decimals)
                    features['neutrophils'] = np.random.uniform(0.50, 0.75)
                    features['lymphocytes'] = np.random.uniform(0.15, 0.45)
                    features['monocytes'] = np.random.uniform(0.00, 0.10)
                    features['eosinophils'] = np.random.uniform(0.00, 0.06)
                    features['basophils'] = np.random.uniform(0.00, 0.02)
                else:  # Low
                    features['wbc'] = np.random.uniform(4.5, 11.0)
                    features['rbc'] = np.random.uniform(4.5, 5.5)
                    features['hemoglobin'] = np.random.uniform(13.5, 17.5)
                    features['platelets'] = np.random.uniform(150, 400)
                    features['glucose'] = np.random.uniform(70, 99)
                    features['a1c'] = np.random.uniform(4.0, 5.6)
                    # Normal differential counts (as decimals)
                    features['neutrophils'] = np.random.uniform(0.54, 0.70)
                    features['lymphocytes'] = np.random.uniform(0.20, 0.40)
                    features['monocytes'] = np.random.uniform(0.02, 0.08)
                    features['eosinophils'] = np.random.uniform(0.00, 0.05)
                    features['basophils'] = np.random.uniform(0.00, 0.01)

            # Generate Urinalysis-specific data
            # Clinical decision: High pus cells (>15 WBC/HPF) or high blood (>15 RBC/HPF)
            # with positive nitrites = HIGH risk (clear UTI/kidney issues)
            # The KEY indicators are: blood, leukocyte_esterase (pus cells), nitrites
            elif lab_type == 'urinalysis':
                if risk == 2:  # High risk - clear UTI/kidney issues
                    # KEY: Very high pus cells OR blood cells with infection markers
                    features['ph'] = np.random.uniform(4.5, 8.0)  # Can be normal or abnormal
                    features['specific_gravity'] = np.random.uniform(1.010, 1.035)
                    features['protein'] = np.random.uniform(0.3, 4.0)  # Trace to 3+
                    features['glucose'] = np.random.uniform(0, 200)  # Variable
                    features['ketones'] = np.random.uniform(0.0, 2.0)
                    # Critical: High cell counts indicate serious infection
                    features['blood'] = np.random.uniform(15, 100)  # RBC/HPF - HIGH (>15)
                    features['nitrites'] = np.random.uniform(0.5, 2.0)  # Often positive
                    features['leukocyte_esterase'] = np.random.uniform(15, 100)  # WBC/HPF - HIGH (>15)
                elif risk == 1:  # Moderate - possible infection, needs monitoring
                    features['ph'] = np.random.uniform(5.0, 7.5)
                    features['specific_gravity'] = np.random.uniform(1.010, 1.030)
                    features['protein'] = np.random.uniform(0.1, 1.0)  # Trace to 1+
                    features['glucose'] = np.random.uniform(0, 100)
                    features['ketones'] = np.random.uniform(0.0, 1.0)
                    # Moderate elevation - borderline concerning
                    features['blood'] = np.random.uniform(4, 15)  # RBC/HPF - borderline (4-15)
                    features['nitrites'] = np.random.uniform(0.0, 0.5)  # Negative to trace
                    features['leukocyte_esterase'] = np.random.uniform(6, 15)  # WBC/HPF - borderline (6-15)
                else:  # Low - normal urinalysis
                    features['ph'] = np.random.uniform(4.5, 8.0)
                    features['specific_gravity'] = np.random.uniform(1.005, 1.025)
                    features['protein'] = np.random.uniform(0.0, 0.1)  # Negative
                    features['glucose'] = np.random.uniform(0.0, 10.0)
                    features['ketones'] = np.random.uniform(0.0, 0.2)
                    features['blood'] = np.random.uniform(0, 3)  # RBC/HPF - normal (0-3)
                    features['nitrites'] = np.random.uniform(0.0, 0.1)  # Negative
                    features['leukocyte_esterase'] = np.random.uniform(0, 5)  # WBC/HPF - normal (0-5)

            # Generate Lipid-specific data
            else:  # lipid
                if risk == 2:  # High risk
                    features['cholesterol'] = np.random.uniform(240, 320)
                    features['hdl'] = np.random.uniform(20, 40)
                    features['ldl'] = np.random.uniform(160, 220)
                    features['triglycerides'] = np.random.uniform(200, 400)
                    features['vldl'] = np.random.uniform(40, 80)
                    features['glucose'] = np.random.uniform(126, 250)
                elif risk == 1:  # Moderate
                    features['cholesterol'] = np.random.uniform(200, 239)
                    features['hdl'] = np.random.uniform(40, 50)
                    features['ldl'] = np.random.uniform(130, 159)
                    features['triglycerides'] = np.random.uniform(150, 199)
                    features['vldl'] = np.random.uniform(30, 40)
                    features['glucose'] = np.random.uniform(100, 125)
                else:  # Low
                    features['cholesterol'] = np.random.uniform(125, 199)
                    features['hdl'] = np.random.uniform(50, 90)
                    features['ldl'] = np.random.uniform(50, 129)
                    features['triglycerides'] = np.random.uniform(50, 149)
                    features['vldl'] = np.random.uniform(10, 30)
                    features['glucose'] = np.random.uniform(70, 99)

            row = [
                features['lab_type'],
                features['wbc'], features['rbc'], features['hemoglobin'], features['platelets'],
                features['cholesterol'], features['hdl'], features['ldl'], features['triglycerides'], features['vldl'],
                features['glucose'], features['a1c'],
                features['ph'], features['specific_gravity'], features['protein'],
                features['ketones'], features['blood'], features['nitrites'], features['leukocyte_esterase'],
                risk
            ]
            data.append(row)

    columns = [
        'lab_type',
        'wbc', 'rbc', 'hemoglobin', 'platelets',
        'cholesterol', 'hdl', 'ldl', 'triglycerides', 'vldl',
        'glucose', 'a1c',
        'ph', 'specific_gravity', 'protein',
        'ketones', 'blood', 'nitrites', 'leukocyte_esterase',
        'risk_level'
    ]

    return pd.DataFrame(data, columns=columns)

def train_models():
    """Train and save unified model with 10,000 samples"""

    print("\n🚀 Training Unified LabVio ML Model...\n")
    print("========================================================")
    print(f"Timestamp: {datetime.datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
    print("========================================================")


    save_dir = os.path.join(os.path.dirname(__file__), 'saved_models')
    os.makedirs(save_dir, exist_ok=True)

    # Generate unified data
    print("📊 Generating unified synthetic data (10,000 samples)...")
    df = generate_unified_data(10000)
    print("   ✓ Data generated: CBC, Urinalysis, Lipid profiles combined\n")
    
    # Save the dataset for reference
    df.to_csv(os.path.join(os.path.dirname(__file__), 'synthetic_data_10000.csv'), index=False)
    print(f"   ✓ Saved dataset to synthetic_data_10000.csv\n")

    # Split features and target
    X = df.drop('risk_level', axis=1)
    y = df['risk_level']

    # Split into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}\n")

    # Train StandardScaler
    print("🔧 Training feature scaler...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Gradient Boosting
    print("🌲 Training Gradient Boosting model...")
    gb_model = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=6,
        random_state=42,
        verbose=0
    )
    gb_model.fit(X_train_scaled, y_train)
    gb_pred = gb_model.predict(X_test_scaled)
    gb_accuracy = accuracy_score(y_test, gb_pred)
    print(f"   Accuracy: {gb_accuracy:.3f}")

    # Train Logistic Regression
    print("📈 Training Logistic Regression model...")
    lr_model = LogisticRegression(
        max_iter=1000,
        random_state=42,
        multi_class='multinomial'
    )
    lr_model.fit(X_train_scaled, y_train)
    lr_pred = lr_model.predict(X_test_scaled)
    lr_accuracy = accuracy_score(y_test, lr_pred)
    print(f"   Accuracy: {lr_accuracy:.3f}\n")

    print("📊 Unified Model Classification Report:")
    print(classification_report(y_test, gb_pred, target_names=['Low', 'Moderate', 'High']))

    # Save models
    scaler_path = os.path.join(save_dir, 'scaler.pkl')
    gb_path = os.path.join(save_dir, 'gradient_boosting.pkl')
    lr_path = os.path.join(save_dir, 'logistic_regression.pkl')
    features_path = os.path.join(save_dir, 'features.pkl')

    joblib.dump(scaler, scaler_path)
    joblib.dump(gb_model, gb_path)
    joblib.dump(lr_model, lr_path)
    joblib.dump(list(X.columns), features_path)

    print(f"\n💾 Saving unified model...")
    print(f"   ✓ Scaler: {scaler_path}")
    print(f"   ✓ Gradient Boosting: {gb_path}")
    print(f"   ✓ Logistic Regression: {lr_path}")
    print(f"   ✓ Features: {features_path}")

    # Save info
    info_path = os.path.join(save_dir, 'model_info.txt')
    with open(info_path, 'w') as f:
        f.write("LabVio Unified Health Risk Prediction Model\n")
        f.write("========================================================\n\n")
        f.write("Single Model for All Lab Types:\n")
        f.write(f"  - Training samples: 10,000 (CBC + Urinalysis + Lipid)\n")
        f.write(f"  - Gradient Boosting Accuracy: {gb_accuracy:.3f}\n")
        f.write(f"  - Logistic Regression Accuracy: {lr_accuracy:.3f}\n\n")
        f.write("Features (19):\n")
        f.write("  - lab_type: Lab type identifier (0=CBC, 1=Urinalysis, 2=Lipid)\n")
        f.write("  - CBC: WBC, RBC, Hemoglobin, Platelets\n")
        f.write("  - Lipid: Cholesterol, HDL, LDL, Triglycerides, VLDL\n")
        f.write("  - Glucose/A1C: Glucose, A1C\n")
        f.write("  - Urinalysis: pH, Specific Gravity, Protein, Ketones, Blood, Nitrites, Leukocyte Esterase\n\n")
        f.write("Target Classes (3):\n")
        f.write("  - 0: Low Risk\n")
        f.write("  - 1: Moderate Risk\n")
        f.write("  - 2: High Risk\n")

    print(f"   ✓ Model info: {info_path}")

    print("\n" + "=" * 60)
    print("✨ Unified model training complete! Ready for production.")
    print("=" * 60 + "\n")

if __name__ == '__main__':
    train_models()