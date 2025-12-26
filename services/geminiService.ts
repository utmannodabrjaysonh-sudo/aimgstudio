import { GoogleGenAI, Type } from "@google/genai";
import { ProductData, ScenePrompt, ScrapedData, OutputType } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrapper to handle Gemini API flakiness (503, 500 RPC errors)
 */
const generateWithRetry = async (params: any, retries = 4, baseDelay = 2000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      lastError = error;
      const code = error.status || error.code;
      const msg = error.message || "";
      
      // Retry conditions:
      // 503: Service Unavailable (Overloaded)
      // 500: Internal Error / RPC Failed (Network/XHR)
      // 429: Too Many Requests (Rate Limit)
      const isRetryable = 
        code === 503 || 
        code === 500 || 
        code === 429 || 
        msg.includes("unavailable") || 
        msg.includes("Rpc failed") ||
        msg.includes("fetch failed");

      if (!isRetryable) {
        throw error;
      }

      console.warn(`Gemini API Attempt ${i + 1}/${retries} failed (${code}): ${msg}. Retrying...`);
      
      if (i < retries - 1) {
        await sleep(baseDelay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  throw lastError;
};

interface CombinedAnalysisResult {
  analysis: string;
  scenes: ScenePrompt[];
}

/**
 * 解析网页 HTML 提取商品信息
 */
export const parseProductHtml = async (htmlContent: string, originalUrl: string): Promise<ScrapedData> => {
  try {
    const truncatedHtml = htmlContent.length > 100000 
      ? htmlContent.substring(0, 100000) 
      : htmlContent;

    const response = await generateWithRetry({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            text: `You are an intelligent web scraper.
            
            Task: Extract product information from the provided HTML source code.
            Source URL: ${originalUrl}

            Look for:
            1. Title (title tag, og:title, h1)
            2. Description/Selling Points (meta description, og:description, product summary)
            3. Product Images (og:image, json-ld image, main img tags). **Find at least 3 high-res images.**

            Rules:
            - Prioritize Open Graph (og:*) tags and JSON-LD schema.
            - Clean up the text (remove html tags, extra whitespace).
            - For images, return absolute URLs.
            - If you cannot find specific data, make a best guess.
            
            Input HTML (Truncated):
            ${truncatedHtml}
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            images: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "images"]
        }
      }
    });

    const jsonStr = response.text || "{}";
    const result = JSON.parse(jsonStr);

    return {
      title: result.title || "未知商品",
      description: result.description || "暂无描述",
      images: result.images && result.images.length > 0 ? result.images : []
    };

  } catch (error) {
    console.error("Gemini HTML Parse Error:", error);
    throw new Error("AI 解析网页失败");
  }
};

/**
 * 一站式分析与场景规划 (深度优化版 - 电商功能图风格)
 */
export const analyzeAndDraftScenes = async (product: ProductData): Promise<CombinedAnalysisResult> => {
  try {
    const langCode = product.targetLanguage || 'en';
    
    // Map code to English instruction for the prompt
    let langName = "English";
    let langInstruction = "Ensure all text is in English.";
    
    if (langCode === 'zh') {
        langName = "Simplified Chinese (简体中文)";
        langInstruction = "Strictly use Chinese characters for any text/labels.";
    }
    if (langCode === 'ru') {
        langName = "Russian (Cyrillic)";
        langInstruction = "CRITICAL: TRANSLATE specific keywords into Russian (Cyrillic). Do NOT use English text.";
    }

    const enabledConfigs = product.generationConfigs.filter(c => c.enabled);
    
    let taskInstructions = "";
    enabledConfigs.forEach((cfg, index) => {
        let typeDesc = "";
        switch (cfg.type) {
            case 'scene': 
              typeDesc = `
              Type: LIFESTYLE SCENE (Background Only).
              Goal: Show the product being used naturally.
              Style: Soft lighting, shallow depth of field (blurred background).
              Text Rule: NO TEXT allowed in background.
              `; 
              break;
            case 'marketing': 
              typeDesc = `
              Type: AMAZON LISTING INFOGRAPHIC (FUNCTIONAL).
              Goal: Educate the buyer about specific features using GRAPHIC OVERLAYS.
              Style: Professional E-commerce Listing Image.
              Structure Options (Choose one per prompt):
                1. "Zoom Bubble": Main shot + 1 or 2 Circular "Magnifying Glass" insets showing a close-up texture or button.
                2. "Icon List": Product on one side + A vertical column on the other side containing 3 small vector icons + short text labels.
                3. "Split Layout": 60% Product Usage Shot / 40% Solid Color Block with a Big Header Text and bullet points.
              Text Rule: MANDATORY. Render specific feature labels (e.g. "Heat", "Soft", "Silent") in ${langName}. 
              **IMPORTANT**: You must TRANSLATE the feature keywords into ${langName} and include the translated word explicitly in the prompt (e.g., "text label saying 'ТЕПЛО'").
              `; 
              break;
            case 'aplus': 
              typeDesc = `
              Type: STRUCTURED PRODUCT BREAKDOWN.
              Goal: Show dimensions, layers, or comparison.
              Style: Clean Studio White/Grey background with floating elements.
              Composition: "Exploded View" (parts floating apart) OR "Dimensions" (arrows indicating width/height).
              Text Rule: Render clear numeric labels or feature names in ${langName}.
              `; 
              break;
        }
        taskInstructions += `\n   - Batch ${index + 1}: Generate ${cfg.count} unique prompts for type '${cfg.type}' (${typeDesc}). Aspect Ratio: ${cfg.aspectRatio}.`;
    });

    let bgInstruction = "";
    if (product.removeBackground) {
      bgInstruction = "IMPORTANT: The user wants to replace the background entirely. The prompt must describe a FULL environment.";
    }

    const response = await generateWithRetry({
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
            text: `Role: Amazon/E-commerce Listing Image Expert.
            
            Product Name: ${product.name}
            Selling Points: ${product.sellingPoints}
            Target Audience: Online Shoppers (They need info, not just art).
            Target Language: ${langName} (${langInstruction})
            
            ${bgInstruction}

            ** MISSION **
            Create prompts for High-Conversion Listing Images.
            
            ** STEP 1: FEATURE EXTRACTION **
            Identify 1-3 concrete features.
            
            ** STEP 2: LANGUAGE LOCALIZATION (CRITICAL) **
            If the target language is NOT English, you MUST translate the identified features into ${langName} NOW.
            The generated prompt must explicitly say: "text label reading '${langName}_WORD'".
            
            ** STEP 3: VISUALIZATION STRATEGY **
            - **Zoom In**: If the point is "Material", prompt for a "Circular Zoom Bubble" overlay.
            - **Icons**: If the point is "Modes", prompt for "Side column with vector icons".

            ** STEP 4: GENERATE PROMPTS **
            Generate prompts that explicitly describe the LAYOUT, GRAPHIC ELEMENTS, and EXACT TEXT to render.
            
            ** CRITICAL RULES **
            1. **MARKETING = INFOGRAPHIC**: The prompt must ask for "Graphic overlays", "Zoom bubbles", "Icons", or "Split screen".
            2. **FONTS**: Ask for "Sans-serif UI font", "Clean label text".
            3. **LANGUAGE**: ENSURE the prompt explicitly contains the ${langName} words to be rendered. Do not just say "Russian text", say "text label saying 'Тепло'".

            Requested Batches:
            ${taskInstructions}

            Output format (JSON):
            {
              "analysis": "Brief analysis in Chinese...",
              "scenes": [
                {
                  "en": "Full detailed prompt including layout instructions AND specific translated text labels...",
                  "zh": "Short Chinese Title (e.g. '核心卖点-气泡放大图')",
                  "type": "scene" | "marketing" | "aplus",
                  "aspectRatio": "1:1" | "3:4" | "4:3" | "9:16" | "16:9"
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
            analysis: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  zh: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["scene", "marketing", "aplus"] },
                  aspectRatio: { type: Type.STRING }
                },
                required: ["en", "zh", "type", "aspectRatio"]
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
      analysis: result.analysis || "分析完成",
      scenes: result.scenes || []
    };

  } catch (error) {
    console.error("Combined Analysis Error:", error);
    return {
      analysis: "系统繁忙，切换至基础模式。",
      scenes: [
        { en: "Product on a clean white table, soft window light, realistic 4k photography.", zh: "简约桌面实拍", type: 'scene', aspectRatio: '1:1' },
      ]
    };
  }
};

/**
 * 使用英文提示词生成最终图片 (增强电商信息图感)
 */
export const generateMarketingImage = async (
  product: ProductData,
  scenePromptEn: string,
  aspectRatio: string
): Promise<string> => {
  try {
    let langName = "English";
    let textRule = "Text should be in English.";
    
    if (product.targetLanguage === 'zh') {
        langName = "Simplified Chinese";
        textRule = "STRICT REQUIREMENT: All generated text/labels MUST be in SIMPLIFIED CHINESE CHARACTERS. No English.";
    } else if (product.targetLanguage === 'ru') {
        langName = "Russian";
        textRule = "STRICT REQUIREMENT: All generated text/labels MUST be in RUSSIAN (CYRILLIC). Do NOT use English text.";
    }

    const response = await generateWithRetry({
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
            text: `Generate an Amazon-style Product Listing Image.
            
            ** INPUT **: The provided image is the REFERENCE PRODUCT.
            
            ** STRICT CONSTRAINTS **:
            1. **PRODUCT FIDELITY**: Keep the product EXACTLY as is.
            2. **STYLE**: "E-commerce Infographic". Clean, Professional.
            3. **LAYOUT**: Follow the prompt's layout instructions (e.g. Zoom Bubbles, Split Screen).
            
            ** TEXT / LANGUAGE RULE (CRITICAL) **:
            ${textRule}
            The prompt below contains specific words in ${langName}. Render them accurately.
            
            ** SCENE PROMPT **: ${scenePromptEn}
            
            ${product.removeBackground ? 'Action: Extract the product cleanly and place it in the new environment.' : 'Action: Blend the product naturally.'}
            `
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1"
        }
      }
    }, 5, 2000); // 5 retries for image generation, starting with 2s delay

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};
