"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

export function SmoothScroll() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduce]);

  return null;
}

export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.2 });

  return <motion.div aria-hidden="true" className="fixed inset-x-0 top-0 z-[70] h-px origin-left bg-[#DDB85A]" style={{ scaleX: reduce ? 1 : scaleX }} />;
}
