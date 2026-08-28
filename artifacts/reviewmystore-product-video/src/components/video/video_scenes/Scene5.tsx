import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, Check, Star, TrendingUp } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene5() {
  return (
    <motion.section
      className="scene-layer"
      initial={{ opacity: 0, clipPath: "inset(0 0 0 100%)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0 0%)" }}
      exit={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
      transition={{ duration: 0.85, ease }}
    >
      <motion.div className="absolute left-[7vw] top-[18vh]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, ease }}>
        <p className="eyebrow mb-[2.3vh] text-[#fbbc04]">05 / Watch trust compound</p>
        <h2 className="display text-[5.35vw] text-[#202124]">See the<br /><span className="text-[#34a853]">difference.</span></h2>
        <p className="mt-[2.8vh] max-w-[25vw] text-[1.2vw] leading-[1.45] text-[#202124]/62">Every tap, review and reply becomes a clearer picture of what brings people back.</p>
      </motion.div>
      <motion.div className="absolute right-[8vw] top-[12vh] w-[51vw]" initial={{ opacity: 0, scale: .94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: .18, duration: .9, ease }}>
        <div className="glass rounded-[1.2vw] p-[1.35vw]">
          <div className="flex items-center justify-between border-b border-[#202124]/10 pb-[1vw]"><div><p className="small-caps text-[#202124]/45">Reputation overview</p><p className="mt-[.3vw] text-[1.15vw] font-bold">The Daily Standard</p></div><div className="flex items-center gap-[.45vw] rounded-full bg-[#e8eefc] px-[.7vw] py-[.42vw] text-[.68vw] font-bold text-[#2f6fed]"><span className="h-[.45vw] w-[.45vw] rounded-full bg-[#2f6fed]" /> Last 30 days</div></div>
          <div className="mt-[1.2vw] grid grid-cols-3 gap-[.8vw]">{[["Google rating", "4.9", "+0.2", "#2f6fed"], ["New reviews", "48", "+18.4%", "#34a853"], ["Response time", "2h", "-34m", "#fbbc04"]].map(([label,value,change,color], i) => <motion.div key={label} className="rounded-[.75vw] border border-[#202124]/10 bg-[#fffdf8]/65 p-[.85vw]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55 + i * .12, duration: .45, ease }}><p className="text-[.68vw] font-medium text-[#202124]/52">{label}</p><p className="mt-[.7vw] text-[1.9vw] font-extrabold tracking-[-.06em]" style={{ color }}>{value}</p><p className="mt-[.25vw] text-[.68vw] font-bold text-[#34a853]">{change}</p></motion.div>)}</div>
          <div className="mt-[.9vw] rounded-[.8vw] border border-[#202124]/10 bg-[#fffdf8]/54 p-[1vw]"><div className="flex items-center justify-between"><div><p className="text-[.8vw] font-bold">Review activity</p><p className="mt-[.2vw] text-[.65vw] text-[#202124]/45">A steady climb is a customer story.</p></div><TrendingUp size="1.35vw" color="#34a853" /></div><svg viewBox="0 0 600 190" className="mt-[.4vw] h-[11vw] w-full" role="img" aria-label="Review activity trending upward"><path d="M0 158H600M0 108H600M0 58H600" stroke="rgba(32,33,36,.1)" strokeDasharray="4 8" /><motion.path d="M0 150 C55 145 72 136 113 140 S172 122 218 128 S278 110 317 116 S381 91 418 104 S477 88 513 71 S558 75 600 27" fill="none" stroke="#2f6fed" strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 0, opacity: .4 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: .55, duration: 1.7, ease }} /><motion.circle cx="513" cy="71" r="7" fill="#fbbc04" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.8, type: "spring", stiffness: 260, damping: 16 }} /></svg><div className="flex items-center justify-between text-[.65vw] text-[#202124]/45"><span>May 01</span><span>Today</span></div></div>
        </div>
      </motion.div>
      <motion.div className="absolute bottom-[11vh] left-[7vw] flex items-center gap-[.6vw]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: .5, ease }}><div className="flex -space-x-[.35vw]">{["#2f6fed","#ea4335","#fbbc04","#34a853"].map((color) => <span key={color} className="flex h-[2.1vw] w-[2.1vw] items-center justify-center rounded-full border-[.18vw] border-[#f8f6f0]" style={{ background: color }}><Star size=".82vw" color="white" fill="white" /></span>)}</div><span className="text-[.78vw] font-bold text-[#202124]/62">More good moments, made visible.</span></motion.div>
      <motion.div className="absolute bottom-[10vh] right-[8vw] flex items-center gap-[.65vw] rounded-full bg-[#202124] px-[1.1vw] py-[.75vw] text-[#fffdf8]" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.45, duration: .55, ease }}><Check size="1vw" color="#34a853" /><span className="font-mono text-[.72vw] uppercase tracking-[.13em]">Reputation, in motion</span><ArrowUpRight size="1vw" /></motion.div>
      <motion.div className="absolute bottom-[17vh] right-[8.4vw] rounded-[.7vw] bg-[#202124] px-[.8vw] py-[.45vw] shadow-[0_.6vw_1.5vw_rgba(32,33,36,.16)]" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.15, duration: .5, ease }}>
        <img src={`${import.meta.env.BASE_URL}brand/logo-horizontal-dark.png`} alt="" className="h-auto w-[12.5vw] object-contain" />
      </motion.div>
      <motion.div className="absolute right-[3vw] top-[5vh] opacity-30" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}><BarChart3 size="4vw" color="#ea4335" strokeWidth={1} /></motion.div>
    </motion.section>
  );
}