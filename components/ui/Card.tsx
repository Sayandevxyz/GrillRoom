import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  goldTopRule?: boolean;
  subtle?: boolean;
}

/**
 * White memo card with hairline border, 14px radius, and subtle shadow.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, goldTopRule = false, subtle = false, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-surface border border-border rounded-card ${
          subtle ? "shadow-subtle" : "shadow-panel"
        } relative overflow-hidden ${className}`}
        {...props}
      >
        {goldTopRule && (
          <div
            className="h-1 w-full bg-gold absolute top-0 left-0 right-0"
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
