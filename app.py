from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "usahousing_model"
DATA_PATH = BASE_DIR / "USA_Housing.csv"

FEATURE_KEYS = [
    "Avg. Area Income",
    "Avg. Area House Age",
    "Avg. Area Number of Rooms",
    "Area Population",
]

app = Flask(__name__)
model = joblib.load(MODEL_PATH)
df = pd.read_csv(DATA_PATH)
feature_df = df[FEATURE_KEYS].copy()
feature_stats = {
    col: {
        "mean": float(feature_df[col].mean()),
        "std": float(feature_df[col].std() + 1e-9),
        "min": float(feature_df[col].min()),
        "max": float(feature_df[col].max()),
    }
    for col in FEATURE_KEYS
}


def build_insights(input_values: dict[str, float]) -> dict:
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    else:
        importances = np.array([0.25] * len(FEATURE_KEYS))

    scores = []
    for i, feat in enumerate(FEATURE_KEYS):
        st = feature_stats[feat]
        z = (input_values[feat] - st["mean"]) / st["std"]
        direction = "upward" if z >= 0 else "downward"
        strength = abs(z) * (importances[i] + 1e-9)
        scores.append(
            {
                "feature": feat,
                "importance": float(importances[i]),
                "zscore": float(z),
                "impactDirection": direction,
                "impactStrength": float(strength),
            }
        )

    ranked = sorted(scores, key=lambda x: x["impactStrength"], reverse=True)

    # Confidence proxy based on distance from training distribution.
    distance = np.mean([abs(s["zscore"]) for s in scores])
    confidence = max(55.0, 96.0 - distance * 12.0)

    top = ranked[0]
    second = ranked[1]
    summary = (
        f"{top['feature']} shows the strongest {top['impactDirection']} effect, "
        f"followed by {second['feature']}."
    )

    return {
        "confidence": round(float(confidence), 2),
        "factors": ranked,
        "summary": summary,
    }


@app.route("/")
def home():
    return render_template("index.html", feature_stats=feature_stats)


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}

    try:
        inputs = {k: float(payload[k]) for k in FEATURE_KEYS}
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Invalid input payload."}), 400

    input_df = pd.DataFrame([inputs], columns=FEATURE_KEYS)
    pred = float(model.predict(input_df)[0])

    insights = build_insights(inputs)

    return jsonify(
        {
            "predicted_price": round(pred, 2),
            "currency": "USD",
            "confidence": insights["confidence"],
            "insight_summary": insights["summary"],
            "factor_analysis": insights["factors"],
            "input": inputs,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
