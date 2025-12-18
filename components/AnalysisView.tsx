import React, { useEffect, useState } from 'react';
import { ProductData, ScenePrompt, ModelType } from '../types';
import { analyzeAndDraftScenes } from '../services/geminiService';
import { CheckIcon, MagicIcon } from './Icons';

interface AnalysisViewProps {
  product: ProductData;
  onAnalysisComplete: (scenes: ScenePrompt[], model: ModelType) => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ product, onAnalysisComplete }) => {
  const [status, setStatus] = useState<'analyzing' | 'ready'>('analyzing');
  const [analysisText, setAnalysisText] = useState<string>('');
  const [prompts, setPrompts] = useState<ScenePrompt[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini-2.5-flash-image');

  useEffect(() => {
    const runPipeline = async () => {
      try {
        setStatus('analyzing');
        // 并发执行：一步完成分析和场景构思，显著提升速度
        const result = await analyzeAndDraftScenes(product);
        
        setAnalysisText(result.analysis);
        setPrompts(result.scenes);
        
        // 默认全选
        setSelectedIndices(result.scenes.map((_, i) => i));
        setStatus('ready');
      } catch (error) {
        console.error(error);
        setAnalysisText("分析过程中遇到一点小问题，但我们准备了一些通用场景供您尝试。");
        // Error handling mostly covered in service fallback
        setStatus('ready');
      }
    };

    runPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleProceed = () => {
    const selectedPrompts = prompts.filter((_, i) => selectedIndices.includes(i));
    onAnalysisComplete(selectedPrompts, selectedModel);
  };

  if (status !== 'ready') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="relative inline-flex">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <MagicIcon />
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-white">
          正在深度分析与构思...
        </h2>
        <p className="mt-2 text-slate-400">
          AI 正在分析产品特征，并为您构思包含<span className="text-indigo-400">展示型</span>与<span className="text-indigo-400">使用场景型</span>的混合方案。
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
      {/* Analysis Result */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
        <h3 className="text-lg font-semibold text-indigo-400 mb-2 flex items-center gap-2">
          <CheckIcon /> 智能分析报告
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">{analysisText}</p>
      </div>

      {/* Model Selection */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">选择生图模型</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => setSelectedModel('gemini-2.5-flash-image')}
            className={`cursor-pointer p-4 rounded-lg border-2 flex items-center gap-4 transition-all ${
              selectedModel === 'gemini-2.5-flash-image' 
                ? 'border-indigo-500 bg-indigo-900/20' 
                : 'border-slate-600 hover:bg-slate-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedModel === 'gemini-2.5-flash-image' ? 'border-indigo-500' : 'border-slate-400'}`}>
              {selectedModel === 'gemini-2.5-flash-image' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
            </div>
            <div>
              <p className="font-medium text-white">Google Gemini 2.5</p>
              <p className="text-xs text-slate-400">速度极快，创意性强</p>
            </div>
          </div>

          <div 
            onClick={() => setSelectedModel('qwen-image-edit-plus-2025-10-30')}
            className={`cursor-pointer p-4 rounded-lg border-2 flex items-center gap-4 transition-all ${
              selectedModel === 'qwen-image-edit-plus-2025-10-30' 
                ? 'border-indigo-500 bg-indigo-900/20' 
                : 'border-slate-600 hover:bg-slate-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedModel === 'qwen-image-edit-plus-2025-10-30' ? 'border-indigo-500' : 'border-slate-400'}`}>
              {selectedModel === 'qwen-image-edit-plus-2025-10-30' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
            </div>
            <div>
              <p className="font-medium text-white">Alibaba Qwen (通义万相)</p>
              <p className="text-xs text-slate-400">国内领先模型，适合人物与细节</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scene Selection */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">2. 确认生成方案</h2>
        <p className="text-slate-400 mb-6">已为您规划以下 <span className="text-indigo-400">{prompts.length}</span> 个场景，包含纯展示与场景应用。请勾选满意的方案：</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map((prompt, idx) => (
            <div 
              key={idx}
              onClick={() => toggleSelection(idx)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedIndices.includes(idx)
                  ? 'border-indigo-500 bg-indigo-900/20'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                  selectedIndices.includes(idx) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'
                }`}>
                  {selectedIndices.includes(idx) && <CheckIcon />}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-slate-200">{prompt.zh}</p>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed opacity-70">{prompt.en}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 pb-12">
        <button
          onClick={handleProceed}
          disabled={selectedIndices.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/25"
        >
          <MagicIcon />
          开始生成 {selectedIndices.length} 张图片
        </button>
      </div>
    </div>
  );
};

export default AnalysisView;
