import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface MoMIndicatorProps {
  current: number | null | undefined;
  previous: number | null | undefined;
  format?: (v: number) => string;
  invertColor?: boolean; // true for metrics where lower is better (e.g. CAC)
}

export function MoMIndicator({ current, previous, format, invertColor = false }: MoMIndicatorProps) {
  if (current == null || previous == null || previous === 0) {
    return (
      <div className="flex items-center gap-1">
        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">—</span>
      </div>
    );
  }

  const variation = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = variation > 0;
  const isGood = invertColor ? !isPositive : isPositive;
  const colorClass = Math.abs(variation) < 0.5
    ? "text-muted-foreground"
    : isGood
      ? "text-green-600"
      : "text-red-500";

  const Icon = Math.abs(variation) < 0.5 ? Minus : isPositive ? ArrowUp : ArrowDown;
  const sign = isPositive ? "+" : "";
  const formatted = format ? format(previous) : previous.toString();

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
        <span className={`text-sm font-medium ${colorClass}`}>
          {sign}{variation.toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-[#6B5C54]">Mês anterior: {formatted}</p>
    </div>
  );
}
