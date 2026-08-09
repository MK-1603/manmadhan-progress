"use client";

import { motion } from "framer-motion";

const particles = [
  ["12%", "22%", 0], ["78%", "18%", 1.2], ["24%", "72%", 2.1], ["84%", "68%", .7],
  ["67%", "84%", 1.8], ["8%", "54%", 2.8], ["91%", "42%", 1.4], ["44%", "12%", 2.4],
];

export function AnimatedBackground() {
  return <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-slate-50/90 dark:bg-[#09090B] transition-colors duration-300">
    <motion.div animate={{ scale: [1, 1.06, 1], opacity: [.55, .72, .55] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute left-1/2 top-1/2 h-[48rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,155,60,.18),rgba(200,155,60,.04)_34%,transparent_69%)] dark:bg-[radial-gradient(circle,rgba(200,155,60,.14),rgba(200,155,60,.035)_34%,transparent_69%)] blur-2xl" />
    <motion.div animate={{ x: [0, 20, 0], y: [0, -14, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} className="absolute -left-40 top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#C89B3C]/[0.08] dark:bg-[#C89B3C]/[0.045] blur-[120px]" />
    <motion.div animate={{ x: [0, -18, 0], y: [0, 18, 0] }} transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }} className="absolute -right-48 bottom-[-12rem] h-[40rem] w-[40rem] rounded-full bg-amber-500/10 dark:bg-indigo-950/20 blur-[130px]" />
    <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.035] mix-blend-multiply dark:mix-blend-screen [background-image:radial-gradient(rgba(0,0,0,.6)_0.5px,transparent_0.5px)] dark:[background-image:radial-gradient(rgba(255,255,255,.8)_0.5px,transparent_0.5px)] [background-size:6px_6px]" />
    {particles.map(([left, top, delay], index) => <motion.span key={index} animate={{ y: [0, -14, 0], opacity: [.08, .22, .08] }} transition={{ duration: 6 + index * .5, delay: Number(delay), repeat: Infinity, ease: "easeInOut" }} className="absolute h-1.5 w-1.5 rounded-full bg-[#C89B3C] dark:bg-[#DDB85A]" style={{ left, top }} />)}
    <div className="absolute left-1/2 top-1/2 h-[min(90vw,620px)] w-[min(90vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-500/20 dark:border-[#C89B3C]/[0.055]" />
  </div>;
}
