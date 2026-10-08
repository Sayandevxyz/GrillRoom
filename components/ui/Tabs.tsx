"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Accessible tab list adhering to WAI-ARIA tablist design pattern.
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index;
    if (e.key === "ArrowRight") {
      newIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      newIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      newIndex = 0;
    } else if (e.key === "End") {
      newIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    onChange(tabs[newIndex].id);
  };

  return (
    <div
      role="tablist"
      aria-label="Filter tabs"
      className={`flex items-center gap-1 border-b border-border ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-subtle flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info ${
              isActive
                ? "border-navy text-navy font-bold"
                : "border-transparent text-text-2 hover:text-text hover:border-slate-300"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  isActive ? "bg-slate-200 text-navy" : "bg-slate-100 text-text-2"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
