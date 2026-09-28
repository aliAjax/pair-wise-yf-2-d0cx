import type { Bench, BenchExperience, MergedSource } from '@/types';

/**
 * 档案合并规则（纯逻辑层）
 *
 * 只负责合并规则的计算与校验，不依赖 React、store 或 localStorage。
 * 存取逻辑见 src/utils/storage.ts，交互界面见页面与组件目录。
 */

/** 一次最多可合并的疑似记录数量（含主档） */
export const MERGE_MAX_COUNT = 3;
/** 一次至少要选择的记录数量（含主档） */
export const MERGE_MIN_COUNT = 2;

/** 判断一条档案是否已经被合并过 */
export function isMergedBench(bench: Bench | undefined | null): boolean {
  return !!bench && !!bench.mergedIntoId;
}

/** 列表、地图、排行只展示未被合并的档案 */
export function getActiveBenches(benches: Bench[]): Bench[] {
  return benches.filter((bench) => !bench.mergedIntoId);
}

/**
 * 解析任意档案 id 当前应当指向的有效主档 id：
 * - 正常档案：返回自身 id
 * - 被合并档案：沿 mergedIntoId 链找到最终主档
 * - 主档已不存在或 id 找不到：返回 undefined
 */
export function resolveBenchId(benches: Bench[], id: string | undefined): string | undefined {
  if (!id) return undefined;
  const visited = new Set<string>();
  let currentId: string | undefined = id;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const bench = benches.find((item) => item.id === currentId);
    if (!bench) return undefined;
    if (!bench.mergedIntoId) return bench.id;
    currentId = bench.mergedIntoId;
  }
  return undefined;
}

export interface MergeValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * 校验一次合并选择是否合法。
 * 混入已合并记录、选了不存在的记录、主档无效或数量不符都要拒绝。
 */
export function validateMergeSelection(
  benches: Bench[],
  selectedIds: string[],
  masterId: string,
): MergeValidationResult {
  if (selectedIds.length < MERGE_MIN_COUNT || selectedIds.length > MERGE_MAX_COUNT) {
    return {
      ok: false,
      error: `请选择 ${MERGE_MIN_COUNT} 到 ${MERGE_MAX_COUNT} 条疑似重复记录`,
    };
  }

  if (new Set(selectedIds).size !== selectedIds.length) {
    return { ok: false, error: '选择中存在重复记录' };
  }

  if (!selectedIds.includes(masterId)) {
    return { ok: false, error: '主档必须是所选记录之一' };
  }

  const selectedBenches = selectedIds.map((sid) =>
    benches.find((bench) => bench.id === sid),
  );

  if (selectedBenches.some((bench) => bench === undefined)) {
    return { ok: false, error: '部分记录不存在，无法合并' };
  }

  const mergedOne = selectedBenches.find((bench) => isMergedBench(bench));
  if (mergedOne) {
    return {
      ok: false,
      error: `「${mergedOne.name}」已被合并，不能再次参与合并`,
    };
  }

  const master = benches.find((bench) => bench.id === masterId);
  if (!master || isMergedBench(master)) {
    return { ok: false, error: '所选主档无效，无法合并' };
  }

  return { ok: true };
}

/**
 * 按原顺序拼接体验，重复编号只保留一条。
 * 顺序：主档的体验在前（保持各自原有顺序），随后依次是各被并档案的体验；
 * 已出现过的体验 id 跳过。
 */
export function dedupeExperiences(
  master: Bench,
  others: Bench[],
): BenchExperience[] {
  const merged: BenchExperience[] = [];
  const seenIds = new Set<string>();

  const append = (experiences: BenchExperience[]) => {
    experiences.forEach((experience) => {
      if (!seenIds.has(experience.id)) {
        seenIds.add(experience.id);
        merged.push(experience);
      }
    });
  };

  append(master.experiences);
  others.forEach((bench) => append(bench.experiences));

  return merged;
}

/**
 * 合并后的评分规则：
 * - 合并后只要有体验，评分取全部体验评分的平均值并保留一位小数；
 * - 没有体验时才沿用主档评分。
 */
export function mergeExperiencesRating(
  master: Bench,
  mergedExperiences: BenchExperience[],
): number {
  if (mergedExperiences.length === 0) {
    return roundToOneDecimal(master.rating);
  }
  const total = mergedExperiences.reduce((sum, exp) => sum + exp.rating, 0);
  return roundToOneDecimal(total / mergedExperiences.length);
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface MergePatch {
  masterUpdate: Partial<Bench>;
  mergedIds: string[];
  sources: MergedSource[];
}

/**
 * 计算一次合并的结果（纯数据，不产生时间以外的副作用）。
 * 调用方应先用 validateMergeSelection 校验。
 */
export function buildMergePatch(
  benches: Bench[],
  selectedIds: string[],
  masterId: string,
  mergedAt: string,
): MergePatch | null {
  const validation = validateMergeSelection(benches, selectedIds, masterId);
  if (!validation.ok) return null;

  const master = benches.find((bench) => bench.id === masterId);
  if (!master) return null;

  const others = selectedIds
    .filter((sid) => sid !== masterId)
    .map((sid) => benches.find((bench) => bench.id === sid))
    .filter((bench): bench is Bench => bench !== undefined);

  const mergedExperiences = dedupeExperiences(master, others);
  const rating = mergeExperiencesRating(master, mergedExperiences);

  const newSources: MergedSource[] = others.map((bench) => ({
    id: bench.id,
    name: bench.name,
    location: bench.location,
    mergedAt,
  }));

  return {
    masterUpdate: {
      experiences: mergedExperiences.map((experience) =>
        experience.benchId === masterId
          ? experience
          : { ...experience, benchId: masterId },
      ),
      rating,
      mergedSources: [...(master.mergedSources ?? []), ...newSources],
      updatedAt: mergedAt,
    },
    mergedIds: others.map((bench) => bench.id),
    sources: newSources,
  };
}
