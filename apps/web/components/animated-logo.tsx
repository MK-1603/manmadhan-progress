"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function AnimatedLogo() {
  return <motion.div initial={{ opacity: 0, scale: .92, rotate: 0 }} animate={{ opacity: 1, scale: [0.92, 1, 1.015, 1], rotate: [0, 2, 0, 0] }} transition={{ opacity: { duration: .45, delay: .2 }, scale: { duration: 1.45, delay: .2, times: [0, .35, .7, 1], ease: [0.22, 1, 0.36, 1] }, rotate: { duration: .7, delay: .7, ease: [0.22, 1, 0.36, 1] } }} className="relative h-24 w-24 sm:h-[110px] sm:w-[110px] lg:h-[120px] lg:w-[120px]">
    <motion.div animate={{ opacity: [0, .55, 0], x: ["-120%", "120%"] }} transition={{ duration: 1.05, delay: 1.2, ease: "easeInOut" }} className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-sm" />
    <Image src="/ios/iTunesArtwork@1x.png" alt="ManMadhan Progress logo" width={120} height={120} priority className="relative z-[1] h-full w-full rounded-[24%] object-cover shadow-[0_18px_45px_rgba(0,0,0,.38)]" />
  </motion.div>;
}
