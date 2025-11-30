from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import tempfile
from pathlib import Path
import pandas as pd
import base64
import json
import uuid

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

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models" / "cointegrated_ART"

if not MODEL_DIR.exists():
    print(f"WARNING: Model directory not found at {MODEL_DIR}")
    print(f"Please place your model in: {MODEL_DIR.absolute()}")
else:
    print(f"Model found at: {MODEL_DIR.absolute()}")

RESULTS_DIR = BASE_DIR / "temp_results"
RESULTS_DIR.mkdir(exist_ok=True)


@app.get("/")
async def root():
    return {"message": "Atomic ML API is running"}


@app.get("/health")
async def health_check():
    """Проверка здоровья API и наличия модели"""
    model_exists = MODEL_DIR.exists()
    model_files = []
    if model_exists:
        model_files = [f.name for f in MODEL_DIR.iterdir()]

    return {
        "status": "healthy",
        "model_loaded": model_exists,
        "model_path": str(MODEL_DIR.absolute()),
        "model_files": model_files
    }


@app.post("/api/analyze")
async def analyze_reviews(file: UploadFile = File(...)):
    """
    Принимает CSV файл с отзывами, выполняет анализ и возвращает результаты
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    if not MODEL_DIR.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Model not found at {MODEL_DIR.absolute()}. Please place your trained model there."
        )

    request_id = str(uuid.uuid4())
    temp_dir_path = RESULTS_DIR / request_id
    temp_dir_path.mkdir(exist_ok=True)

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
                detail="CSV must contain a 'text' column with reviews"
            )

        print(f"Processing {len(df)} reviews...")

        process_and_predict(
            str(upload_path.absolute()),
            str(predictions_path.absolute()),
            model_dir=str(MODEL_DIR.absolute())
        )

        report_json_path = generate_analytics_report(
            str(predictions_path.absolute()),
            output_dir=str(temp_dir_path.absolute())
        )

        with open(report_json_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)

        if 'images' in report_data:
            for img_key, img_path in report_data['images'].items():
                if os.path.exists(img_path):
                    with open(img_path, 'rb') as img_file:
                        img_data = base64.b64encode(img_file.read()).decode('utf-8')

                        report_data['images'][img_key] = f"data:image/png;base64,{img_data}"

        report_data['download_id'] = request_id

        return JSONResponse(content=report_data)

    except Exception as e:
        if temp_dir_path.exists():
            shutil.rmtree(temp_dir_path)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if upload_path.exists():
            upload_path.unlink()


@app.get("/api/download/{request_id}")
async def download_results(request_id: str):
    """
    Скачать обработанный CSV файл с предсказаниями
    """
    predictions_path = RESULTS_DIR / request_id / "predictions.csv"

    if not predictions_path.exists():
        raise HTTPException(status_code=404, detail="File not found or expired")

    return FileResponse(
        path=str(predictions_path.absolute()),
        filename=f"predictions_{request_id}.csv",
        media_type="text/csv"
    )


@app.delete("/api/cleanup/{request_id}")
async def cleanup_results(request_id: str):
    """
    Удалить временные файлы после скачивания
    """
    temp_dir = RESULTS_DIR / request_id

    if temp_dir.exists():
        shutil.rmtree(temp_dir)
        return {"status": "cleaned", "request_id": request_id}

    return {"status": "not_found", "request_id": request_id}


if __name__ == "__main__":
    import uvicorn

    print(f"Starting server...")
    print(f"Model directory: {MODEL_DIR.absolute()}")
    print(f"Results directory: {RESULTS_DIR.absolute()}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
