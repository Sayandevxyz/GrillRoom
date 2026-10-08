import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

/**
 * Skeleton loading placeholder respecting prefers-reduced-motion.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rectangular",
  width,
  height,
  className = "",
  style,
  ...props
}) => {
  const variantStyles = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-field",
  };

  return (
    <div
      aria-hidden="true"
      className={`bg-slate-200/80 animate-pulse ${variantStyles[variant]} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};
