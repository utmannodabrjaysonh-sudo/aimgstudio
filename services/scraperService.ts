// ============================================================================
// Proxy Configuration
// ============================================================================
const PRIMARY_PROXY = "https://live.fastbossshop.cn/proxy.php?url=";
const BACKUP_PROXY = "https://corsproxy.io/?";

// Kept for compatibility with existing components if needed, though mostly unused now
export const fetchProductFromUrl = async (url: string): Promise<any> => {
   throw new Error("Legacy URL scraping is disabled. Use Zing Parse.");
};

export const convertUrlToBase64 = async (imageUrl: string): Promise<{ base64: string; mimeType: string }> => {
  try {
    let blob: Blob;

    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:(.+);base64,(.+)$/);
      if (matches) return { mimeType: matches[1], base64: matches[2] };
      throw new Error("Invalid Data URL");
    } else {
        // Strategy: Direct -> Primary Proxy -> Backup Proxy
        // Many OSS buckets (like oss.hzzying.com) might allow CORS directly, which is faster.
        // If not, we fall back to proxies.
        try {
            // Attempt 1: Direct fetch
            const response = await fetch(imageUrl, { credentials: 'omit', mode: 'cors' });
            if (!response.ok) throw new Error("Direct fetch status: " + response.status);
            blob = await response.blob();
        } catch (directError) {
            // console.warn("Direct fetch failed, trying primary proxy...", directError);
            try {
                // Attempt 2: Primary Proxy
                const proxyUrl = `${PRIMARY_PROXY}${encodeURIComponent(imageUrl)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error("Primary proxy status: " + response.status);
                blob = await response.blob();
            } catch (proxyError) {
                console.warn("Primary proxy failed, trying backup proxy...", proxyError);
                // Attempt 3: Backup Proxy
                const backupUrl = `${BACKUP_PROXY}${encodeURIComponent(imageUrl)}`;
                const response = await fetch(backupUrl);
                if (!response.ok) throw new Error("Backup proxy status: " + response.status);
                blob = await response.blob();
            }
        }
    }
    
    // Convert Blob to Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Handle both data:URL format and raw base64 depending on browser implementation
        const matches = result.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          resolve({ mimeType: matches[1], base64: matches[2] });
        } else {
          // Fallback if the regex doesn't match
          const base64Only = result.split(',')[1];
          const type = blob.type || 'image/jpeg';
          if (base64Only) resolve({ mimeType: type, base64: base64Only });
          else reject(new Error("Could not parse Base64 from blob"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });

  } catch (error: any) {
    console.error("Image fetch failed:", error);
    throw new Error(`图片下载失败，建议保存到本地后使用“上传商品图”功能。`);
  }
};