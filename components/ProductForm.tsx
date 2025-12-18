import React, { useRef, useState } from 'react';
import { ProductData } from '../types';
import { UploadIcon } from './Icons';

interface ProductFormProps {
  onNext: (data: ProductData) => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ onNext }) => {
  const [name, setName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [generateCount, setGenerateCount] = useState<number>(4);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileData && name && sellingPoints) {
      onNext({
        name,
        sellingPoints,
        imageBase64: fileData.base64,
        mimeType: fileData.mimeType,
        generateCount
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
      <h2 className="text-2xl font-bold mb-6 text-white">1. 商品详情</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">商品原图</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              imagePreview ? 'border-indigo-500 bg-slate-900' : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-700'
            }`}
          >
            {imagePreview ? (
              <div className="relative h-48 w-full flex justify-center">
                <img src={imagePreview} alt="Preview" className="h-full object-contain rounded-md" />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity rounded-md">
                   <span className="text-white font-medium">更换图片</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadIcon />
                <p className="mt-2 text-sm text-slate-400">点击上传或拖拽图片到此处</p>
                <p className="text-xs text-slate-500">支持 PNG, JPG (最大 5MB)</p>
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
        </div>

        {/* Product Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300">商品名称</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="例如：人体工学办公椅"
            required
          />
        </div>

        {/* Selling Points */}
        <div>
          <label htmlFor="points" className="block text-sm font-medium text-slate-300">商品卖点</label>
          <textarea
            id="points"
            rows={3}
            value={sellingPoints}
            onChange={(e) => setSellingPoints(e.target.value)}
            className="mt-1 block w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            placeholder="例如：透气网布，腰部支撑，现代设计，时尚黑色..."
            required
          />
        </div>

        {/* Generate Count Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="count" className="block text-sm font-medium text-slate-300">生成场景数量</label>
            <span className="text-indigo-400 font-bold text-lg">{generateCount} 张</span>
          </div>
          <input 
            type="range" 
            id="count" 
            min="1" 
            max="10" 
            value={generateCount} 
            onChange={(e) => setGenerateCount(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!fileData || !name || !sellingPoints}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          开始智能分析
        </button>
      </form>
    </div>
  );
};

export default ProductForm;
