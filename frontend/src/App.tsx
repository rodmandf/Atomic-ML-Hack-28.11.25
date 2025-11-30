import './App.css'
import {Dropzone, DropzoneContent, DropzoneEmptyState} from "@/components/ui/shadcn-io/dropzone";
import {useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import axios from "axios";
import {Spinner} from "@/components/ui/spinner.tsx";

// Тип для результатов
type AnalysisResults = {
    business_metrics: {
        sentiment_index: number;
        total_count: number;
        counts: {
            Neutral: number;
            Positive: number;
            Negative: number;
        }
    };
    quality_metrics?: {
        "0": {
            precision: number;
            recall: number;
            "f1-score": number;
            support: number;
        };
        "1": {
            precision: number;
            recall: number;
            "f1-score": number;
            support: number;
        };
        "2": {
            precision: number;
            recall: number;
            "f1-score": number;
            support: number;
        };
        accuracy: number;
        "macro avg": {
            precision: number;
            recall: number;
            "f1-score": number;
            support: number;
        };
        "weighted avg": {
            precision: number;
            recall: number;
            "f1-score": number;
            support: number;
        };
    };
    images: {
        sentiment_pie: string;
        confusion_matrix?: string;
    };
};

function App() {
    const [files, setFiles] = useState<File[]>([]);
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDrop = (files: File[]) => {
        console.log('Uploaded files:', files);
        setFiles(files);
        setError(null);
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            setError('Пожалуйста, выберите файл');
            return;
        }

        const file = files[0];

        if (!file.name.endsWith('.csv')) {
            setError('Пожалуйста, загрузите CSV файл');
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post<AnalysisResults>(
                'http://localhost:8000/api/analyze',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setResults(response.data);
            console.log('Analysis complete:', response.data);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setError(error.response?.data?.detail || 'Ошибка при анализе файла');
            } else {
                setError('Произошла неизвестная ошибка');
            }
            console.error('Upload error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setResults(null);
        setError(null);
    };

    return (
        <div className="app">
            <header className="site-header">
                <div className="header-content">
                    <div>
                        <h1 className="text-2xl font-bold">Atomic ML</h1>
                    </div>
                    <span className="text-sm px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                        Hack&Change 2025
                    </span>
                </div>
            </header>

            <main className="site-content">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                        Загрузите список отзывов
                    </h1>
                    <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                        Загрузите CSV файл с отзывами для анализа
                    </p>
                </div>

                {!results && (
                    <>
                        <div className="max-w-3xl mx-auto">
                            <Dropzone
                                accept={{ 'text/csv': ['.csv'] }}
                                maxFiles={1}
                                maxSize={100 * 1024 * 1024}
                                onDrop={handleDrop}
                                src={files}
                                disabled={loading}
                                className="!bg-gradient-to-br !from-slate-50 !to-slate-100 !text-slate-900 !border-slate-300 border-2 border-dashed rounded-2xl hover:!border-slate-400 hover:!shadow-lg transition-all duration-300 min-h-64"
                            >
                                <DropzoneEmptyState />
                                <DropzoneContent />
                            </Dropzone>
                        </div>

                        <div className="max-w-3xl mx-auto my-5">
                            <Button
                                className="w-full min-h-12 !bg-slate-700 !text-white hover:!bg-slate-600 hover:!shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleUpload}
                                disabled={loading || files.length === 0}
                            >
                                {loading ? (
                                    <Spinner/>
                                ) : (
                                    'Отправить'
                                )}
                            </Button>
                        </div>

                        {error && (
                            <div className="max-w-3xl mx-auto mt-4">
                                <p className="text-red-700">
                                     {error}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {results && (
                    <div className="max-w-7xl mx-auto">
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
                                    <div className="text-sm text-slate-600 mb-2">Всего отзывов</div>
                                    <div className="text-3xl font-bold text-slate-900">
                                        {results.business_metrics.total_count.toLocaleString('ru-RU')}
                                    </div>
                                </div>

                                <div className="p-6 bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-200 shadow-sm">
                                    <div className="text-sm text-green-700 mb-2">Позитивные</div>
                                    <div className="text-3xl font-bold text-green-600">
                                        {((results.business_metrics.counts.Positive / results.business_metrics.total_count) * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        {results.business_metrics.counts.Positive.toLocaleString('ru-RU')}
                                    </div>
                                </div>

                                <div className="p-6 bg-gradient-to-br from-red-50 to-white rounded-xl border-2 border-red-200 shadow-sm">
                                    <div className="text-sm text-red-700 mb-2">Негативные</div>
                                    <div className="text-3xl font-bold text-red-600">
                                        {((results.business_metrics.counts.Negative / results.business_metrics.total_count) * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        {results.business_metrics.counts.Negative.toLocaleString('ru-RU')}
                                    </div>
                                </div>

                                <div className="p-6 bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-slate-200 shadow-sm">
                                    <div className="text-sm text-slate-700 mb-2">Нейтральные</div>
                                    <div className="text-3xl font-bold text-slate-600">
                                        {((results.business_metrics.counts.Neutral / results.business_metrics.total_count) * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        {results.business_metrics.counts.Neutral.toLocaleString('ru-RU')}
                                    </div>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200">
                                    <div className="text-left">
                                        <div className="text-sm text-slate-600">Индекс лояльности</div>
                                        <div className="text-2xl font-bold text-slate-900">
                                            {results.business_metrics.sentiment_index.toFixed(4)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {results.quality_metrics && (
                                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-8">
                                    <h3 className="text-xl font-bold mb-6">Метрики качества модели</h3>

                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="text-sm text-blue-700 mb-1">Общая точность (Accuracy)</div>
                                        <div className="text-3xl font-bold text-blue-600">
                                            {(results.quality_metrics.accuracy * 100).toFixed(2)}%
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <h4 className="font-semibold text-slate-700 mb-3">Нейтральные</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Precision:</span>
                                                    <span className="font-semibold">{(results.quality_metrics["0"].precision * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Recall:</span>
                                                    <span className="font-semibold">{(results.quality_metrics["0"].recall * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">F1-Score:</span>
                                                    <span className="font-semibold">{(results.quality_metrics["0"]["f1-score"] * 100).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                            <h4 className="font-semibold text-green-700 mb-3">Позитивные</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-green-600">Precision:</span>
                                                    <span className="font-semibold text-green-700">{(results.quality_metrics["1"].precision * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-green-600">Recall:</span>
                                                    <span className="font-semibold text-green-700">{(results.quality_metrics["1"].recall * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-green-600">F1-Score:</span>
                                                    <span className="font-semibold text-green-700">{(results.quality_metrics["1"]["f1-score"] * 100).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                            <h4 className="font-semibold text-red-700 mb-3">Негативные</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-red-600">Precision:</span>
                                                    <span className="font-semibold text-red-700">{(results.quality_metrics["2"].precision * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-red-600">Recall:</span>
                                                    <span className="font-semibold text-red-700">{(results.quality_metrics["2"].recall * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-red-600">F1-Score:</span>
                                                    <span className="font-semibold text-red-700">{(results.quality_metrics["2"]["f1-score"] * 100).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <h4 className="font-semibold text-purple-700 mb-3">Macro Average (среднее по классам)</h4>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <div className="text-purple-600">Precision</div>
                                                <div className="text-lg font-bold text-purple-700">
                                                    {(results.quality_metrics["macro avg"].precision * 100).toFixed(2)}%
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-purple-600">Recall</div>
                                                <div className="text-lg font-bold text-purple-700">
                                                    {(results.quality_metrics["macro avg"].recall * 100).toFixed(2)}%
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-purple-600">F1-Score</div>
                                                <div className="text-lg font-bold text-purple-700">
                                                    {(results.quality_metrics["macro avg"]["f1-score"] * 100).toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {results.images.sentiment_pie && (
                                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-8">
                                    <h3 className="text-xl font-bold mb-6 text-center">Распределение тональности</h3>
                                    <div className="flex justify-center">
                                        <img
                                            src={results.images.sentiment_pie}
                                            alt="Sentiment Distribution"
                                            className="max-w-full h-auto rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {results.quality_metrics && results.images.confusion_matrix && (
                                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-8">
                                    <h3 className="text-xl font-bold mb-6 text-center">Матрица ошибок (Confusion Matrix)</h3>
                                    <div className="flex justify-center">
                                        <img
                                            src={results.images.confusion_matrix}
                                            alt="Confusion Matrix"
                                            className="max-w-full h-auto rounded-lg"
                                        />
                                    </div>
                                    <p className="text-center text-sm text-slate-600 mt-4">
                                        По диагонали — правильные предсказания модели. Вне диагонали — ошибки.
                                    </p>
                                </div>
                            )}

                            <div className="text-center">
                                <Button
                                    onClick={handleReset}
                                    className="px-8 py-3 !bg-slate-700 !text-white hover:!bg-slate-600 transition-colors"
                                >
                                    Загрузить новый файл
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {!results && !loading && files.length === 0 && (
                    <div className="max-w-3xl mx-auto mt-10">
                        <div className="text-center text-slate-400 py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                            <p className="text-lg">Результаты анализа появятся здесь</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default App