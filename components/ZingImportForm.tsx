import React, { useState, useEffect } from 'react';
import { ProductData, GenerationConfig, SupportedLanguage, ZingProductListItem, ZingProductDetail } from '../types';
import { LinkIcon, GlobeIcon, ImageIcon, CheckIcon, MagicIcon, UploadIcon, RefreshIcon } from './Icons';
import { fetchZingList, fetchZingDetail, parseZingString } from '../services/zingService';
import { convertUrlToBase64 } from '../services/scraperService';

interface ZingImportFormProps {
  onNext: (data: ProductData) => void;
}

const DEFAULT_CONFIGS: GenerationConfig[] = [
  { type: 'scene', label: '🏞 纯场景图', count: 2, aspectRatio: '1:1', enabled: true },
  { type: 'marketing', label: '📊 营销卖点图 (带文字)', count: 1, aspectRatio: '3:4', enabled: false },
  { type: 'aplus', label: '📑 A+ 详情长图', count: 1, aspectRatio: '9:16', enabled: false },
];

const ZingImportForm: React.FC<ZingImportFormProps> = ({ onNext }) => {
  // Mode: 'list' (browsing) or 'detail' (configuring)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [inputMode, setInputMode] = useState<'browse' | 'id'>('browse'); // Browse list or Enter ID
  
  // Data State
  const [productList, setProductList] = useState<ZingProductListItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ZingProductDetail | null>(null);
  const [inputId, setInputId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Configuration State
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [name, setName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('en'); 
  const [removeBackground, setRemoveBackground] = useState(false);
  const [configs, setConfigs] = useState<GenerationConfig[]>(DEFAULT_CONFIGS);

  // Initial Load
  useEffect(() => {
    if (inputMode === 'browse' && productList.length === 0) {
      loadList();
    }
  }, [inputMode]);

  const loadList = async () => {
    setIsLoading(true);
    try {
      const list = await fetchZingList(1, 60); // Fetch first page
      setProductList(list);
    } catch (e) {
      alert("加载商品列表失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchById = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputId) return;
    
    setIsLoading(true);
    try {
      const detail = await fetchZingDetail(Number(inputId));
      if (detail) {
        setupDetailView(detail);
      } else {
        alert("未找到该 ID 的商品");
      }
    } catch (err) {
      alert("查询失败，请检查 ID");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromList = async (id: number) => {
    setIsLoading(true);
    try {
      const detail = await fetchZingDetail(id);
      if (detail) {
        setupDetailView(detail);
      }
    } catch (err) {
      alert("加载商品详情失败");
    } finally {
      setIsLoading(false);
    }
  };

  const setupDetailView = (detail: ZingProductDetail) => {
    setSelectedDetail(detail);
    
    // Parse JSON strings if necessary
    const rawTitle = parseZingString(detail.sale_title);
    const rawIntro = parseZingString(detail.sale_intro);
    
    setName(rawTitle || "未命名商品");
    // Clean up basic html/image tags from intro if present for selling points
    const cleanIntro = rawIntro.replace(/\[图片\d+\]/g, '').slice(0, 500); 
    setSellingPoints(cleanIntro || detail.sale_keys || "");
    
    setViewMode('detail');
  };

  const updateConfig = (index: number, field: keyof GenerationConfig, value: any) => {
    const newConfigs = [...configs];
    (newConfigs[index] as any)[field] = value;
    setConfigs(newConfigs);
  };

  const handleProcess = async () => {
    if (!selectedDetail) return;
    
    const enabledConfigs = configs.filter(c => c.enabled);
    if (enabledConfigs.length === 0) {
      alert("请至少选择一种生成类型！");
      return;
    }

    setIsLoading(true);
    try {
      const imageUrl = selectedDetail.sale_pic[selectedImageIndex];
      const { base64, mimeType } = await convertUrlToBase64(imageUrl);

      onNext({
        name,
        sellingPoints,
        imageBase64: base64,
        mimeType,
        sourceUrl: `zing:${selectedDetail.sale_id}`,
        targetLanguage,
        removeBackground,
        generationConfigs: configs
      });
    } catch (error) {
      alert("图片下载失败，请尝试手动上传该图片。");
    } finally {
      setIsLoading(false);
    }
  };

  // Back to list
  const handleBack = () => {
    setSelectedDetail(null);
    setViewMode('list');
  };

  if (viewMode === 'detail' && selectedDetail) {
    // =========================================================
    // DETAIL CONFIGURATION VIEW
    // =========================================================
    return (
      <div className="max-w-5xl mx-auto bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 animate-fade-in">
        <div className="flex justify-between items-start border-b border-slate-700 pb-4 mb-6">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <span className="text-indigo-400">#{selectedDetail.sale_id}</span> 选定商品配置
             </h2>
             <button onClick={handleBack} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
               <UploadIcon /> 返回列表
             </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Image Selection (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <label className="block text-sm font-medium text-slate-300">1. 选择用于生成的图片</label>
              <div className="aspect-square w-full bg-slate-900 rounded-lg overflow-hidden border-2 border-indigo-500 relative shadow-inner">
                 <img 
                   src={selectedDetail.sale_pic[selectedImageIndex]} 
                   alt="Main Selected" 
                   className="w-full h-full object-contain"
                 />
                 <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow">
                   已选
                 </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {selectedDetail.sale_pic.map((img, idx) => (
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
                        {config.enabled && (
                          <div className="flex flex-1 items-center gap-4 flex-wrap animate-fade-in">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">数量</span>
                              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-600">
                                <button onClick={() => config.count > 1 && updateConfig(index, 'count', config.count - 1)} className="px-2 py-1 text-slate-400 hover:text-white">-</button>
                                <span className="text-sm font-medium w-6 text-center">{config.count}</span>
                                <button onClick={() => config.count < 10 && updateConfig(index, 'count', config.count + 1)} className="px-2 py-1 text-slate-400 hover:text-white">+</button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">比例</span>
                              <select value={config.aspectRatio} onChange={(e) => updateConfig(index, 'aspectRatio', e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg text-xs px-2 py-1.5 text-white outline-none focus:border-indigo-500">
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
    );
  }

  // =========================================================
  // LIST / SEARCH VIEW
  // =========================================================
  return (
    <div className="max-w-6xl mx-auto bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 animate-fade-in min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
           <LinkIcon /> 智赢商品解析
        </h2>
        
        {/* Toggle Mode */}
        <div className="flex bg-slate-900 rounded-lg p-1">
           <button 
             onClick={() => setInputMode('browse')} 
             className={`px-4 py-2 rounded-md text-sm transition-all ${inputMode === 'browse' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
           >
             商品列表
           </button>
           <button 
             onClick={() => setInputMode('id')} 
             className={`px-4 py-2 rounded-md text-sm transition-all ${inputMode === 'id' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
           >
             ID 搜索
           </button>
        </div>
      </div>

      {inputMode === 'id' ? (
        <div className="max-w-xl mx-auto py-12">
            <form onSubmit={handleFetchById} className="space-y-4">
               <label className="block text-sm font-medium text-slate-300">输入智赢商品 ID</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={inputId}
                   onChange={(e) => setInputId(e.target.value)}
                   placeholder="例如: 565281266"
                   className="flex-1 rounded-lg bg-slate-900 border border-slate-600 text-white px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
                 <button 
                   type="submit"
                   disabled={isLoading || !inputId}
                   className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                 >
                   {isLoading ? '查询中...' : '解析'}
                 </button>
               </div>
               <p className="text-xs text-slate-500">直接输入 ID 可获取商品详情和原图列表。</p>
            </form>
        </div>
      ) : (
        <>
           {isLoading && productList.length === 0 ? (
             <div className="flex justify-center py-20">
               <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
           ) : (
             <>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {productList.map(product => (
                    <div 
                      key={product.id} 
                      onClick={() => handleSelectFromList(product.id)}
                      className="group bg-slate-900 rounded-xl overflow-hidden cursor-pointer border border-slate-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
                    >
                       <div className="aspect-square relative overflow-hidden bg-slate-800">
                          <img 
                            src={product.thumb} 
                            alt={product.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <span className="text-white text-sm font-bold bg-indigo-600 px-3 py-1 rounded-full">点击解析</span>
                          </div>
                       </div>
                       <div className="p-3">
                          <h3 className="text-slate-200 text-sm font-medium line-clamp-2 h-10 mb-2" title={product.title}>
                             {product.title || "未命名商品"}
                          </h3>
                          <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-500">ID: {product.id}</span>
                             <span className="text-indigo-400 font-bold">{product.cost} {product.cur}</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
               
               <div className="mt-8 flex justify-center">
                 <button 
                   onClick={loadList}
                   className="flex items-center gap-2 text-slate-400 hover:text-white px-4 py-2 hover:bg-slate-700 rounded transition-colors"
                 >
                   <RefreshIcon /> 刷新列表
                 </button>
               </div>
             </>
           )}
        </>
      )}
    </div>
  );
};

export default ZingImportForm;
