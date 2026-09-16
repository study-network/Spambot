import React from 'react';
import { ServerCategory } from '../types.ts';
import { CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert, FlaskConical } from 'lucide-react';

interface CategoryBadgeProps {
  category: ServerCategory;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  showIcon = true,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (category === 'Working') {
    return (
      <span
        id={`badge-working-${size}`}
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 ${sizeClasses}`}
      >
        {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        Working
      </span>
    );
  }

  if (category === 'Error') {
    return (
      <span
        id={`badge-error-${size}`}
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 ${sizeClasses}`}
      >
        {showIcon && <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
        <span className="inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
        Error
      </span>
    );
  }

  if (category === 'Some Error') {
    return (
      <span
        id={`badge-some-error-${size}`}
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 shadow-xs dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 ${sizeClasses}`}
      >
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />}
        <span className="inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
        Some Error
      </span>
    );
  }

  if (category === 'Testing') {
    return (
      <span
        id={`badge-testing-${size}`}
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200/80 shadow-xs dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60 ${sizeClasses}`}
      >
        {showIcon && <FlaskConical className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
        <span className="inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
        Testing
      </span>
    );
  }

  // Unfilter
  return (
    <span
      id={`badge-unfilter-${size}`}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 ${sizeClasses}`}
    >
      {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
      <span className="inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
      Unfilter
    </span>
  );
};
