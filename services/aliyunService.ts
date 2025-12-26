import { ProductData } from "../types";

// ============================================================================
// CONFIGURATION
// ============================================================================

// ⚠️ 请将此处替换为您部署的 qwen_proxy.php 的完整 URL
// 例如: "https://api.yourdomain.com/qwen_proxy.php"
const PHP_PROXY_URL = "https://live.fastbossshop.cn/qwen_proxy.php"; 

const ALIYUN_API_KEY = "sk-c58c447c55f542e79d4c814e5228be79";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImageWithQwen = async (
  product: ProductData,
  prompt: string
): Promise<string> => {
  const maxRetries = 3;
  let attempt = 0;

  // Determine Language Rule for Qwen
  let langRule = "";
  let negativeLang = "";
  
  if (product.targetLanguage === 'ru') {
      langRule = "IMPORTANT: Any text or labels generated in the background MUST be in RUSSIAN (Cyrillic).";
      negativeLang = "English text, latin characters, chinese characters, ";
  } else if (product.targetLanguage === 'zh') {
      langRule = "IMPORTANT: Any text generated MUST be in SIMPLIFIED CHINESE.";
      negativeLang = "English text, latin characters, russian characters, ";
  } else {
      langRule = "Text should be in English.";
  }

  // 强化 Prompt，强调保真度与语言
  const enhancedPrompt = `
  Task: E-commerce Product Background Replacement / Scene Generation.
  input_image: The provided image contains the REFERENCE PRODUCT.
  
  Strict Rules:
  1. KEEP the product subject EXACTLY as it is. Do NOT change logos, text, buttons, or colors on the product.
  2. The product must be placed logically (on a surface, not floating randomly).
  3. LANGUAGE CONSTRAINT: ${langRule}
  4. Generate the background based on this description: ${prompt}
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
          // 增加负面提示词，防止生成乱码、错误文字、畸变，以及错误的语言
          negative_prompt: `${negativeLang}text on product, wrong logo, altered product details, distorted, low quality, bad composition, watermark, messy background, floating objects, defying gravity, blurry`,
          prompt_extend: true,
          watermark: false
        }
      };

      // 直接 POST 请求到您的 PHP 代理
      // 代理脚本负责转发 header (Authorization) 和 body 到阿里云
      const response = await fetch(PHP_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ALIYUN_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 429) {
        console.warn("Qwen API Rate Limit (429), retrying...");
        if (attempt === maxRetries) throw new Error("API Limit Exceeded (429)");
        await sleep(2000 * Math.pow(2, attempt - 1));
        continue;
      }

      // 获取响应文本
      const responseText = await response.text();

      if (!response.ok) {
        // 如果 HTTP 状态码不是 2xx，抛出错误
        const cleanMsg = responseText.replace(/<[^>]+>/g, '').substring(0, 200);
        throw new Error(`API Error ${response.status}: ${cleanMsg}`);
      }

      let data;
      try {
        // 尝试解析 JSON
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // 解析失败，说明返回的不是 JSON（可能是 PHP 报错页面 HTML）
        console.error("Qwen Proxy Invalid JSON:", responseText);
        // 去除 HTML 标签，提取纯文本错误信息
        const cleanMsg = responseText
          .replace(/<br\s*\/?>/gi, '\n') // br 换行
          .replace(/<[^>]+>/g, '')       // 去除其他标签
          .replace(/\s+/g, ' ')          // 合并空白
          .trim()
          .substring(0, 300);            // 截取前300字符
        
        // 🚨 检测具体的 PHP Fatal Error
        if (cleanMsg.includes("getallheaders") || cleanMsg.includes("Fatal error")) {
           throw new Error(`PHP Configuration Error: ${cleanMsg} (请更新 qwen_proxy.php)`);
        }
        
        throw new Error(`Proxy Server Error: ${cleanMsg || "Invalid response format"}`);
      }

      // 检查 PHP 代理返回的 JSON 结构中的业务错误
      if (data.error) {
         throw new Error(`Proxy Error: ${data.message || data.error}`);
      }
      
      if (data.code && data.code !== "") {
         // 阿里云业务级错误 (如 Arrearage, InvalidParameter)
         throw new Error(`Qwen Logic Error: ${data.code} - ${data.message}`);
      }

      if (data.output?.choices?.[0]?.message?.content) {
          const imageContent = data.output.choices[0].message.content.find((c: any) => c.image);
          if (imageContent?.image) {
              // 关键修复：使用 PHP 代理包裹图片 URL，解决前端显示的跨域(CORS)和 403 Forbidden 问题
              return `${PHP_PROXY_URL}?url=${encodeURIComponent(imageContent.image)}`;
          }
      }
      
      throw new Error("Invalid API Response Format: No image found");

    } catch (error: any) {
      console.error(`Qwen Attempt ${attempt} failed:`, error);
      
      // 如果是配置错误，不再重试
      if (error.message.includes("PHP Configuration Error")) {
          throw error;
      }

      if (attempt < maxRetries) {
          await sleep(2000); // 简单的等待重试
          continue;
      }
      throw new Error(`生成失败: ${error.message || "网络连通性问题"}`);
    }
  }

  throw new Error("Failed after multiple attempts");
};
