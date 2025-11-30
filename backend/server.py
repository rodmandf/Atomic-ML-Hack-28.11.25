from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import tempfile
from pathlib import Path
import pandas as pd
import base64
import json

from inference import process_and_predict
from analytics import generate_analytics_report

app = FastAPI(title="Atomic ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = Path("../models/cointegrated_ART")


@app.post("/api/analyze")
async def analyze_reviews(file: UploadFile = File(...)):
    """
    API endpoint для анализа отзывов
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Допускаются только CSV файлы")

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)

        upload_path = temp_dir_path / "input.csv"
        predictions_path = temp_dir_path / "predictions.csv"

        try:
            with open(upload_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            try:
                df = pd.read_csv(upload_path)
            except:
                df = pd.read_csv(upload_path, sep=';')

            if 'text' not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail="CSV должено содержать колонку 'text'"
                )

            process_and_predict(
                str(upload_path),
                str(predictions_path),
                model_dir=str(MODEL_DIR)
            )

            report_json_path = generate_analytics_report(
                str(predictions_path),
                output_dir=str(temp_dir_path)
            )

            with open(report_json_path, 'r', encoding='utf-8') as f:
                report_data = json.load(f)

            if 'images' in report_data:
                for img_key, img_path in report_data['images'].items():
                    if os.path.exists(img_path):
                        with open(img_path, 'rb') as img_file:
                            img_data = base64.b64encode(img_file.read()).decode('utf-8')
                            report_data['images'][img_key] = f"data:image/png;base64,{img_data}"

            return JSONResponse(content=report_data)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ошибка анализа: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)