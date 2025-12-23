import React, { useRef, useState } from 'react';
import { ProductData, GenerationConfig, SupportedLanguage } from '../types';
import { UploadIcon, ImageIcon, GlobeIcon } from './Icons';

interface ProductFormProps {
  onNext: (data: ProductData) => void;
}

const DEFAULT_CONFIGS: GenerationConfig[] = [
  { type: 'scene', label: '🏞 场景氛围图 (Lifestyle)', count: 2, aspectRatio: '1:1', enabled: true },
  { type: 'marketing', label: '📊 卖点视觉化 (Visual Benefit)', count: 2, aspectRatio: '3:4', enabled: false },
  { type: 'aplus', label: '📑 A+ 详情页 (Infographic)', count: 1, aspectRatio: '9:16', enabled: false },
];

const ProductForm: React.FC<ProductFormProps> = ({ onNext }) => {
  const [name, setName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('en');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [configs, setConfigs] = useState<GenerationConfig[]>(DEFAULT_CONFIGS);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("文件大小不能超过 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const matches = result.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          setFileData({ mimeType: matches[1], base64: matches[2] });
          setImagePreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const updateConfig = (index: number, field: keyof GenerationConfig, value: any) => {
    const newConfigs = [...configs];
    (newConfigs[index] as any)[field] = value;
    setConfigs(newConfigs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enabledConfigs = configs.filter(c => c.enabled);
    
    if (fileData && name && sellingPoints && enabledConfigs.length > 0) {
      onNext({
        name,
        sellingPoints,
        imageBase64: fileData.base64,
        mimeType: fileData.mimeType,
        targetLanguage,
        removeBackground,
        generationConfigs: configs
      });
    } else {
      if (enabledConfigs.length === 0) alert("请至少启用一种生成类型");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
      <h2 className="text-2xl font-bold mb-6 text-white">1. 上传商品详情</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Image */}
        <div className="lg:col-span-4 space-y-4">
          <label className="block text-sm font-medium text-slate-300">商品原图</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors aspect-square flex flex-col items-center justify-center ${
              imagePreview ? 'border-indigo-500 bg-slate-900' : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-700'
            }`}
          >
            {imagePreview ? (
              <div className="relative w-full h-full flex justify-center">
                <img src={imagePreview} alt="Preview" className="h-full object-contain rounded-md" />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity rounded-md">
                   <span className="text-white font-medium">更换图片</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadIcon />
                <p className="mt-2 text-sm text-slate-400">点击上传</p>
                <p className="text-xs text-slate-500">最大 5MB</p>
              </div>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="rm-bg"
              checked={removeBackground}
              onChange={(e) => setRemoveBackground(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-indigo-500"
            />
            <label htmlFor="rm-bg" className="text-sm text-slate-300">使用 AI 去除背景</label>
          </div>
        </div>

        {/* Right Col: Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300">商品名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="例如：人体工学办公椅"
              required
            />
          </div>

          {/* Selling Points */}
          <div>
            <label className="block text-sm font-medium text-slate-300">商品卖点 (AI 将自动转化为视觉画面)</label>
            <textarea
              rows={3}
              value={sellingPoints}
              onChange={(e) => setSellingPoints(e.target.value)}
              className="mt-1 block w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="例如：1. 防水（生成水珠场景） 2. 轻便（生成悬浮/羽毛场景）..."
              required
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <GlobeIcon /> 图片内文字语言 (营销图)
            </label>
            <div className="flex gap-4">
              {[{ code: 'en', label: '🇺🇸 EN' }, { code: 'ru', label: '🇷🇺 RU' }, { code: 'zh', label: '🇨🇳 ZH' }].map(lang => (
                <label key={lang.code} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="targetLang" 
                    checked={targetLanguage === lang.code} 
                    onChange={() => setTargetLanguage(lang.code as SupportedLanguage)}
                    className="accent-indigo-500"
                  />
                  <span className="text-sm text-slate-300">{lang.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700"></div>

          {/* Configs */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3"><ImageIcon /> 生成方案</label>
            <div className="space-y-3">
                  {configs.map((config, index) => (
                    <div 
                      key={config.type} 
                      className={`p-3 rounded-xl border transition-all ${
                        config.enabled 
                          ? 'bg-slate-800 border-indigo-500/50' 
                          : 'bg-slate-900/50 border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <input 
                            type="checkbox" 
                            checked={config.enabled} 
                            onChange={(e) => updateConfig(index, 'enabled', e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-700 text-indigo-600"
                          />
                          <span className={`text-sm font-medium ${config.enabled ? 'text-white' : 'text-slate-400'}`}>
                            {config.label}
                          </span>
                        </div>

                        {config.enabled && (
                          <div className="flex flex-1 items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">数量</span>
                              <div className="flex items-center bg-slate-900 rounded border border-slate-600">
                                <button type="button" onClick={() => config.count > 1 && updateConfig(index, 'count', config.count - 1)} className="px-2 text-slate-400 hover:text-white">-</button>
                                <span className="text-xs w-4 text-center">{config.count}</span>
                                <button type="button" onClick={() => config.count < 10 && updateConfig(index, 'count', config.count + 1)} className="px-2 text-slate-400 hover:text-white">+</button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">比例</span>
                              <select 
                                value={config.aspectRatio}
                                onChange={(e) => updateConfig(index, 'aspectRatio', e.target.value)}
                                className="bg-slate-900 border border-slate-600 rounded text-xs px-1 py-1 text-white outline-none"
                              >
                                <option value="1:1">1:1</option>
                                <option value="3:4">3:4</option>
                                <option value="4:3">4:3</option>
                                <option value="9:16">9:16</option>
                                <option value="16:9">16:9</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!fileData || !name || configs.filter(c => c.enabled).length === 0}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            开始智能分析
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
