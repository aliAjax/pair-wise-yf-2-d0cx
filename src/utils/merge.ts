import type { Bench, BenchExperience, MergeSource } from '@/types';

/** 一次合并最多/最少可选记录数 */
export const MIN_MERGE_COUNT = 2;
export const MAX_MERGE_COUNT = 3;

export type MergeErrorCode =
  | 'INVALID_COUNT'
  | 'NOT_FOUND'
  | 'DUPLICATE_SELECTION'
  | 'ALREADY_MERGED'
  | 'PRIMARY_NOT_IN_SELECTION'
  | 'PRIMARY_MERGED';

export class MergeError extends Error {
  code: MergeErrorCode;
  constructor(code: MergeErrorCode, message: string) {
    super(message);
    this.name = 'MergeError';
    this.code = code;
  }
}

/** 已合并记录不参与列表、地图、排行 */
export function isMergedBench(bench: Bench | undefined | null): boolean {
  return !!bench?.mergedInto;
}

/** 保留一位小数 */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * 合并体验列表：
 * 按原顺序保留（主档在前，被合并记录按勾选顺序追加），
 * 同一时段（重复编号）只保留最先出现的一条；
 * 保留下来的体验 benchId 统一指向主档。
 */
export function mergeExperiences(
  groups: BenchExperience[][],
  primaryId: string,
): BenchExperience[] {
  const seenPeriods = new Set<BenchExperience['timePeriod']>();
  const merged: BenchExperience[] = [];

  groups.forEach((experiences) => {
    experiences.forEach((exp) => {
      if (seenPeriods.has(exp.timePeriod)) return;
      seenPeriods.add(exp.timePeriod);
      merged.push({ ...exp, benchId: primaryId });
    });
  });

  return merged;
}

/**
 * 合并后的评分：
 * 有体验时取全部体验评分的平均值并保留一位小数；
 * 没有体验时沿用主档评分。
 */
export function mergeRating(experiences: BenchExperience[], primary: Bench): number {
  if (experiences.length === 0) return primary.rating;
  const sum = experiences.reduce((acc, exp) => acc + exp.rating, 0);
  return roundToOneDecimal(sum / experiences.length);
}

export interface MergePlan {
  primary: Bench;
  sources: Bench[];
  mergedExperiences: BenchExperience[];
  mergedRating: number;
}

/**
 * 纯规则：根据全部记录、选中的 id 列表和主档 id，生成合并计划（不落库）。
 * 混入已合并记录、数量不合法等情况直接抛 MergeError，供页面提示。
 */
export function buildMergePlan(
  allBenches: Bench[],
  selectedIds: string[],
  primaryId: string,
): MergePlan {
  if (selectedIds.length < MIN_MERGE_COUNT || selectedIds.length > MAX_MERGE_COUNT) {
    throw new MergeError(
      'INVALID_COUNT',
      `请选择 ${MIN_MERGE_COUNT} 到 ${MAX_MERGE_COUNT} 张疑似重复记录`,
    );
  }

  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new MergeError('DUPLICATE_SELECTION', '选择中存在重复记录，请刷新后重试');
  }

  const selected = selectedIds.map((id) => {
    const bench = allBenches.find((b) => b.id === id);
    if (!bench) {
      throw new MergeError('NOT_FOUND', '部分记录不存在或已被删除');
    }
    return bench;
  });

  const mergedRecord = selected.find((b) => isMergedBench(b));
  if (mergedRecord) {
    throw new MergeError(
      'ALREADY_MERGED',
      `「${mergedRecord.name}」已经被合并过，不能再次参与合并`,
    );
  }

  const primary = selected.find((b) => b.id === primaryId);
  if (!primary) {
    throw new MergeError('PRIMARY_NOT_IN_SELECTION', '主档必须是所选记录之一');
  }
  if (isMergedBench(primary)) {
    throw new MergeError('PRIMARY_MERGED', '已合并记录不能作为主档');
  }

  const sources = selected.filter((b) => b.id !== primaryId);
  const mergedExperiences = mergeExperiences(
    [primary.experiences, ...sources.map((s) => s.experiences)],
    primary.id,
  );
  const mergedRating = mergeRating(mergedExperiences, primary);

  return { primary, sources, mergedExperiences, mergedRating };
}

/**
 * 纯规则：把合并计划应用到记录数组，返回新数组（不修改入参）。
 * - 主档：体验/评分更新，追加来源说明，刷新 updatedAt
 * - 被合并记录：打 mergedInto 标记，内容仍完整保留在本地
 * - 主档若已有来源（二次合并），沿用其既有来源，新来源去重后追加
 */
export function applyMergePlan(
  allBenches: Bench[],
  plan: MergePlan,
  now: string = new Date().toISOString(),
): Bench[] {
  const sourceIds = new Set(plan.sources.map((s) => s.id));

  const newSourceEntries: MergeSource[] = plan.sources.map((s) => ({
    benchId: s.id,
    name: s.name,
    location: s.location,
    mergedAt: now,
  }));

  // 主档可能此前已合并过其他记录，旧来源需要继续保留并说明
  const previousSources = plan.primary.mergeSources ?? [];
  const mergedSources = [
    ...previousSources,
    ...newSourceEntries.filter((entry) =>
      previousSources.every((old) => old.benchId !== entry.benchId),
    ),
  ];

  return allBenches.map((bench) => {
    if (bench.id === plan.primary.id) {
      return {
        ...bench,
        experiences: plan.mergedExperiences,
        rating: plan.mergedRating,
        mergeSources: mergedSources,
        updatedAt: now,
      };
    }

    if (sourceIds.has(bench.id)) {
      return {
        ...bench,
        mergedInto: {
          benchmarkId: plan.primary.id,
          benchmarkName: plan.primary.name,
          mergedAt: now,
        },
        updatedAt: now,
      };
    }

    return bench;
  });
}

export interface ResolvedBench {
  /** 最终应展示的主档；链路断裂（主档丢失）时为 undefined */
  bench?: Bench;
  /** 访问的 id 是否为已合并记录 */
  wasMerged: boolean;
  /** 触发跳转的那张已合并记录（用于“说明来源”提示） */
  sourceBench?: Bench;
}

/**
 * 解析旧链接：若 id 指向已合并记录，沿 mergedInto 找到当前主档。
 */
export function resolveBench(allBenches: Bench[], id: string): ResolvedBench {
  const direct = allBenches.find((b) => b.id === id);
  if (!direct || !isMergedBench(direct)) {
    return { bench: direct, wasMerged: false };
  }

  const targetId = direct.mergedInto?.benchmarkId;
  const target = targetId
    ? allBenches.find((b) => b.id === targetId && !isMergedBench(b))
    : undefined;

  return { bench: target, wasMerged: true, sourceBench: direct };
}
