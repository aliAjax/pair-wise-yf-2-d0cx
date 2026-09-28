import { useEffect, useState } from 'react';
import { Armchair, GitMerge, X, Check } from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import { MERGE_MIN_COUNT, MERGE_MAX_COUNT } from '@/utils/mergeRules';
import FilterBar from '@/components/FilterBar/FilterBar';
import BenchCard from '@/components/BenchCard/BenchCard';
import MergeDialog from '@/components/MergeDialog/MergeDialog';
import type { Bench } from '@/types';

export default function ListPage() {
  const { benches, getFilteredBenches, initialize, initialized, mergeBenches } = useBenchStore();
  const filteredBenches = getFilteredBenches();

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  const selectedBenches: Bench[] = selectedIds
    .map((sid) => benches.find((bench) => bench.id === sid))
    .filter((bench): bench is Bench => bench !== undefined);

  const exitMergeMode = () => {
    setMergeMode(false);
    setSelectedIds([]);
    setDialogOpen(false);
  };

  const handleToggleSelect = (bench: Bench) => {
    setFeedback('');
    setSelectedIds((prev) => {
      if (prev.includes(bench.id)) {
        return prev.filter((id) => id !== bench.id);
      }
      if (prev.length >= MERGE_MAX_COUNT) {
        setFeedback(`最多只能选择 ${MERGE_MAX_COUNT} 条记录`);
        return prev;
      }
      return [...prev, bench.id];
    });
  };

  const handleConfirmMerge = (masterId: string) => {
    const result = mergeBenches(selectedIds, masterId);
    if (result.ok) {
      setDialogOpen(false);
      setMergeMode(false);
      setSelectedIds([]);
      setFeedback('');
    }
    return result;
  };

  const canOpenDialog = selectedIds.length >= MERGE_MIN_COUNT && selectedIds.length <= MERGE_MAX_COUNT;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-deep-brown mb-1">
            长椅档案
          </h2>
          <p className="text-ink-light text-sm">
            记录城市中那些被忽略的休憩角落
          </p>
        </div>

        {!mergeMode && benches.length >= MERGE_MIN_COUNT && (
          <button
            onClick={() => {
              setMergeMode(true);
              setFeedback('');
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-moss-green bg-moss-green/10 hover:bg-moss-green/20 rounded-lg transition-colors flex-shrink-0"
          >
            <GitMerge className="w-4 h-4" />
            合并重复档案
          </button>
        )}
      </div>

      {mergeMode && (
        <div className="paper-texture rounded-xl shadow-paper p-4 mb-4 border border-moss-green/30 fade-in">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-moss-green">
              <GitMerge className="w-4 h-4" />
              合并模式
            </span>
            <span className="text-sm text-ink-light">
              勾选 {MERGE_MIN_COUNT}-{MERGE_MAX_COUNT} 张疑似同一长椅的卡片
              （已选 {selectedIds.length} 张）
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={exitMergeMode}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-ink-light hover:bg-deep-brown/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                onClick={() => {
                  setFeedback('');
                  setDialogOpen(true);
                }}
                disabled={!canOpenDialog}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-moss-green hover:bg-moss-light rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                下一步：确认主档
              </button>
            </div>
          </div>
          {feedback && <p className="text-xs text-red-500 mt-2">{feedback}</p>}
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
              selectable={mergeMode}
              selected={selectedIds.includes(bench.id)}
              disabled={mergeMode && selectedIds.length >= MERGE_MAX_COUNT && !selectedIds.includes(bench.id)}
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
            {benches.length === 0 ? '还没有长椅档案' : '没有找到匹配的长椅'}
          </h3>
          <p className="text-ink-light text-sm">
            {benches.length === 0
              ? '点击右上角的添加按钮，记录第一张长椅档案吧'
              : '试试调整筛选条件或搜索关键词'}
          </p>
        </div>
      )}

      <MergeDialog
        open={dialogOpen}
        benches={selectedBenches}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmMerge}
      />
    </div>
  );
}
