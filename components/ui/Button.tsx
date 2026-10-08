import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Standard button component adhering to the GrillRoom design system.
 * Primary variant is the only component on each page using the orange CTA token.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5",
      md: "px-4 py-2.5 text-sm font-semibold rounded-[10px] gap-2",
      lg: "px-6 py-3.5 text-base font-semibold rounded-[10px] gap-2.5",
    };

    const variantClasses = {
      primary:
        "bg-cta hover:bg-cta-hover text-white shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-subtle",
      secondary:
        "bg-surface hover:bg-surface-2 text-navy border border-border hover:border-slate-400 shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-subtle",
      outline:
        "bg-transparent hover:bg-surface-2 text-text border border-border hover:border-slate-400 transition-subtle",
      ghost:
        "bg-transparent hover:bg-surface-2 text-text-2 hover:text-text transition-subtle",
      danger:
        "bg-danger hover:bg-red-800 text-white shadow-subtle transition-subtle",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-sans tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
