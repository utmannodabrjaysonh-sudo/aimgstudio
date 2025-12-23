import React, { useState } from 'react';
import { ProductData, AppStep, ScenePrompt, ModelType } from './types';
import ProductForm from './components/ProductForm';
import ZingImportForm from './components/ZingImportForm';
import AnalysisView from './components/AnalysisView';
import ResultsGallery from './components/ResultsGallery';
import { UploadIcon, LinkIcon } from './components/Icons';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [selectedScenes, setSelectedScenes] = useState<ScenePrompt[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini-2.5-flash-image');
  // Mode: 'upload' (Manual image file) or 'zing' (Zing API List/ID)
  const [importMode, setImportMode] = useState<'upload' | 'zing'>('upload');

  const handleProductSubmit = (data: ProductData) => {
    setProductData(data);
    setStep(AppStep.ANALYZING);
  };

  const handleAnalysisComplete = (scenes: ScenePrompt[], model: ModelType) => {
    setSelectedScenes(scenes);
    setSelectedModel(model);
    setStep(AppStep.GENERATING);
  };

  const handleReset = () => {
    setProductData(null);
    setSelectedScenes([]);
    setStep(AppStep.UPLOAD);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              AI
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              电商图 AI 工作室
            </h1>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
            <span className={`${step === AppStep.UPLOAD ? 'text-indigo-400' : ''}`}>1. 选品 & 上传</span>
            <span className="text-slate-700">/</span>
            <span className={`${step === AppStep.ANALYZING || step === AppStep.SCENE_SELECTION ? 'text-indigo-400' : ''}`}>2. 分析与规划</span>
            <span className="text-slate-700">/</span>
            <span className={`${step === AppStep.GENERATING ? 'text-indigo-400' : ''}`}>3. 生成</span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {step === AppStep.UPLOAD && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-4">
                专业商品场景图<br />
                <span className="text-indigo-500">AI 一键生成</span>
              </h1>
              <p className="max-w-2xl mx-auto text-xl text-slate-400">
                支持上传图片或通过智赢 ID 解析商品，自动生成营销场景、卖点图与 A+ 页面。
              </p>
            </div>

            {/* Tabs */}
            <div className="max-w-2xl mx-auto mb-8 flex p-1 bg-slate-800 rounded-xl">
              <button 
                onClick={() => setImportMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  importMode === 'upload' 
                    ? 'bg-slate-700 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadIcon /> 上传商品图
              </button>
              <button 
                onClick={() => setImportMode('zing')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  importMode === 'zing' 
                    ? 'bg-slate-700 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LinkIcon /> 智赢解析 (商品库/ID)
              </button>
            </div>

            {importMode === 'upload' ? (
              <ProductForm onNext={handleProductSubmit} />
            ) : (
              <ZingImportForm onNext={handleProductSubmit} />
            )}
          </div>
        )}

        {(step === AppStep.ANALYZING || step === AppStep.SCENE_SELECTION) && productData && (
          <div className="animate-fade-in">
            <AnalysisView 
              product={productData} 
              onAnalysisComplete={handleAnalysisComplete} 
            />
          </div>
        )}

        {step === AppStep.GENERATING && productData && (
          <div className="animate-fade-in">
            <ResultsGallery 
              product={productData} 
              scenes={selectedScenes}
              model={selectedModel}
              onReset={handleReset} 
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-auto py-8 text-center text-slate-500 text-sm">
        <p>技术支持：Google Gemini 2.5 Flash & Alibaba Qwen</p>
      </footer>
    </div>
  );
};

export default App;
