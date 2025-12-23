
export interface ProductData {
  name: string;
  sellingPoints: string;
  imageBase64: string;
  mimeType: string;
  // sourceUrl is optional for manual upload
  sourceUrl?: string;
  targetLanguage: SupportedLanguage;
  removeBackground: boolean;
  
  // New: Multiple generation configurations
  generationConfigs: GenerationConfig[];
}

export interface GenerationConfig {
  type: OutputType;
  label: string;
  count: number;
  aspectRatio: AspectRatio;
  enabled: boolean;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export type SupportedLanguage = 'zh' | 'en' | 'ru';
export type OutputType = 'scene' | 'marketing' | 'aplus';

export interface AnalysisResult {
  description: string;
  visualAttributes: string;
}

export interface ScenePrompt {
  en: string; // Used for generation (Always English)
  zh: string; // Used for display (User readable)
  type: OutputType; // Track which config generated this
  aspectRatio: AspectRatio; // Specific ratio for this scene
}

export interface GeneratedScene {
  id: string;
  prompt: ScenePrompt;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
}

export type ModelType = 'gemini-2.5-flash-image' | 'qwen-image-edit-plus-2025-10-30';

export enum AppStep {
  UPLOAD = 0,
  ANALYZING = 1,
  SCENE_SELECTION = 2,
  GENERATING = 3,
}

export interface ScrapedData {
  title: string;
  description: string;
  images: string[];
}

// --- Zing API Types ---
export interface ZingProductListItem {
  id: number;
  thumb: string;
  title: string;
  cur: string;
  cost: number;
}

export interface ZingProductDetail {
  sale_id: number;
  sale_title: string; // Often a JSON string
  sale_intro: string; // Often a JSON string
  sale_pic: string[]; // List of image URLs
  sale_keys?: string; // Keywords
}
