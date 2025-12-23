import React, { useState } from 'react';
import { ProductData, ScrapedData, GenerationConfig, SupportedLanguage } from '../types';
import { LinkIcon, GlobeIcon, ImageIcon, CheckIcon, MagicIcon, UploadIcon } from './Icons';
import { fetchProductFromUrl, convertUrlToBase64 } from '../services/scraperService';

interface UrlImportFormProps {
  onNext: (data: ProductData) => void;
}

const DEFAULT_CONFIGS: GenerationConfig[] = [
  { type: 'scene', label: '🏞 纯场景图', count: 2, aspectRatio: '1:1', enabled: true },
  { type: 'marketing', label: '📊 营销卖点图 (带文字)', count: 1, aspectRatio: '3:4', enabled: false },
  { type: 'aplus', label: '📑 A+ 详情长图', count: 1, aspectRatio: '9:16', enabled: false },
];

const UrlImportForm: React.FC<UrlImportFormProps> = ({ onNext }) => {
  // Step 1: URL Input
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);

  // Step 2: Configuration
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [name, setName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('en'); 
  const [removeBackground, setRemoveBackground] = useState(false);
  const [configs, setConfigs] = useState<GenerationConfig[]>(DEFAULT_CONFIGS);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    
    try {
      const data = await fetchProductFromUrl(url);
      
      // If no images found (e.g. captcha blocked everything), alert user
      if (!data.images || data.images.length === 0) {
        alert("未能获取到商品图片。该链接可能受到平台保护，建议您直接使用“上传商品图”功能。");
        // Optionally allow them to proceed if they paste an image URL manually, 
        // but for now let's just keep them on the URL step so they can try another link.
        return; 
      }

      setScrapedData(data);
      setName(data.title);
      setSellingPoints(data.description);
    } catch (error: any) {
      alert("解析失败，请检查链接或网络，或尝试“上传商品图”功能。");
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (index: number, field: keyof GenerationConfig, value: any) => {
    const newConfigs = [...configs];
    (newConfigs[index] as any)[field] = value;
    setConfigs(newConfigs);
  };

  const handleProcess = async () => {
    if (!scrapedData) return;
    
    const enabledConfigs = configs.filter(c => c.enabled);
    if (enabledConfigs.length === 0) {
      alert("请至少选择一种生成类型！");
      return;
    }

    setIsLoading(true);
    try {
      const imageUrl = scrapedData.images[selectedImageIndex];
      const { base64, mimeType } = await convertUrlToBase64(imageUrl);

      onNext({
        name,
        sellingPoints,
        imageBase64: base64,
        mimeType,
        sourceUrl: url,
        targetLanguage,
        removeBackground,
        generationConfigs: configs
      });
    } catch (error) {
      alert("图片下载失败。建议右键保存图片后，使用“上传商品图”模式手动上传。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 animate-fade-in">
      
      {/* Step 1: Input URL */}
      {!scrapedData && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
            <LinkIcon /> 输入商品链接
          </h2>
          <form onSubmit={handleFetch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                支持 1688 / Wildberries / Ozon 等平台链接
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://detail.1688.com/offer/..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-4 py-3 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                <div className="absolute left-4 top-3.5 text-slate-500">
                  <GlobeIcon />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !url}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  解析中...
                </span>
              ) : (
                "智能解析商品"
              )}
            </button>
            
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 text-xs text-slate-400">
               <p className="font-bold mb-1 text-slate-300">💡 提示：</p>
               部分跨境平台 (1688, Wildberries) 有极严格的反爬虫验证。<br/>
               如果解析一直失败，请直接使用顶部的 <b>“上传商品图”</b> 选项手动操作。
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Configure & Select */}
      {scrapedData && (
        <div className="space-y-8">
          <div className="flex justify-between items-start border-b border-slate-700 pb-4">
             <h2 className="text-xl font-bold text-white">确认配置</h2>
             <button onClick={() => setScrapedData(null)} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
               <UploadIcon /> 重新输入链接
             </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Image Selection (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <label className="block text-sm font-medium text-slate-300">1. 选择主图</label>
              <div className="aspect-square w-full bg-slate-900 rounded-lg overflow-hidden border-2 border-indigo-500 relative shadow-inner">
                 <img 
                   src={scrapedData.images[selectedImageIndex]} 
                   alt="Main Selected" 
                   className="w-full h-full object-contain"
                 />
                 <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow">
                   已选
                 </div>
              </div>
              {scrapedData.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {scrapedData.images.slice(0, 8).map((img, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`aspect-square rounded cursor-pointer overflow-hidden border-2 transition-all ${
                          selectedImageIndex === idx ? 'border-indigo-500 opacity-100 ring-2 ring-indigo-500/50' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
              )}
              
              <div 
                onClick={() => setRemoveBackground(!removeBackground)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  removeBackground ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-900 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                   <MagicIcon />
                   <span className="text-sm font-medium text-slate-200">AI 智能抠出主体</span>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${removeBackground ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500'}`}>
                  {removeBackground && <CheckIcon />}
                </div>
              </div>
            </div>

            {/* Right: Details & Config (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Product Info */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">商品标题</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">核心卖点 / 描述</label>
                  <textarea
                    rows={3}
                    value={sellingPoints}
                    onChange={(e) => setSellingPoints(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                
                 {/* Language Selection */}
                 <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <GlobeIcon /> 生成图中的文案语言 (仅对营销图有效)
                  </label>
                  <div className="flex gap-4">
                    {[
                      { code: 'en', label: '🇺🇸 English' },
                      { code: 'ru', label: '🇷🇺 Русский' },
                      { code: 'zh', label: '🇨🇳 中文' }
                    ].map(lang => (
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
              </div>

              <div className="border-t border-slate-700 my-2"></div>

              {/* Multi-Type Generation Config */}
              <div>
                <h3 className="text-md font-bold text-white mb-3 flex items-center gap-2">
                  <ImageIcon /> 生成策略配置
                </h3>
                <div className="space-y-3">
                  {configs.map((config, index) => (
                    <div 
                      key={config.type} 
                      className={`p-4 rounded-xl border transition-all ${
                        config.enabled 
                          ? 'bg-slate-800 border-indigo-500/50 ring-1 ring-indigo-500/20' 
                          : 'bg-slate-900/50 border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        {/* Checkbox & Label */}
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <input 
                            type="checkbox" 
                            checked={config.enabled} 
                            onChange={(e) => updateConfig(index, 'enabled', e.target.checked)}
                            className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={`font-medium ${config.enabled ? 'text-white' : 'text-slate-400'}`}>
                            {config.label}
                          </span>
                        </div>

                        {/* Controls (Only visible if enabled) */}
                        {config.enabled && (
                          <div className="flex flex-1 items-center gap-4 flex-wrap animate-fade-in">
                            {/* Quantity */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">数量</span>
                              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-600">
                                <button 
                                  onClick={() => config.count > 1 && updateConfig(index, 'count', config.count - 1)}
                                  className="px-2 py-1 text-slate-400 hover:text-white"
                                >-</button>
                                <span className="text-sm font-medium w-6 text-center">{config.count}</span>
                                <button 
                                  onClick={() => config.count < 10 && updateConfig(index, 'count', config.count + 1)}
                                  className="px-2 py-1 text-slate-400 hover:text-white"
                                >+</button>
                              </div>
                            </div>

                            {/* Aspect Ratio */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">比例</span>
                              <select 
                                value={config.aspectRatio}
                                onChange={(e) => updateConfig(index, 'aspectRatio', e.target.value)}
                                className="bg-slate-900 border border-slate-600 rounded-lg text-xs px-2 py-1.5 text-white outline-none focus:border-indigo-500"
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
                onClick={handleProcess}
                disabled={isLoading || configs.filter(c => c.enabled).length === 0}
                className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transform transition-all hover:scale-[1.01] active:scale-[0.99] flex justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "正在规划任务..." : "开始一站式生成"}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlImportForm;