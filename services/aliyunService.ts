import { ProductData } from "../types";

const ALIYUN_API_KEY = "sk-c58c447c55f542e79d4c814e5228be79";
// 使用 CORS 代理绕过浏览器的同源策略限制
// 注意：生产环境中建议使用自己的后端服务器转发请求
const API_URL = "https://corsproxy.io/?https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImageWithQwen = async (
  product: ProductData,
  prompt: string
): Promise<string> => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      // Construct Data URI strictly as required by Qwen example
      const dataUri = `data:${product.mimeType};base64,${product.imageBase64}`;

      const requestBody = {
        model: "qwen-image-edit-plus-2025-10-30",
        input: {
          messages: [
            {
              role: "user",
              content: [
                {
                  image: dataUri
                },
                {
                  text: `生成一张符合深度图的图像，遵循以下描述：${prompt}`
                }
              ]
            }
          ]
        },
        parameters: {
          n: 1,
          negative_prompt: "low quality, bad composition, deformed, ugly, blur, watermark, text",
          prompt_extend: true,
          watermark: false
        }
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ALIYUN_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      // Handle Rate Limiting (429)
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Qwen API Rate Limit (429) on attempt ${attempt}. Retrying...`, errorData);
        if (attempt === maxRetries) {
          throw new Error(`阿里云 API 请求过于频繁 (429)。请稍后再试。`);
        }
        // Exponential backoff: 2s, 4s, 8s
        await sleep(2000 * Math.pow(2, attempt - 1));
        continue;
      }

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          console.error("Qwen API Error Data:", JSON.stringify(errorData, null, 2));
          // 尝试提取更具体的错误信息
          errorMessage = errorData.message || errorData.code || errorMessage;
        } catch (e) {
          // 如果响应不是 JSON，忽略解析错误
        }
        throw new Error(`阿里云 API 请求失败 (${response.status}): ${errorMessage}`);
      }

      const data = await response.json();

      // 检查响应结构
      if (data.output && data.output.choices && data.output.choices.length > 0) {
          const choice = data.output.choices[0];
          // API 返回 content 数组，我们需要找到包含 image 的那一项
          if (choice.message && choice.message.content) {
              const imageContent = choice.message.content.find((c: any) => c.image);
              if (imageContent && imageContent.image) {
                  return imageContent.image;
              }
          }
      }
      
      console.warn("Unexpected API Response Structure:", data);
      throw new Error("API 响应格式异常，未找到图片 URL");

    } catch (error: any) {
      // If we still have retries and it's a fetch error (likely network), wait and retry
      if (attempt < maxRetries && (error.message === "Failed to fetch" || error.name === 'TypeError')) {
          console.warn(`Network error on attempt ${attempt}, retrying...`);
          await sleep(2000);
          continue;
      }

      console.error("Aliyun Generation Error:", error);
      // 针对网络错误的友好提示
      if (error.message === "Failed to fetch") {
          throw new Error("网络请求失败。可能是由于浏览器 CORS 限制，请检查网络或代理设置。");
      }
      throw error;
    }
  }

  throw new Error("Failed to generate image after multiple attempts.");
};
