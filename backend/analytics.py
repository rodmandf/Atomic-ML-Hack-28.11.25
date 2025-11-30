import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import json
import os
from sklearn.metrics import classification_report, confusion_matrix

plt.style.use('ggplot')
plt.rcParams['font.family'] = 'DejaVu Sans'


def generate_analytics_report(csv_path, output_dir="./report"):
    """
    Генерирует отчет с метриками и графиками.
    """
    print(f"--- Генерация отчета для {csv_path} ---")
    os.makedirs(output_dir, exist_ok=True)

    try:
        df = pd.read_csv(csv_path)
    except:
        df = pd.read_csv(csv_path, sep=';')

    if 'predicted_label' not in df.columns:
        raise ValueError("ОШИБКА: В CSV нет колонки 'predicted_label'.")

    df['predicted_label'] = pd.to_numeric(df['predicted_label'], errors='coerce').fillna(-1).astype(int)

    report_data = {'business_metrics': {}, 'images': {}}

    classes_map = {0: 'Нейтрально', 1: 'Позитив', 2: 'Негатив'}

    # 1. МЕТРИКИ КАЧЕСТВА (если есть истинные метки)
    if 'label' in df.columns:
        print(">>> Считаем метрики качества")
        y_true = pd.to_numeric(df['label'], errors='coerce').fillna(-1).astype(int)
        y_pred = df['predicted_label']

        mask = (y_true != -1) & (y_pred != -1)
        y_true_clean = y_true[mask]
        y_pred_clean = y_pred[mask]

        if len(y_true_clean) > 0:
            cls_report = classification_report(y_true_clean, y_pred_clean, output_dict=True, zero_division=0)
            report_data['quality_metrics'] = cls_report

            # Confusion Matrix
            cm = confusion_matrix(y_true_clean, y_pred_clean)
            plt.figure(figsize=(8, 6))

            tick_labels = [classes_map[i] for i in sorted(classes_map.keys())]

            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', annot_kws={"size": 14},
                        xticklabels=tick_labels,
                        yticklabels=tick_labels)

            plt.title("Матрица ошибок (Confusion Matrix)", fontsize=14, pad=20)
            plt.xlabel("Предсказание модели", fontsize=12, fontweight='bold')
            plt.ylabel("На самом деле", fontsize=12, fontweight='bold')

            cm_path = os.path.join(output_dir, "confusion_matrix.png")
            plt.savefig(cm_path, bbox_inches='tight', dpi=100)
            plt.close()
            report_data['images']["confusion_matrix"] = cm_path

    # 2. БИЗНЕС-МЕТРИКИ
    print("Считаем бизнес-статистику")

    n_neu = len(df[df['predicted_label'] == 0])
    n_pos = len(df[df['predicted_label'] == 1])
    n_neg = len(df[df['predicted_label'] == 2])
    total = len(df)

    if total > 0:
        sentiment_index = (n_pos - n_neg) / total

        report_data['business_metrics'] = {
            'sentiment_index': round(sentiment_index, 4),
            'total_count': total,
            'counts': {'Neutral': n_neu, 'Positive': n_pos, 'Negative': n_neg}
        }

        # Pie Chart
        plt.figure(figsize=(7, 7))

        labels = [f'Негатив ({n_neg})', f'Позитив ({n_pos})', f'Нейтрально ({n_neu})']
        sizes = [n_neg, n_pos, n_neu]
        colors = ['#e74c3c', '#2ecc71', '#bdc3c7']

        plt.pie(sizes, labels=labels, autopct='%1.1f%%',
                colors=colors, startangle=90, pctdistance=0.85)

        centre_circle = plt.Circle((0, 0), 0.70, fc='white')
        fig = plt.gcf()
        fig.gca().add_artist(centre_circle)

        plt.title(f"Распределение тональности\nИндекс лояльности: {sentiment_index:.2f}", fontsize=14)

        pie_path = os.path.join(output_dir, "sentiment_pie.png")
        plt.savefig(pie_path, bbox_inches='tight', dpi=100)
        plt.close()
        report_data['images']["sentiment_pie"] = pie_path

    # Сохраняем JSON
    json_path = os.path.join(output_dir, "final_report.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=4, ensure_ascii=False)

    print(f"Отчет готов: {json_path}")
    return json_path