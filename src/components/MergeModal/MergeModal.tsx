import { useMemo, useState } from 'react';
import { X, Crown, ArrowRight, GitMerge, AlertTriangle } from 'lucide-react';
import type { Bench } from '@/types';
import { TIME_PERIOD_LABELS } from '@/types';
import Rating from '@/components/Rating/Rating';
import { buildMergePlan, MergeError } from '@/utils/merge';
import type { MergePlan } from '@/utils/merge';

interface MergeModalProps {
  open: boolean;
  allBenches: Bench[];
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (primaryId: string) => void;
}

export default function MergeModal({
  open,
  allBenches,
  selectedIds,
  onClose,
  onConfirm,
}: MergeModalProps) {
  const [primaryId, setPrimaryId] = useState<string>(selectedIds[0] ?? '');
  const [error, setError] = useState<string | null>(null);

  const selectedBenches = useMemo(
    () =>
      selectedIds
        .map((id) => allBenches.find((b) => b.id === id))
        .filter((b): b is Bench => !!b),
    [allBenches, selectedIds],
  );

  // 纯计算：基于当前选择与主档生成预览；非法时给出错误而不抛异常
  const { plan, planError } = useMemo<{ plan: MergePlan | null; planError: string | null }>(() => {
    if (!primaryId) return { plan: null, planError: null };
    try {
      return { plan: buildMergePlan(allBenches, selectedIds, primaryId), planError: null };
    } catch (e) {
      return { plan: null, planError: e instanceof MergeError ? e.message : '合并条件不满足' };
    }
  }, [allBenches, selectedIds, primaryId]);

  if (!open) return null;

  const shownError = error ?? planError;

  const handleConfirm = () => {
    if (!primaryId) {
      setError('请先选择一张主档');
      return;
    }
    try {
      buildMergePlan(allBenches, selectedIds, primaryId);
      onConfirm(primaryId);
    } catch (e) {
      setError(e instanceof MergeError ? e.message : '合并失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="paper-texture rounded-xl shadow-paper-hover max-w-2xl w-full max-h-[90vh] flex flex-col fade-in">
        <div className="flex items-center justify-between p-6 border-b border-deep-brown/10">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-moss-green" />
            <h3 className="font-serif text-lg font-semibold text-deep-brown">
              合并重复档案
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-light hover:text-deep-brown rounded-lg hover:bg-deep-brown/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {shownError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{shownError}</span>
            </div>
          )}

          {/* 第一步：选择主档 */}
          <section>
            <h4 className="font-serif text-sm font-semibold text-deep-brown mb-1">
              第一步 · 选择主档
            </h4>
            <p className="text-xs text-ink-light mb-3">
              主档的名称、位置与属性会保留，其余档案合并后从列表、地图和排行消失。
            </p>
            <div className="space-y-2">
              {selectedBenches.map((bench) => {
                const isPrimary = bench.id === primaryId;
                return (
                  <button
                    key={bench.id}
                    type="button"
                    onClick={() => {
                      setPrimaryId(bench.id);
                      setError(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                      isPrimary
                        ? 'border-moss-green bg-moss-green/5'
                        : 'border-deep-brown/10 bg-white/50 hover:border-moss-green/40'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isPrimary ? 'border-moss-green bg-moss-green' : 'border-deep-brown/30'
                      }`}
                    >
                      {isPrimary && <Crown className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-deep-brown truncate">
                        {bench.name}
                      </div>
                      <div className="text-xs text-ink-light truncate">{bench.location}</div>
                    </div>
                    <span className="text-xs text-ink-light flex-shrink-0">
                      {bench.experiences.length} 条体验 · 评分 {bench.rating.toFixed(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 第二步：合并预览 */}
          {plan && (
            <section>
              <h4 className="font-serif text-sm font-semibold text-deep-brown mb-1">
                第二步 · 合并预览
              </h4>
              <p className="text-xs text-ink-light mb-3">
                体验按原顺序保留，同一时段只留一条；
                {plan.mergedExperiences.length > 0
                  ? '评分取全部保留体验的平均值（保留一位小数）。'
                  : '没有体验，评分沿用主档。'}
              </p>

              <div className="bg-warm-cream/60 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-light">合并后名称 / 位置</span>
                  <span className="font-medium text-deep-brown text-right">
                    {plan.primary.name}
                    <span className="block text-xs text-ink-light">
                      {plan.primary.location}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-light">评分</span>
                  <span className="flex items-center gap-2">
                    <span className="text-ink-light line-through">
                      {plan.primary.rating.toFixed(1)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-light" />
                    <span className="font-semibold text-moss-green">
                      {plan.mergedRating.toFixed(1)}
                    </span>
                  </span>
                </div>

                <div className="text-sm">
                  <span className="text-ink-light">
                    保留的体验（{plan.mergedExperiences.length} 条）
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {plan.mergedExperiences.length > 0 ? (
                      plan.mergedExperiences.map((exp) => (
                        <span
                          key={exp.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/70 text-xs text-deep-brown rounded-md"
                        >
                          {TIME_PERIOD_LABELS[exp.timePeriod]}
                          <Rating value={exp.rating} readOnly size="sm" />
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-light">无体验记录</span>
                    )}
                  </div>
                </div>

                <div className="text-sm pt-2 border-t border-deep-brown/10">
                  <span className="text-ink-light">将被并入主档的记录</span>
                  <ul className="mt-1.5 space-y-1">
                    {plan.sources.map((source) => (
                      <li key={source.id} className="text-xs text-deep-brown">
                        · {source.name}
                        <span className="text-ink-light">（{source.location}）</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-ink-light/70 mt-2">
                    被合并记录的内容仍保存在本地，旧链接会自动转到主档并注明来源。
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-deep-brown/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm text-deep-brown bg-warm-beige hover:bg-warm-beige/80 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!primaryId || !!planError}
            className="flex-1 px-4 py-2.5 text-sm text-white bg-moss-green hover:bg-moss-light disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            确认合并
          </button>
        </div>
      </div>
    </div>
  );
}
