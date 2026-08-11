"use client";

import { useState, useRef } from "react";
import { Play, Pause, Square } from "lucide-react";

interface Stopwatch3DProps {
  elapsedSeconds: number;
  status: "Idle" | "Active" | "Paused" | "Completed" | "Interrupted" | "SYSTEM_STOPPED";
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
  actionLoading?: boolean;
  isSystemActive?: boolean;
}

function formatDigits(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    hours: pad(h),
    minutes: pad(m),
    seconds: pad(s),
  };
}

export function Stopwatch3D({
  elapsedSeconds,
  status,
  onStart,
  onPause,
  onResume,
  onEnd,
  actionLoading = false,
  isSystemActive = true,
}: Stopwatch3DProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subtle 3D physical parallax cursor response
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX((-y / rect.height) * 6); // Max 6 deg physical tilt
    setRotateY((x / rect.width) * 6);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const { hours, minutes, seconds } = formatDigits(elapsedSeconds);
  const secondHandAngle = (elapsedSeconds % 60) * 6; // 360 deg / 60 sec

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px] aspect-square mx-auto select-none transition-transform duration-300 ease-out shrink-0"
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Physical Stopwatch Outer Casing */}
      <div
        className="relative w-full h-full rounded-full p-4 transition-transform duration-200 ease-out flex items-center justify-center"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          background: "radial-gradient(circle at 35% 30%, hsl(var(--card)) 0%, hsl(var(--muted)/0.8) 70%, hsl(var(--border)) 100%)",
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.08) inset,
            inset 0 10px 20px rgba(255, 255, 255, 0.1),
            inset 0 -10px 20px rgba(0, 0, 0, 0.5)
          `,
        }}
      >
        {/* Top Physical Pusher Button */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-9 h-3.5 bg-muted-foreground/30 border border-border rounded-t-md shadow-sm flex items-center justify-center"
          style={{ transform: "translateZ(10px)" }}
        >
          <div className="w-5 h-1 bg-border rounded-full" />
        </div>

        {/* Right Side Crown */}
        <div
          className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-3.5 h-8 bg-muted-foreground/30 border border-border rounded-r-md shadow-sm"
          style={{ transform: "translateZ(8px)" }}
        />

        {/* Outer Raised Bezel Ring */}
        <div
          className="absolute inset-2 rounded-full border-[4px] border-muted/50 pointer-events-none"
          style={{
            transform: "translateZ(12px)",
            boxShadow: "inset 0 0 10px rgba(0, 0, 0, 0.5)",
          }}
        />

        {/* Inner Dial Face */}
        <div
          className="relative w-full h-full rounded-full flex flex-col items-center justify-between p-5 overflow-hidden"
          style={{
            transform: "translateZ(16px)",
            background: "radial-gradient(circle at 50% 50%, hsl(var(--card)) 45%, hsl(var(--background)) 100%)",
            boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Natural Glass Reflection */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none opacity-25 bg-gradient-to-br from-white/20 via-transparent to-transparent"
            style={{ transform: "translateZ(26px)" }}
          />

          {/* Dial Second Tick Marks */}
          <div className="absolute inset-2.5 rounded-full pointer-events-none">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className={`absolute top-0 left-1/2 -translate-x-1/2 origin-[50%_120px] sm:origin-[50%_140px] ${
                  i % 5 === 0 ? "w-0.5 h-3 bg-foreground/70" : "w-0.5 h-1.5 bg-muted-foreground/30"
                }`}
                style={{ transform: `rotate(${i * 6}deg)` }}
              />
            ))}
          </div>

          {/* Top Label */}
          <div className="pt-3 text-[9px] font-bold tracking-[0.2em] text-muted-foreground/70 uppercase">
            FOCUS
          </div>

          {/* Center Digital Timer & Status Display */}
          <div className="flex flex-col items-center gap-1.5 my-auto" style={{ transform: "translateZ(22px)" }}>
            <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
              ELAPSED
            </span>

            {/* Recessed Tabular Digital Numerals Window */}
            <div className="px-3 py-1 bg-muted/40 border border-border/80 rounded-lg shadow-inner">
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {hours}:{minutes}:{seconds}
              </span>
            </div>

            {/* Session Status Tag */}
            <div className="mt-1">
              {status === "Active" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> RECORDING
                </span>
              )}
              {status === "Paused" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> PAUSED
                </span>
              )}
              {status === "Idle" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-muted text-muted-foreground border border-border">
                  READY
                </span>
              )}
              {status === "SYSTEM_STOPPED" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  SYSTEM OFF
                </span>
              )}
            </div>
          </div>

          {/* Physical Center Pivot & Second Hand Needle */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: "translateZ(26px)" }}
          >
            {/* Center Cap */}
            <div className="w-3 h-3 rounded-full bg-primary border-2 border-card shadow-md z-10" />
            {/* Needle Line */}
            <div
              className={`absolute bottom-1/2 left-1/2 w-0.5 h-[42%] bg-primary origin-bottom rounded-full transition-transform duration-300 ${
                status === "Active" ? "ease-linear" : "ease-out"
              }`}
              style={{
                transform: `translateX(-50%) rotate(${secondHandAngle}deg)`,
                boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="flex items-center justify-center gap-2 mt-4 w-full max-w-[280px] z-20">
        {status === "Idle" && (
          <button
            onClick={onStart}
            disabled={actionLoading || !isSystemActive}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-primary-foreground" /> START FOCUS
          </button>
        )}

        {status === "Active" && (
          <>
            <button
              onClick={onPause}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-500/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Pause className="w-3.5 h-3.5 text-black fill-black" /> Pause
            </button>
            <button
              onClick={onEnd}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-card border border-border text-xs font-semibold text-foreground rounded-xl hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <Square className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" /> End
            </button>
          </>
        )}

        {status === "Paused" && (
          <>
            <button
              onClick={onResume}
              disabled={actionLoading || !isSystemActive}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-primary-foreground" /> Resume
            </button>
            <button
              onClick={onEnd}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-card border border-border text-xs font-semibold text-foreground rounded-xl hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <Square className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" /> End
            </button>
          </>
        )}
      </div>
    </div>
  );
}
