import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, AlertCircle, RefreshCw } from "lucide-react";

// ─── Skeleton colors from design system ──────────
const SKEL = "bg-[#E8E0D8] animate-pulse";

// ─── Page Skeleton ───────────────────────────────
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <div className={`h-8 w-48 rounded-md ${SKEL}`} />
        <div className={`h-4 w-64 rounded-md ${SKEL}`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-24 rounded-lg ${SKEL}`} />
        ))}
      </div>
      <div className={`h-64 rounded-lg ${SKEL}`} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`h-12 rounded-md ${SKEL}`} />
      ))}
    </div>
  );
}

// ─── Table Skeleton ──────────────────────────────
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 animate-fade-in">
      <div className={`h-10 rounded-md ${SKEL}`} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`h-10 flex-1 rounded-md ${SKEL}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Chart Skeleton ──────────────────────────────
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`${height} rounded-lg ${SKEL} animate-fade-in`} />
  );
}

// ─── Card Skeleton ───────────────────────────────
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`h-24 rounded-lg ${SKEL}`} />
      ))}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }: EmptyStateProps) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/5">
          <Icon className="h-10 w-10 text-primary/60" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        {actionLabel && actionTo && (
          <Button asChild className="mt-5 bg-primary hover:bg-primary/90">
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        )}
        {actionLabel && onAction && !actionTo && (
          <Button className="mt-5 bg-primary hover:bg-primary/90" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Error State ─────────────────────────────────
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Erro ao carregar dados. Tente novamente.", onRetry }: ErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 animate-fade-in">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <p className="text-sm font-medium text-destructive">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
