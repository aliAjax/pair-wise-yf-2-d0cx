import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Volume2, Sun, Armchair, Check } from 'lucide-react';
import type { Bench } from '@/types';
import { MATERIAL_LABELS, SHADE_LABELS, NOISE_LABELS, STAY_DURATION_LABELS } from '@/types';
import Rating from '@/components/Rating/Rating';
import { calculateComfortScore, getComfortLevel, getComfortColor } from '@/utils/comfort';

interface BenchCardProps {
  bench: Bench;
  index?: number;
  /** 合并选择模式：显示勾选框、点击不再跳转 */
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onToggleSelect?: (bench: Bench) => void;
}

export default function BenchCard({
  bench,
  index = 0,
  selectable = false,
  selected = false,
  disabled = false,
  onToggleSelect,
}: BenchCardProps) {
  const navigate = useNavigate();
  const comfortScore = calculateComfortScore(bench);
  const comfortLevel = getComfortLevel(comfortScore);
  const comfortColor = getComfortColor(comfortScore);

  const staggerClass = `stagger-${(index % 6) + 1}`;

  const handleClick = () => {
    if (selectable) {
      if (!disabled || selected) {
        onToggleSelect?.(bench);
      }
      return;
    }
    navigate(`/bench/${bench.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`paper-texture rounded-xl shadow-card card-hover overflow-hidden fade-in opacity-0 ${staggerClass} ${
        selectable ? 'cursor-pointer' : 'cursor-pointer'
      } ${selected ? 'ring-2 ring-moss-green' : ''} ${
        selectable && disabled && !selected ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    >
      <div className="h-36 bg-gradient-to-br from-warm-cream to-warm-beige relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-moss-green/10 flex items-center justify-center">
            <Armchair className="w-10 h-10 text-moss-green/50" />
          </div>
        </div>

        <div className="absolute top-3 right-3 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-medium">
          <span className={comfortColor}>{comfortLevel}</span>
          <span className="text-ink-light ml-1">{comfortScore}</span>
        </div>

        <div className="absolute top-3 left-3 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs text-ink-light">
          {MATERIAL_LABELS[bench.material]}
        </div>

        {selectable && (
          <div
            className={`absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
              selected
                ? 'bg-moss-green border-moss-green text-white'
                : 'bg-white/80 border-deep-brown/20 text-transparent'
            }`}
          >
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold text-deep-brown mb-1 line-clamp-1">
          {bench.name}
        </h3>

        <div className="flex items-center gap-1 text-ink-light text-sm mb-3">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{bench.location}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-moss-green/10 text-moss-green text-xs rounded-md">
            <Sun className="w-3 h-3" />
            {SHADE_LABELS[bench.shadeLevel]}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-ochre/10 text-ochre text-xs rounded-md">
            <Volume2 className="w-3 h-3" />
            {NOISE_LABELS[bench.noiseLevel]}
          </span>
          {bench.hasBackrest && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-moss-green/10 text-moss-green text-xs rounded-md">
              有靠背
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Rating value={bench.rating} readOnly size="sm" />
          <div className="flex items-center gap-1 text-xs text-ink-light">
            <Clock className="w-3.5 h-3.5" />
            <span>{STAY_DURATION_LABELS[bench.stayDuration]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
