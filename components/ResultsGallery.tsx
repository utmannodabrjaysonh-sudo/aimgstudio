import React, { useEffect, useState, useRef } from 'react';
import { ProductData, GeneratedScene, ScenePrompt, ModelType } from '../types';
import { generateMarketingImage } from '../services/geminiService';
import { generateImageWithQwen } from '../services/aliyunService';
import { RefreshIcon } from './Icons';

interface ResultsGalleryProps {
  product: ProductData;
  scenes: ScenePrompt[];
  model: ModelType;
  onReset: () => void;
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ product, scenes, model, onReset }) => {
  const [results, setResults] = useState<GeneratedScene[]>(
    scenes.map((prompt, i) => ({
      id: `scene-${i}`,
      prompt: prompt,
      status: 'pending'
    }))
  );

  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const itemsToProcess = results.filter(r => r.status === 'pending' && !processingRef.current.has(r.id));
    if (itemsToProcess.length === 0) return;

    itemsToProcess.forEach(item => processingRef.current.add(item.id));

    setResults(prev => prev.map(r => 
      itemsToProcess.some(item => item.id === r.id)
        ? { ...r, status: 'generating' }
        : r
    ));

    const processQueue = async () => {
      const processItem = async (item: GeneratedScene) => {
        try {
          let imageUrl: string;

          if (model === 'qwen-image-edit-plus-2025-10-30') {
              // Qwen currently ignores aspect ratio param in this specific simplified call, 
              // but real implementation would need to pass it if API supports it.
              // For now, we pass the prompt.
              imageUrl = await generateImageWithQwen(product, item.prompt.en);
          } else {
              // Gemini supports explicit AR param
              imageUrl = await generateMarketingImage(product, item.prompt.en, item.prompt.aspectRatio);
          }
          
          setResults(prev => prev.map(r => 
            r.id === item.id ? { ...r, status: 'completed', imageUrl } : r
          ));
        } catch (error) {
          console.error(`Failed to generate scene ${item.id}`, error);
          setResults(prev => prev.map(r => 
            r.id === item.id ? { ...r, status: 'failed' } : r
          ));
        }
      };

      if (model === 'qwen-image-edit-plus-2025-10-30') {
        for (const item of itemsToProcess) {
          await processItem(item);
          await new Promise(resolve => setTimeout(resolve, 500)); 
        }
      } else {
        await Promise.all(itemsToProcess.map(item => processItem(item)));
      }
    };

    processQueue();

  }, [results, product, model]);

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-product-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold text-white">3. 生成结果</h2>
           <p className="text-sm text-slate-400 mt-1">
             使用模型: <span className="text-indigo-400 font-medium">{model === 'qwen-image-edit-plus-2025-10-30' ? 'Alibaba Qwen' : 'Google Gemini'}</span>
           </p>
        </div>
        
        <button 
          onClick={onReset}
          className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
        >
          <RefreshIcon /> 重新开始
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((scene) => (
          <div key={scene.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg flex flex-col">
            {/* Aspect Ratio Container */}
            <div className={`relative w-full bg-slate-900 group ${
                scene.prompt.aspectRatio === '9:16' ? 'aspect-[9/16]' :
                scene.prompt.aspectRatio === '16:9' ? 'aspect-[16/9]' :
                scene.prompt.aspectRatio === '3:4' ? 'aspect-[3/4]' :
                scene.prompt.aspectRatio === '4:3' ? 'aspect-[4/3]' :
                'aspect-square'
            }`}>
              {scene.status === 'completed' && scene.imageUrl ? (
                <img 
                  src={scene.imageUrl} 
                  alt="Generated Scene" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : scene.status === 'failed' ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center text-sm">
                  生成失败
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-xs font-medium">
                    {scene.status === 'generating' ? 'AI 渲染中...' : '排队中...'}
                  </span>
                </div>
              )}
              
              {/* Type Badge */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded">
                {scene.prompt.type.toUpperCase()}
              </div>
            </div>
            
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-sm text-white mb-1 font-medium line-clamp-2" title={scene.prompt.zh}>
                  {scene.prompt.zh}
                </p>
                <p className="text-xs text-slate-500">{scene.prompt.aspectRatio}</p>
              </div>
              
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => scene.imageUrl && downloadImage(scene.imageUrl, scene.id)}
                  disabled={scene.status !== 'completed'}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-white text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  下载
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