import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";

export interface AlertProps {
  variant?: "danger" | "warning" | "info" | "success";
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Calm, accessible alert banner.
 */
export const Alert: React.FC<AlertProps> = ({
  variant = "danger",
  title,
  message,
  onRetry,
  className = "",
}) => {
  const styles = {
    danger: {
      bg: "bg-red-50 border-red-200 text-danger",
      icon: <AlertCircle className="w-4 h-4 flex-shrink-0 text-danger" aria-hidden="true" />,
    },
    warning: {
      bg: "bg-amber-50 border-amber-200 text-warning",
      icon: <AlertTriangle className="w-4 h-4 flex-shrink-0 text-warning" aria-hidden="true" />,
    },
    info: {
      bg: "bg-blue-50 border-blue-200 text-info",
      icon: <Info className="w-4 h-4 flex-shrink-0 text-info" aria-hidden="true" />,
    },
    success: {
      bg: "bg-green-50 border-green-200 text-success",
      icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-success" aria-hidden="true" />,
    },
  };

  const current = styles[variant];

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-field border flex items-start justify-between gap-3 ${current.bg} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{current.icon}</div>
        <div>
          {title && <h3 className="text-xs font-bold uppercase tracking-wider">{title}</h3>}
          <p className="text-xs leading-relaxed font-medium">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-xs font-bold underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info p-1"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
