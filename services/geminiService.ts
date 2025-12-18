import { GoogleGenAI, Type } from "@google/genai";
import { ProductData, ScenePrompt } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

/**
 * 分析上传的产品图片（中文输出）
 */
export const analyzeProductImage = async (product: ProductData): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: product.mimeType,
              data: product.imageBase64
            }
          },
          {
            text: `请从电商视觉营销的角度分析这张产品图。
            产品名称: ${product.name}
            产品卖点: ${product.sellingPoints}
            
            请提供简明扼要的视觉描述，重点关注材质、颜色、光照需求和透视角度。
            请用中文回答。`
          }
        ]
      }
    });
    return response.text || "图片分析失败。";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("无法分析产品图片。");
  }
};

/**
 * 生成双语场景提示词
 */
export const generateScenePrompts = async (
  product: ProductData,
  analysis: string
): Promise<ScenePrompt[]> => {
  try {
    const count = product.generateCount || 4;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            text: `你是一位资深的电商摄影艺术总监。
            
            产品: ${product.name}
            卖点: ${product.sellingPoints}
            视觉分析: ${analysis}

            请构思 ${count} 个截然不同的场景提示词来展示该产品。
            每个场景都应突出卖点，并适合高端营销活动。
            重点描述背景、光影和氛围，尽量避免出现人物，以确保过审和焦点在产品上。
            
            重要要求：
            1. 生成英文提示词 (en) 用于AI生图，不要包含产品名称，仅用 "the product" 或 "the item" 代替。提示词应为描述性语句，例如 "Product placed on a wooden table..."。
            2. 生成对应的中文场景描述 (zh) 用于给用户预览。
            
            请严格输出 JSON 数组格式。`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              en: { type: Type.STRING, description: "Prompt in English for generation" },
              zh: { type: Type.STRING, description: "Description in Chinese for display" }
            },
            required: ["en", "zh"]
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Prompt Generation Error:", error);
    // Fallback if JSON parsing fails
    return [
      { en: "The product placed on a minimalist marble podium with soft morning sunlight.", zh: "极简大理石展台，柔和的晨光。" },
      { en: "The product sitting in a cozy lifestyle setting with warm blurred background.", zh: "温馨的生活场景，温暖的虚化背景。" }
    ];
  }
};

/**
 * 使用英文提示词生成最终图片
 */
export const generateMarketingImage = async (
  product: ProductData,
  scenePromptEn: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: product.mimeType,
              data: product.imageBase64
            }
          },
          {
            text: `Generate a high-quality product photograph.
            
            Input: Use the provided product image.
            Scene: ${scenePromptEn}
            
            Instructions:
            1. Place the product naturally into the described scene.
            2. Ensure realistic lighting, shadows, and reflections.
            3. Do not alter the product's appearance significantly, just its environment.
            4. Output ONLY the generated image.`
          }
        ]
      },
      config: {
        // Optional: Ensure no thinking budget is set for image models usually, 
        // but default config is fine.
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      // Check if text was returned instead (e.g. refusal)
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.warn("Model returned text:", part.text);
          throw new Error(`生成失败: AI 拒绝生成图片，提示: ${part.text}`);
        }
      }
    }
    
    // Check finish reason if possible/available in logs
    if (response.candidates && response.candidates[0].finishReason) {
       console.warn("Finish Reason:", response.candidates[0].finishReason);
       if (response.candidates[0].finishReason === 'SAFETY') {
         throw new Error("生成失败: 触发了安全过滤器，请尝试不同的图片或描述。");
       }
    }

    throw new Error("未能在响应中找到图像数据");

  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};
