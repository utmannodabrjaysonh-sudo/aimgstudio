import { GoogleGenAI, Type } from "@google/genai";
import { ProductData, ScenePrompt } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

interface CombinedAnalysisResult {
  analysis: string;
  scenes: ScenePrompt[];
}

/**
 * 一站式分析与场景规划 (速度优化版)
 * 将分析和提示词生成合并为一个请求，大大减少等待时间
 */
export const analyzeAndDraftScenes = async (product: ProductData): Promise<CombinedAnalysisResult> => {
  try {
    const count = product.generateCount || 4;

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
            text: `你是一位顶级电商视觉营销总监。
            
            输入产品: ${product.name}
            商家卖点: ${product.sellingPoints}
            需生成数量: ${count} 个场景

            任务目标：
            1. 分析产品：简要分析产品的材质、适用人群及核心使用场景。
            2. 构思场景：生成 ${count} 个差异化的营销场景提示词。

            **关键策略（必须严格遵守）**：
            - **混合场景类型**：生成的场景必须包含 **50% 的“高质感纯展示”**（如大理石展台、自然光影、极简几何）和 **50% 的“沉浸式使用场景”**（如真实的生活环境、模特佩戴/使用、家居实景）。
            - **针对性优化**：
              - 如果是**穿戴类/按摩仪**：必须包含人物佩戴或使用的描述（如“佩戴在模特颈部”、“在舒适的客厅沙发上使用”）。
              - 如果是**家居类**：必须放入真实的装修环境中。
              - 不要回避人物，如果产品需要人来演示（如耳机、按摩器），请在提示词中包含人物描述（如 "model using the product", "hands holding the product"）。

            输出格式要求 (JSON)：
            {
              "analysis": "200字以内的中文视觉与人群分析",
              "scenes": [
                {
                  "en": "Detailed English prompt for image generation. Use 'the product' to refer to the item. Describe the subject (e.g. 'A model wearing the product') and environment in detail.",
                  "zh": "中文场景标题，简短有力，如‘温馨客厅-佩戴使用图’"
                }
              ]
            }
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING, description: "Product visual analysis in Chinese" },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  zh: { type: Type.STRING }
                },
                required: ["en", "zh"]
              }
            }
          },
          required: ["analysis", "scenes"]
        }
      }
    });

    const jsonStr = response.text || "{}";
    const result = JSON.parse(jsonStr);

    return {
      analysis: result.analysis || "分析完成。",
      scenes: result.scenes || []
    };

  } catch (error) {
    console.error("Combined Analysis Error:", error);
    // Fallback
    return {
      analysis: "产品分析暂不可用，但我们可以尝试生成通用场景。",
      scenes: [
        { en: "The product placed on a minimalist marble podium with soft morning sunlight.", zh: "极简大理石展台，柔和晨光" },
        { en: "The product in a cozy living room setting on a soft texture sofa.", zh: "温馨客厅沙发场景" },
        { en: "A model using the product in a lifestyle setting, blurred background.", zh: "模特生活化使用场景" },
        { en: "The product on a wooden table with nature elements like leaves and stones.", zh: "自然原木风" }
      ]
    };
  }
};

/**
 * 保持兼容性的旧方法（如果需要单独调用分析）
 */
export const analyzeProductImage = async (product: ProductData): Promise<string> => {
  const result = await analyzeAndDraftScenes(product);
  return result.analysis;
};

/**
 * 保持兼容性的旧方法
 */
export const generateScenePrompts = async (product: ProductData, analysis: string): Promise<ScenePrompt[]> => {
  // 如果已经有了 analysis，理论上可以只做生成，但为了复用上面的优化逻辑，我们直接调用混合接口
  const result = await analyzeAndDraftScenes(product);
  return result.scenes;
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
            text: `Generate a high-quality commercial product photograph.
            
            Input Image: Provided product image.
            Target Scene: ${scenePromptEn}
            
            Instructions:
            1. Seamlessly integrate the product into the scene.
            2. If the prompt implies usage (e.g., "model wearing it"), generate a realistic model interacting with the product.
            3. Ensure the product remains the clear focal point.
            4. Match lighting, shadows, and perspective perfectly.
            `
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: product.aspectRatio || "1:1"
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.warn("Model returned text:", part.text);
          throw new Error(`生成失败: AI 拒绝生成，提示: ${part.text}`);
        }
      }
    }
    
    throw new Error("未能在响应中找到图像数据");

  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};
