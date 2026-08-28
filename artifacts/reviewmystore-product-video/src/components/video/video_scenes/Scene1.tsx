import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles, Star } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene1() {
  return (
    <motion.section
      className="scene-layer"
      initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
      exit={{ opacity: 0, clipPath: "inset(0 0 0 100%)" }}
      transition={{ duration: 0.8, ease }}
    >
      <motion.div
        className="absolute left-[7vw] top-[19vh] h-[34vw] w-[34vw] rounded-full border-[1px] border-[#2f6fed]/20"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 14 }}
        transition={{ duration: 1.15, ease }}
      />
      <motion.div
        className="absolute right-[12vw] top-[15vh] h-[19vw] w-[19vw] rounded-[34%] bg-[#fbbc04]/18"
        initial={{ scale: 0.3, rotate: -28, opacity: 0 }}
        animate={{ scale: 1, rotate: 10, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.15, ease }}
      />
      <div className="absolute left-[7vw] top-[18vh] h-px w-[20vw] bg-[#ea4335]" />
      <motion.div
        className="absolute right-[15vw] top-[22vh] flex items-center gap-[.6vw] rounded-full border border-[#202124]/12 bg-[#fffdf8]/80 px-[.9vw] py-[.55vw] shadow-[0_.8vw_2vw_rgba(32,33,36,.08)]"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.48, duration: 0.65, ease }}
      >
        <Sparkles size="1.1vw" color="#34a853" />
        <span className="small-caps">The little things count</span>
      </motion.div>
      <div className="absolute left-[7vw] top-[27vh] z-10">
        <motion.p className="eyebrow mb-[2.2vh] text-[#ea4335]" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.55 }}>
          ReviewMyStore.ai / 01
        </motion.p>
        <motion.h1
          className="display max-w-[52vw] text-[8.3vw] text-[#202124]"
          initial={{ opacity: 0, y: 35, skewY: 3 }}
          animate={{ opacity: 1, y: 0, skewY: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease }}
        >
          GOOD
          <br />
          <span className="text-[#2f6fed]">SERVICE</span>
          <span className="text-[#ea4335]">.</span>
        </motion.h1>
        <motion.p
          className="mt-[3.2vh] max-w-[31vw] text-[1.45vw] leading-[1.35] text-[#202124]/66"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.6, ease }}
        >
          Should not disappear into the day.
        </motion.p>
      </div>
      <motion.div
        className="absolute bottom-[17vh] right-[15vw] flex h-[13vw] w-[13vw] items-center justify-center rounded-[32%] bg-[#2f6fed] shadow-[0_1.8vw_3vw_rgba(47,111,237,.28)]"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 8 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 230, damping: 17 }}
      >
        <img src={`${import.meta.env.BASE_URL}brand/logo-icon.png`} alt="" className="h-[10.5vw] w-[10.5vw] object-contain" />
        <motion.div className="absolute -right-[2vw] -top-[2vw] flex h-[4.2vw] w-[4.2vw] items-center justify-center rounded-full bg-[#fbbc04] text-[#202124]" animate={{ rotate: [0, 12, 0], scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <Star size="2vw" fill="currentColor" strokeWidth={1.5} />
        </motion.div>
      </motion.div>
      <motion.div className="absolute bottom-[14vh] left-[7vw] flex items-center gap-[.7vw] text-[#202124]/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }}>
        <ArrowUpRight size="1.3vw" />
        <span className="font-mono text-[.8vw] uppercase tracking-[.18em]">Turn moments into momentum</span>
      </motion.div>
    </motion.section>
  );
}