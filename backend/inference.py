import os
import torch
import pandas as pd
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import f1_score
from tqdm import tqdm
import re
import unicodedata

# Кешируем модель и токенизатор глобально
_model = None
_tokenizer = None
_device = None


def clean_text(text):
    """Очистка текста"""
    if not isinstance(text, str):
        return ""

    text = text.lower()

    cleaned = []
    for char in text:
        category = unicodedata.category(char)
        if category[0] in ['L', 'N', 'P', 'Z']:
            cleaned.append(char)
    text = ''.join(cleaned)

    text = text.replace('...', '__ELLIPSIS__')
    text = re.sub(r'([!?;:,\-—–])\1+', r'\1', text)
    text = text.replace('__ELLIPSIS__', '...')
    text = re.sub(r'\s{2,}', ' ', text)
    text = text.strip()

    return text


def combine_text_with_src(df, text_col='text', src_col='src', output_col='text'):
    """Склеивает текст из двух столбцов"""
    if text_col not in df.columns:
        raise ValueError(f"Столбец '{text_col}' не найден")
    if src_col not in df.columns:
        return df  # Если нет src, просто возвращаем исходный df

    df[output_col] = "[SRC] " + df[src_col].astype(str) + " [TEXT] " + df[text_col].astype(str)
    return df


def load_model(model_dir: str):
    """Загружает модель один раз"""
    global _model, _tokenizer, _device

    if _model is not None:
        return _model, _tokenizer, _device

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading model on device: {_device}")

    try:
        _tokenizer = AutoTokenizer.from_pretrained(model_dir)
        _model = AutoModelForSequenceClassification.from_pretrained(model_dir)
        _model.to(_device)
        _model.eval()
        print("Model loaded successfully.")
    except Exception as e:
        raise RuntimeError(f"Could not load model from {model_dir}. Error: {e}")

    return _model, _tokenizer, _device


def process_and_predict(input_csv_path: str, output_csv_path: str, model_dir: str):
    """
    Принимает путь к входному CSV, делает предсказания, сохраняет результат.
    Возвращает: (metric_f1, output_path)
    """
    # Загружаем модель
    model, tokenizer, device = load_model(model_dir)

    if not os.path.exists(input_csv_path):
        raise FileNotFoundError(f"Input file not found: {input_csv_path}")

    try:
        df = pd.read_csv(input_csv_path)
    except:
        df = pd.read_csv(input_csv_path, sep=';')

    if 'text' not in df.columns:
        raise ValueError("CSV must contain a 'text' column!")

    # Очистка
    df['text'] = df['text'].fillna("")
    df['text'] = df['text'].apply(clean_text)

    if 'src' in df.columns:
        df = combine_text_with_src(df, text_col='text', src_col='src', output_col='text')

    texts = df['text'].tolist()

    # Инференс
    batch_size = 32
    predictions = []

    print(f"Predicting for {len(texts)} texts")

    for i in tqdm(range(0, len(texts), batch_size)):
        batch_texts = texts[i: i + batch_size]

        inputs = tokenizer(
            batch_texts,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512
        ).to(device)

        with torch.no_grad():
            logits = model(**inputs).logits
            preds = torch.argmax(logits, dim=-1).cpu().numpy()

        predictions.extend(preds)

    df['predicted_label'] = predictions

    # Считаем метрику
    f1_macro = None
    if 'label' in df.columns:
        try:
            true_labels = df['label'].astype(int).tolist()
            f1_macro = f1_score(true_labels, predictions, average='macro')
            print(f"Validation Macro-F1: {f1_macro:.4f}")
        except Exception as e:
            print(f"Metric calculation skipped: {e}")

    # Сохраняем
    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    df.to_csv(output_csv_path, index=False)
    print(f"Saved results to: {output_csv_path}")

    return f1_macro, output_csv_path