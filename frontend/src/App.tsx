import './App.css'
import {Dropzone, DropzoneContent, DropzoneEmptyState} from "@/components/ui/shadcn-io/dropzone";
import {useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import axios from "axios";

function App() {
    const handleDrop = (files: File[]) => {
        console.log('Uploaded files:', files);
        setFiles(files);
    };

    const [files, setFiles] = useState<File[]>([]);

    const  handleUpload = async () => {
        await axios.get("http://localhost:8080")
    }

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

                <div className="max-w-3xl mx-auto">
                    <Dropzone
                        accept={{ 'text/csv': ['.csv'] }}
                        maxFiles={1}
                        maxSize={100 * 1024 * 1024}
                        onDrop={handleDrop}
                        src={files}
                        className="!bg-gradient-to-br !from-slate-50 !to-slate-100 !text-slate-900 !border-slate-300 border-2 border-dashed rounded-2xl hover:!border-slate-400 hover:!shadow-lg transition-all duration-300 min-h-64"
                    >
                        <DropzoneEmptyState />
                        <DropzoneContent />
                    </Dropzone>
                </div>

                <div className="max-w-3xl mx-auto my-5">
                    <Button
                        className="w-full min-h-3 !bg-slate-700 !text-white hover:!bg-slate-600 hover:!shadow-lg transition-all duration-300"
                        onClick={() => {}}
                    >Отправить</Button>
                </div>

                {true &&
                    <div className="max-w-3xl mx-auto mt-10">
                        <div className="text-center text-slate-400 py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                            <p className="text-lg">Результаты анализа появятся здесь</p>
                        </div>
                    </div>
                }
            </main>
        </div>
    )
}

export default App