"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Quote, Github, Twitter, Linkedin } from "lucide-react";

// Chapter 62: ஆள்வினை உடைமை (Manly Effort / Perseverance)
const KURALS = [
  {
    no: 611,
    tamil: "அருமை உடைத்தென்றசாவாமை வேண்டும்\nபெருமை முயற்சி தரும்.",
    translation: "Yield not to the feebleness which says, 'this is too difficult'; effort will give the greatness of success.",
  },
  {
    no: 612,
    tamil: "வினைக்கண் வினைகெடல் ஓம்பல் வினைக்குறை\nதீர்ந்தாரின் தீர்ந்தன்று உலகு.",
    translation: "Take care not to give up effort in the middle of a work; the world abandons those who abandon their work.",
  },
  {
    no: 613,
    tamil: "தாளாண்மை என்னும் தகைமைக்கண் தங்கிற்றே\nவேளாண்மை என்னும் செருக்கு.",
    translation: "The pride of being benevolent rests on the noble quality of continuous effort.",
  },
  {
    no: 614,
    tamil: "தாளாண்மை இல்லாதான் வேளாண்மை பேடிகை\nவாளாண்மை போலக் கெடும்.",
    translation: "The benevolence of one who lacks effort will fail like the sword-wielding of a eunuch.",
  },
  {
    no: 615,
    tamil: "இன்பம் விழையான் வினைவிழைவான் தங்கேளிர்\nதுன்பம் துடைத்தூன்றும் தூண்.",
    translation: "He who desires not pleasure, but desires work, is the pillar that wipes away the sorrows of his relatives and supports them.",
  },
  {
    no: 616,
    tamil: "முயற்சி திருவினை ஆக்கும் முயற்றின்மை\nஇன்மை புகுத்தி விடும்.",
    translation: "Effort brings wealth; lack of it brings poverty.",
  },
  {
    no: 617,
    tamil: "மடியுளாள் மாமுகடி என்ப மடியிலான்\nதாளுளாள் தாமரையி னாள்.",
    translation: "They say the goddess of misfortune dwells in laziness, while the goddess of wealth dwells in the effort of the diligent.",
  },
  {
    no: 618,
    tamil: "பொறியின்மை யார்க்கும் பழியன்று அறிவறிந்து\nஆள்வினை இன்மை பழி.",
    translation: "Adverse fate is no disgrace to anyone; but to know what is right and to lack effort is a disgrace.",
  },
  {
    no: 619,
    tamil: "தெய்வத்தான் ஆகா தெனினும் முயற்சிதன்\nமெய்வருத்தக் கூலி தரும்.",
    translation: "Even if fate prevents success, effort will yield the reward for the body's toil.",
  },
  {
    no: 620,
    tamil: "ஊழையும் உப்பக்கம் காண்பர் உலைவின்றித்\nதாழாது உஞற்று பவர்.",
    translation: "Those who strive tirelessly and without despair will see even fate turn its back and flee.",
  },
];

export function Footer() {
  const [kuralIndex, setKuralIndex] = useState(0);

  useEffect(() => {
    // 20 minutes = 20 * 60 * 1000 = 1200000 ms
    const interval = setInterval(() => {
      setKuralIndex((prev) => (prev + 1) % KURALS.length);
    }, 1200000); 

    return () => clearInterval(interval);
  }, []);

  const currentKural = KURALS[kuralIndex];

  return (
    <footer className="relative w-full bg-white dark:bg-[#07090E] border-t border-slate-200/60 dark:border-white/[0.05] overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-24 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-[#C89B3C]/10 to-amber-500/5 blur-[120px] rounded-full opacity-50" />
        <div className="absolute -bottom-24 right-1/4 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-500/10 to-[#C89B3C]/5 blur-[140px] rounded-full opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-[0.03] dark:opacity-[0.02]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-10 sm:py-16">
        <div className="flex flex-col items-center max-w-5xl mx-auto">
          
          {/* Two Kural Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            
            {/* Highlighted Fixed Kural 619 */}
            <div className="relative w-full p-8 sm:p-10 rounded-[1.25rem] border-2 border-[#C89B3C]/50 dark:border-[#C89B3C]/40 bg-white/60 dark:bg-[#C89B3C]/[0.05] backdrop-blur-xl shadow-[0_8px_32px_rgba(200,155,60,0.15)] flex flex-col items-center text-center">
              <div className="absolute top-0 right-8 -mt-3.5">
                <div className="inline-flex items-center px-4 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                    Core Principle
                  </span>
                </div>
              </div>

              <Quote className="w-8 h-8 text-[#C89B3C]/30 dark:text-[#C89B3C]/20 absolute top-8 left-8" />
              
              <div className="relative z-10 pt-2 w-full flex flex-col items-center">
                <p className="text-base sm:text-lg font-bold leading-relaxed text-slate-900 dark:text-white whitespace-pre-line mb-6 font-serif">
                  தெய்வத்தான் ஆகா தெனினும் முயற்சிதன்{"\n"}மெய்வருத்தக் கூலி தரும்.
                </p>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 italic max-w-xl font-medium">
                  "Even if fate prevents success, effort will yield the reward for the body's toil."
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 w-full">
                  <div className="h-px bg-amber-200 dark:bg-amber-500/20 w-24" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-500">
                    Thirukkural 619
                  </span>
                </div>
              </div>
            </div>

            {/* Rotating Premium Kural Widget */}
            <div className="relative w-full p-8 sm:p-10 rounded-[1.25rem] border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl shadow-sm hover:shadow-[0_8px_32px_rgba(200,155,60,0.1)] transition-all duration-500 group text-center flex flex-col items-center">
              <div className="absolute top-0 right-8 -mt-3.5">
                <div className="inline-flex items-center px-4 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                    Wisdom of Effort
                  </span>
                </div>
              </div>

              <Quote className="w-8 h-8 text-slate-200 dark:text-white/10 absolute top-8 left-8" />
              
              <div className="relative z-10 pt-2 w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={kuralIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center"
                  >
                    <p className="text-base sm:text-lg font-semibold leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line mb-6 font-serif">
                      {currentKural.tamil}
                    </p>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 italic max-w-xl">
                      "{currentKural.translation}"
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-3 w-full">
                      <div className="h-px bg-slate-200 dark:bg-white/10 w-24" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Thirukkural {currentKural.no}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} ManMadhan Progress. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
