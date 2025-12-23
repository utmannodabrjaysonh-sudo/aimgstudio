import { ProductData } from "../types";

const ALIYUN_API_KEY = "sk-c58c447c55f542e79d4c814e5228be79";
const PRIMARY_PROXY = "https://live.fastbossshop.cn/proxy.php?url=";
const TARGET_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImageWithQwen = async (
  product: ProductData,
  prompt: string
): Promise<string> => {
  const maxRetries = 3;
  let attempt = 0;

  const proxyUrl = `${PRIMARY_PROXY}${encodeURIComponent(TARGET_API_URL)}`;

  // 强化 Prompt，强调保真度
  const enhancedPrompt = `
  Task: E-commerce Product Background Replacement / Scene Generation.
  input_image: The provided image contains the REFERENCE PRODUCT.
  
  Strict Rules:
  1. KEEP the product subject EXACTLY as it is. Do NOT change logos, text, buttons, or colors on the product.
  2. The product must be placed logically (on a surface, not floating randomly).
  3. Generate the background based on this description: ${prompt}
  `;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const dataUri = `data:${product.mimeType};base64,${product.imageBase64}`;

      const requestBody = {
        model: "qwen-image-edit-plus-2025-10-30",
        input: {
          messages: [
            {
              role: "user",
              content: [
                { image: dataUri },
                { text: enhancedPrompt }
              ]
            }
          ]
        },
        parameters: {
          n: 1,
          // 增加负面提示词，防止生成乱码、错误文字、畸变
          negative_prompt: "text on product, wrong logo, altered product details, distorted, low quality, bad composition, watermark, messy background, floating objects, defying gravity, blurry",
          prompt_extend: true,
          watermark: false
        }
      };

      const response = await fetch(proxyUrl, {
      //const response = await fetch(TARGET_API_URL, {
        method: "POST",
        credentials: "omit", // Fix for potential CORS blocking  TARGET_API_URL
        referrerPolicy: "no-referrer", // Security best practice
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ALIYUN_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 429) {
        if (attempt === maxRetries) throw new Error("API Limit Exceeded (429)");
        await sleep(2000 * Math.pow(2, attempt - 1));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText.substring(0, 100)}`);
      }

      const data = await response.json();

      if (data.output?.choices?.[0]?.message?.content) {
          const imageContent = data.output.choices[0].message.content.find((c: any) => c.image);
          if (imageContent?.image) return imageContent.image;
      }
      
      throw new Error("Invalid API Response Format");

    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
          await sleep(2000);
          continue;
      }
      throw new Error(`生成失败: ${error.message || "网络连通性问题"}`);
    }
  }

  throw new Error("Failed after multiple attempts");
};