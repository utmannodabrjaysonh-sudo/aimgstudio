export interface ProductData {
  name: string;
  sellingPoints: string;
  imageBase64: string;
  mimeType: string;
  generateCount: number;
  aspectRatio: AspectRatio; // Added aspect ratio selection
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface AnalysisResult {
  description: string;
  visualAttributes: string;
}

export interface ScenePrompt {
  en: string; // Used for generation
  zh: string; // Used for display
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
