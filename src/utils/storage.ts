import type { Bench } from '@/types';

/**
 * 档案存取层（localStorage）
 *
 * 只负责本地持久化：包括被合并的记录在内的全部档案都原样保存，
 * 不在此处做合并/过滤。合并规则见 src/utils/mergeRules.ts，
 * 展示与交互见页面与组件目录。
 */
const STORAGE_KEY = 'bench-archive-data';

export function loadBenches(): Bench[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load benches from localStorage:', error);
  }
  return [];
}

export function saveBenches(benches: Bench[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(benches));
  } catch (error) {
    console.error('Failed to save benches to localStorage:', error);
  }
}

export function clearBenches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear benches from localStorage:', error);
  }
}
