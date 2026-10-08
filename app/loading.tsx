import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 font-serif">
      <div className="w-12 h-12 rounded-full border-3 border-orange/20 border-t-orange animate-spin mb-4" />
      <p className="text-navy font-medium text-sm tracking-wide">
        Convening Investment Panel...
      </p>
    </div>
  );
}
