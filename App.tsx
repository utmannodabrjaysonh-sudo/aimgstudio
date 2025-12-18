import React, { useState } from 'react';
import { ProductData, AppStep, ScenePrompt, ModelType } from './types';
import ProductForm from './components/ProductForm';
import AnalysisView from './components/AnalysisView';
import ResultsGallery from './components/ResultsGallery';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [selectedScenes, setSelectedScenes] = useState<ScenePrompt[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini-2.5-flash-image');

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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              AI
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              电商图 AI 工作室
            </h1>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
            <span className={`${step === AppStep.UPLOAD ? 'text-indigo-400' : ''}`}>1. 上传</span>
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
            <div className="text-center mb-12">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-4">
                专业商品场景图<br />
                <span className="text-indigo-500">AI 一键生成</span>
              </h1>
              <p className="max-w-2xl mx-auto text-xl text-slate-400">
                上传普通商品白底图，数秒内分析卖点并生成令人惊叹的营销大片。
              </p>
            </div>
            <ProductForm onNext={handleProductSubmit} />
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
