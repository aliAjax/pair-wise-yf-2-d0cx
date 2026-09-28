import { useEffect, useState } from 'react';
import { Armchair, GitMerge, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import FilterBar from '@/components/FilterBar/FilterBar';
import BenchCard from '@/components/BenchCard/BenchCard';
import MergeModal from '@/components/MergeModal/MergeModal';
import { MIN_MERGE_COUNT, MAX_MERGE_COUNT, MergeError } from '@/utils/merge';

type MergeFeedback =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null;

export default function ListPage() {
  const {
    benches,
    getFilteredBenches,
    getActiveBenches,
    initialize,
    initialized,
    mergeBenches,
  } = useBenchStore();
  const filteredBenches = getFilteredBenches();

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [feedback, setFeedback] = useState<MergeFeedback>(null);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // 提示条自动消失
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const activeCount = getActiveBenches().length;

  const exitMergeMode = () => {
    setMergeMode(false);
    setSelectedIds([]);
    setShowMergeModal(false);
  };

  const handleToggleSelect = (benchId: string) => {
    setFeedback(null);
    setSelectedIds((prev) => {
      if (prev.includes(benchId)) return prev.filter((id) => id !== benchId);
      if (prev.length >= MAX_MERGE_COUNT) {
        setFeedback({
          type: 'error',
          message: `一次最多选择 ${MAX_MERGE_COUNT} 张记录进行合并`,
        });
        return prev;
      }
      return [...prev, benchId];
    });
  };

  const handleMergeConfirm = (primaryId: string) => {
    try {
      mergeBenches(selectedIds, primaryId);
      const primary = benches.find((b) => b.id === primaryId);
      setFeedback({
        type: 'success',
        message: `已合并到主档「${primary?.name ?? ''}」，旧链接将自动跳转并注明来源`,
      });
    } catch (e) {
      // 规则层拒绝（如混入已合并记录）：内容未改动，仅提示
      setFeedback({
        type: 'error',
        message: e instanceof MergeError ? e.message : '合并失败，请重试',
      });
    } finally {
      exitMergeMode();
    }
  };

  const canOpenModal = selectedIds.length >= MIN_MERGE_COUNT;

  return (
    <div className={`container mx-auto px-4 py-6 ${mergeMode ? 'pb-24' : ''}`}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-deep-brown mb-1">
            长椅档案
          </h2>
          <p className="text-ink-light text-sm">
            记录城市中那些被忽略的休憩角落
          </p>
        </div>

        {!mergeMode && activeCount >= MIN_MERGE_COUNT && (
          <button
            onClick={() => {
              setMergeMode(true);
              setFeedback(null);
            }}
            className="flex flex-shrink-0 items-center gap-1.5 px-3 py-2 text-sm text-moss-green border border-moss-green/30 hover:bg-moss-green/10 rounded-lg transition-colors"
          >
            <GitMerge className="w-4 h-4" />
            合并重复档案
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`mb-4 flex items-start gap-2 p-3 rounded-lg text-sm fade-in ${
            feedback.type === 'success'
              ? 'bg-moss-green/10 text-moss-green border border-moss-green/20'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {mergeMode && (
        <div className="mb-4 p-3 bg-moss-green/5 border border-moss-green/20 rounded-lg text-sm text-deep-brown flex items-center justify-between gap-3 fade-in">
          <span>
            勾选 {MIN_MERGE_COUNT}–{MAX_MERGE_COUNT} 张疑似同一张长椅的记录，合并后可保留一张主档
          </span>
          <button
            onClick={exitMergeMode}
            className="flex items-center gap-1 text-ink-light hover:text-deep-brown flex-shrink-0"
          >
            <X className="w-4 h-4" />
            退出
          </button>
        </div>
      )}

      <FilterBar />

      {filteredBenches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBenches.map((bench, index) => (
            <BenchCard
              key={bench.id}
              bench={bench}
              index={index}
              selectMode={mergeMode}
              selected={selectedIds.includes(bench.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      ) : (
        <div className="paper-texture rounded-xl shadow-paper p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-moss-green/10 flex items-center justify-center mx-auto mb-4">
            <Armchair className="w-8 h-8 text-moss-green/50" />
          </div>
          <h3 className="font-serif text-lg font-medium text-deep-brown mb-2">
            {activeCount === 0 ? '还没有长椅档案' : '没有找到匹配的长椅'}
          </h3>
          <p className="text-ink-light text-sm">
            {activeCount === 0
              ? '点击右上角的添加按钮，记录第一张长椅档案吧'
              : '试试调整筛选条件或搜索关键词'}
          </p>
        </div>
      )}

      {mergeMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-deep-brown/10 bg-warm-beige/95 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <span className="text-sm text-deep-brown">
              已选择 <span className="font-semibold text-moss-green">{selectedIds.length}</span> 张
              <span className="text-ink-light">
                （需 {MIN_MERGE_COUNT}–{MAX_MERGE_COUNT} 张）
              </span>
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={exitMergeMode}
                className="px-4 py-2 text-sm text-deep-brown bg-white/60 hover:bg-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => setShowMergeModal(true)}
                disabled={!canOpenModal}
                className="px-4 py-2 text-sm text-white bg-moss-green hover:bg-moss-light disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                下一步：选择主档
              </button>
            </div>
          </div>
        </div>
      )}

      {showMergeModal && (
        <MergeModal
          open
          allBenches={benches}
          selectedIds={selectedIds}
          onClose={() => setShowMergeModal(false)}
          onConfirm={handleMergeConfirm}
        />
      )}
    </div>
  );
}
