import os
import math
import json
from typing import List, Dict, Any, Tuple

import numpy as np
import pandas as pd
from joblib import load
import h5py
from fastapi import FastAPI
from pydantic import BaseModel, Field

from supabase import create_client, Client

# ===== 환경설정 =====
SCALER_PATH = os.getenv("SCALER_PATH", "scaler.joblib")
MODEL_H5_PATH = os.getenv("MODEL_H5_PATH", "logreg_model.h5")
THRESHOLD = float(os.getenv("THRESHOLD", "0.5"))

# ===== 모델/스케일러 로드 (프로세스 시작 시 1회) =====
scaler = load(SCALER_PATH)

with h5py.File(MODEL_H5_PATH, "r") as f:
    COEF = np.array(f["coef_"])        # (1, n_features) for binary
    INTERCEPT = np.array(f["intercept_"])  # (1,)
    FEATURE_NAMES: List[str] = [n.decode() for n in f.attrs["feature_names"]]

def predict_proba_df(df):
    # 누락 피처 보정 + 순서 맞추기
    for col in FEATURE_NAMES:
        if col not in df.columns:
            df[col] = 0.0
    X = df[FEATURE_NAMES].apply(pd.to_numeric, errors="coerce")
    X = X.fillna(X.median(numeric_only=True))
    Xs = scaler.transform(X.values)
    logits = Xs @ COEF.T + INTERCEPT
    proba = 1.0 / (1.0 + np.exp(-logits))
    return proba.ravel()

# ===== FastAPI =====
app = FastAPI(title="Fire Alert Inference")

class Sample(BaseModel):
    values: dict

class Batch(BaseModel):
    records: list

@app.get("/meta")
def meta():
    return {"features": FEATURE_NAMES, "threshold": THRESHOLD}

@app.post("/predict")
def predict(payload: Sample):
    df = pd.DataFrame([payload.values])
    p = float(predict_proba_df(df)[0])
    return {"proba": p, "alert": int(p >= THRESHOLD), "threshold": THRESHOLD}

@app.post("/predict_batch")
def predict_batch(payload: Batch):
    if not payload.records:
        return {"results": []}
    df = pd.DataFrame(payload.records)
    probs = predict_proba_df(df)
    results = [{"proba": float(p), "alert": int(p >= THRESHOLD)} for p in probs]
    return {"results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("fire_alert_server:app", host="0.0.0.0", port=8100, reload=True)