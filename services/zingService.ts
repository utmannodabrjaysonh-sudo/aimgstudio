import { ZingProductListItem, ZingProductDetail } from "../types";

const API_URL = "https://live.fastbossshop.cn/zing.php";

/**
 * Fetch Product List
 */
export const fetchZingList = async (page: number = 1, pageSize: number = 30): Promise<ZingProductListItem[]> => {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "sale.stat", page, pagesize: pageSize })
    });
    const json = await res.json();
    return json?.data?.list?.data || [];
  } catch (error) {
    console.error("Zing List Fetch Error:", error);
    throw new Error("无法获取商品列表");
  }
};

/**
 * Fetch Product Detail by ID
 */
export const fetchZingDetail = async (id: number): Promise<ZingProductDetail | null> => {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "sale.detail", id })
    });
    const json = await res.json();
    return json?.data?.root?.[0] || null;
  } catch (error) {
    console.error("Zing Detail Fetch Error:", error);
    throw new Error("无法获取商品详情");
  }
};

/**
 * Helper to clean JSON strings returned by Zing API (e.g., {"ru": "Title..."})
 */
export const parseZingString = (str: string): string => {
  if (!str) return "";
  try {
    // If it looks like JSON object
    if (str.trim().startsWith('{')) {
      const obj = JSON.parse(str);
      // Return the first value found (usually 'ru' or 'en')
      return Object.values(obj)[0] as string || str;
    }
    return str;
  } catch (e) {
    return str;
  }
};
