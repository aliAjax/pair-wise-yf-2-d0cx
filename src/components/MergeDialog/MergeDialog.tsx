import { useEffect, useState } from 'react';
import { GitMerge, X, Crown, AlertTriangle, MapPin } from 'lucide-react';
import type { Bench } from '@/types';
import {
  MERGE_MAX_COUNT,
  validateMergeSelection,
  dedupeExperiences,
  mergeExperiencesRating,
} from '@/utils/mergeRules';

interface MergeDialogProps {
  open: boolean;
  benches: Bench[];
  onClose: () => void;
  onConfirm: (masterId: string) => { ok: boolean; error?: string };
}

export default function MergeDialog({ open, benches, onClose, onConfirm }: MergeDialogProps) {
  const [masterId, setMasterId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open) {
      setMasterId(benches[0]?.id ?? '');
      setError('');
    }
  }, [open, benches]);

  if (!open) return null;

  const validation =
    benches.length > 0
      ? validateMergeSelection(
          benches.map((b) => ({ ...b })),
          benches.map((b) => b.id),
          masterId,
        )
      : { ok: false, error: '请先选择记录' };

  const masterBench = benches.find((bench) => bench.id === masterId);
  const previewExperiences = masterBench
    ? dedupeExperiences(
        masterBench,
        benches.filter((bench) => bench.id !== masterId),
      )
    : [];
  const previewExperienceCount = previewExperiences.length;
  const previewRating = masterBench
    ? mergeExperiencesRating(masterBench, previewExperiences)
    : undefined;
  const allHaveNoExperiences = previewExperienceCount === 0;

  const handleConfirm = () => {
    if (!validation.ok) {
      setError(validation.error ?? '无法合并');
      return;
    }
    const result = onConfirm(masterId);
    if (!result.ok) {
      setError(result.error ?? '合并失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="paper-texture rounded-xl shadow-paper-hover p-6 max-w-lg w-full fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-deep-brown flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-moss-green" />
            合并疑似重复记录
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-ink-light hover:text-deep-brown rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-ink-light text-sm mb-4">
          已选择 {benches.length} 张疑似同一长椅的档案（最多 {MERGE_MAX_COUNT} 张）。
          请确认保留哪一张作为<strong className="text-deep-brown">主档</strong>，
          其余记录的体验将按原顺序并入，旧链接会自动转到主档。
        </p>

        <div className="space-y-2 mb-4">
          {benches.map((bench) => {
            const isMaster = bench.id === masterId;
            return (
              <label
                key={bench.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isMaster
                    ? 'border-moss-green bg-moss-green/5'
                    : 'border-deep-brown/10 bg-white/40 hover:bg-white/70'
                }`}
              >
                <input
                  type="radio"
                  name="merge-master"
                  checked={isMaster}
                  onChange={() => setMasterId(bench.id)}
                  className="mt-1 text-moss-green focus:ring-moss-green"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-medium text-deep-brown truncate">
                      {bench.name}
                    </span>
                    {isMaster && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-moss-green text-white rounded-full">
                        <Crown className="w-2.5 h-2.5" />
                        主档
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-light mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{bench.location}</span>
                  </div>
                  <div className="text-xs text-ink-light/70 mt-1">
                    {bench.experiences.length} 条体验 · 评分 {bench.rating.toFixed(1)}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {masterBench && (
          <div className="bg-warm-cream/70 rounded-lg p-3 mb-4 text-sm text-ink-light">
            <div className="font-medium text-deep-brown mb-1">合并后预览</div>
            <div className="space-y-0.5 text-xs">
              <div>保留名称：{masterBench.name}</div>
              <div>去重后体验：{previewExperienceCount} 条（按原顺序保留）</div>
              <div>
                主档评分：
                {allHaveNoExperiences
                  ? `无体验，沿用主档评分 ${masterBench.rating.toFixed(1)}`
                  : `按全部体验平均取 ${previewRating?.toFixed(1)}`}
              </div>
            </div>
          </div>
        )}

        {(!validation.ok || error) && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error || validation.error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-deep-brown bg-warm-beige hover:bg-warm-beige/80 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!validation.ok}
            className="flex-1 px-4 py-2 text-sm text-white bg-moss-green hover:bg-moss-light rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <GitMerge className="w-4 h-4" />
            确认合并
          </button>
        </div>
      </div>
    </div>
  );
}
