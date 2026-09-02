"use client";

import React from "react";

interface IOSPullRefreshSpinnerProps {
  progress?: number; // 0 to 1
  isRefreshing?: boolean;
}

export function IOSPullRefreshSpinner({
  progress = 0,
  isRefreshing = false,
}: IOSPullRefreshSpinnerProps) {
  // 8 radial bars arranged at 45° intervals
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div
      className="relative w-6 h-6 flex items-center justify-center select-none"
      role="status"
      aria-label="Loading..."
    >
      <style jsx>{`
        @keyframes ios-bar-fade {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }
        .ios-spinner-bar {
          animation: ios-bar-fade 0.8s linear infinite;
        }
      `}</style>
      {angles.map((angle, index) => {
        // Calculate progressive opacity during pull
        const barThreshold = (index / 8);
        const staticOpacity = isRefreshing
          ? 1
          : progress > barThreshold
          ? Math.min(1, (progress - barThreshold) * 4)
          : 0.15;

        const delay = index * 0.1;

        return (
          <div
            key={angle}
            className="absolute top-0 left-1/2 -ml-[1px] w-[2.5px] h-[7px] origin-[50%_12px]"
            style={{
              transform: `rotate(${angle}deg)`,
            }}
          >
            <div
              className={`w-full h-full rounded-full bg-[#8E949E] dark:bg-[#D4B12F] ${
                isRefreshing ? "ios-spinner-bar" : ""
              }`}
              style={{
                opacity: isRefreshing ? undefined : staticOpacity,
                animationDelay: isRefreshing ? `${delay}s` : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
