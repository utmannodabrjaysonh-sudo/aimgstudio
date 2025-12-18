import React, { useEffect, useState, useRef } from 'react';
import { ProductData, GeneratedScene, ScenePrompt } from '../types';
import { generateMarketingImage } from '../services/geminiService';
import { RefreshIcon } from './Icons';

interface ResultsGalleryProps {
  product: ProductData;
  scenes: ScenePrompt[];
  onReset: () => void;
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ product, scenes, onReset }) => {
  const [results, setResults] = useState<GeneratedScene[]>(
    scenes.map((prompt, i) => ({
      id: `scene-${i}`,
      prompt: prompt,
      status: 'pending'
    }))
  );

  // 使用 Ref 记录已开始处理的任务ID，防止 React 重渲染导致重复请求
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. 找出所有处于 pending 状态且尚未开始处理的任务
    const itemsToProcess = results.filter(r => r.status === 'pending' && !processingRef.current.has(r.id));

    if (itemsToProcess.length === 0) return;

    // 2. 立即将这些任务标记为已处理，防止后续重复触发
    itemsToProcess.forEach(item => processingRef.current.add(item.id));

    // 3. 更新 UI 状态为 "正在生成"
    setResults(prev => prev.map(r => 
      itemsToProcess.some(item => item.id === r.id)
        ? { ...r, status: 'generating' }
        : r
    ));

    // 4. 并发触发所有 API 请求
    itemsToProcess.forEach(async (item) => {
      try {
        // 调用生成接口
        const imageUrl = await generateMarketingImage(product, item.prompt.en);
        
        // 单个任务完成后更新状态
        setResults(prev => prev.map(r => 
          r.id === item.id ? { ...r, status: 'completed', imageUrl } : r
        ));
      } catch (error) {
        console.error(`Failed to generate scene ${item.id}`, error);
        // 单个任务失败后更新状态
        setResults(prev => prev.map(r => 
          r.id === item.id ? { ...r, status: 'failed' } : r
        ));
      }
    });

  }, [results, product]);

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-product-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">3. 生成结果</h2>
        <button 
          onClick={onReset}
          className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
        >
          <RefreshIcon /> 重新开始
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8">
        {results.map((scene) => (
          <div key={scene.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg flex flex-col">
            <div className="relative aspect-[4/3] bg-slate-900 w-full">
              {scene.status === 'completed' && scene.imageUrl ? (
                <img 
                  src={scene.imageUrl} 
                  alt="Generated Scene" 
                  className="w-full h-full object-cover"
                />
              ) : scene.status === 'failed' ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center">
                  生成失败，请稍后重试。
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-sm font-medium">
                    {scene.status === 'generating' ? '正在渲染...' : '排队中...'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                {/* Show Chinese prompt primarily */}
                <p className="text-sm text-white mb-2 font-medium">
                  {scene.prompt.zh}
                </p>
                {/* Optional: Show English prompt smaller or in tooltip if needed, keeping simple for now */}
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => scene.imageUrl && downloadImage(scene.imageUrl, scene.id)}
                  disabled={scene.status !== 'completed'}
                  className="px-4 py-2 text-xs font-semibold rounded bg-white text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  下载高清图
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsGallery;
