import React, { useEffect, useState } from 'react';
import { ProductData, ScenePrompt } from '../types';
import { analyzeProductImage, generateScenePrompts } from '../services/geminiService';
import { CheckIcon, MagicIcon } from './Icons';

interface AnalysisViewProps {
  product: ProductData;
  onAnalysisComplete: (scenes: ScenePrompt[]) => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ product, onAnalysisComplete }) => {
  const [status, setStatus] = useState<'analyzing' | 'generating_prompts' | 'ready'>('analyzing');
  const [analysisText, setAnalysisText] = useState<string>('');
  const [prompts, setPrompts] = useState<ScenePrompt[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    const runPipeline = async () => {
      try {
        // Step 1: Analyze
        setStatus('analyzing');
        const analysis = await analyzeProductImage(product);
        setAnalysisText(analysis);

        // Step 2: Generate Prompts
        setStatus('generating_prompts');
        const generatedPrompts = await generateScenePrompts(product, analysis);
        setPrompts(generatedPrompts);
        
        // Select all by default
        setSelectedIndices(generatedPrompts.map((_, i) => i));
        setStatus('ready');
      } catch (error) {
        console.error(error);
        // Error handling could be improved here
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
    onAnalysisComplete(selectedPrompts);
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
          {status === 'analyzing' ? '正在分析视觉特征...' : '正在构思创意场景...'}
        </h2>
        <p className="mt-2 text-slate-400">AI 正在研究您的产品，为您寻找最佳的展示环境。</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Analysis Result */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-indigo-400 mb-2 flex items-center gap-2">
          <CheckIcon /> 视觉分析报告
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">{analysisText}</p>
      </div>

      {/* Scene Selection */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">2. 选择目标场景</h2>
        <p className="text-slate-400 mb-6">根据您的产品，我们生成了以下场景概念。请选择您想要生成的场景。</p>
        
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
                  <p className="text-xs text-slate-500 line-clamp-2">{prompt.en}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleProceed}
          disabled={selectedIndices.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <MagicIcon />
          生成 {selectedIndices.length} 张图片
        </button>
      </div>
    </div>
  );
};

export default AnalysisView;
