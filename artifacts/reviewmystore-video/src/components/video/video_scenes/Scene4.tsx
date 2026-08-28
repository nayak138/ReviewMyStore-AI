import { motion } from "framer-motion";
import { Check, MessageSquareText, Sparkles, Wand2 } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene4() {
  return (
    <motion.section
      className="scene-layer"
      initial={{ opacity: 0, clipPath: "polygon(100% 0, 100% 0, 100% 100%, 70% 100%)" }}
      animate={{ opacity: 1, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
      exit={{ opacity: 0, clipPath: "polygon(0 0, 0 0, 0 100%, 28% 100%)" }}
      transition={{ duration: 0.82, ease }}
    >
      <div className="absolute left-[7vw] top-[17vh]">
        <motion.p className="eyebrow mb-[2.2vh] text-[#ea4335]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease }}>04 / Give every word a lift</motion.p>
        <motion.h2 className="display text-[5.2vw] text-[#202124]" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1, duration: .76, ease }}>
          AI helps.
          <br />
          <span className="text-[#ea4335]">You decide.</span>
        </motion.h2>
        <motion.p className="mt-[2.5vh] max-w-[25vw] text-[1.2vw] leading-[1.45] text-[#202124]/62" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .48, duration: .55 }}>
          A specific draft, shaped by the real details of the visit — ready for a human edit.
        </motion.p>
      </div>
      <motion.div className="absolute right-[8vw] top-[14vh] w-[50vw]" initial={{ y: 40, opacity: 0, rotate: 2 }} animate={{ y: 0, opacity: 1, rotate: -1 }} transition={{ delay: .2, duration: .88, ease }}>
        <div className="glass rounded-[1.2vw] p-[1.3vw]">
          <div className="flex items-center justify-between border-b border-[#202124]/10 pb-[1vw]"><div className="flex items-center gap-[.65vw]"><div className="flex h-[2.3vw] w-[2.3vw] items-center justify-center rounded-[.6vw] bg-[#ea4335]"><MessageSquareText size="1.25vw" color="white" /></div><div><p className="small-caps text-[#202124]/48">Review assistant</p><p className="mt-[.25vw] text-[1vw] font-bold">The Daily Standard</p></div></div><motion.div className="flex items-center gap-[.35vw] rounded-full bg-[#34a853]/12 px-[.7vw] py-[.4vw] text-[.68vw] font-bold text-[#23863f]" animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}><span className="h-[.45vw] w-[.45vw] rounded-full bg-[#34a853]" />Draft ready</motion.div></div>
          <div className="mt-[1.1vw] grid grid-cols-[.85fr_1.15fr] gap-[1.1vw]">
            <div className="rounded-[.8vw] border border-[#202124]/10 bg-[#fffdf8]/70 p-[1vw]"><div className="flex items-center justify-between"><span className="small-caps text-[#202124]/45">What stood out</span><Sparkles size="1.05vw" color="#fbbc04" /></div><div className="mt-[1vw] flex flex-wrap gap-[.45vw]">{["Warm welcome", "Quick service", "Great detail"].map((tag, i) => <motion.div key={tag} className={`rounded-full px-[.65vw] py-[.48vw] text-[.72vw] font-bold ${i === 1 ? "bg-[#fbbc04]/75" : "bg-[#e8eefc]"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .65 + i * .14, duration: .4, ease }}>{tag}</motion.div>)}</div><div className="mt-[4vw] flex items-center gap-[.6vw]"><Wand2 size="1.15vw" color="#2f6fed" /><span className="text-[.7vw] text-[#202124]/52">AI has enough to begin.</span></div></div>
            <div className="relative rounded-[.8vw] border border-[#2f6fed]/25 bg-[#e8eefc]/60 p-[1vw]"><div className="flex items-center justify-between"><span className="small-caps text-[#2f6fed]">Suggested review</span><span className="font-mono text-[.65vw] text-[#202124]/42">92 words</span></div><motion.p className="mt-[1vw] text-[.95vw] leading-[1.55] text-[#202124]/78" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9, duration: .65 }}>“From the warm welcome to the quick, thoughtful service, the whole visit felt easy. You can tell the team cares about the details — I’ll be back soon.”</motion.p><div className="mt-[1.1vw] flex items-center justify-between border-t border-[#2f6fed]/15 pt-[.9vw]"><div className="flex items-center gap-[.3vw]">{[1,2,3,4,5].map(i => <span key={i} className="text-[1.2vw] leading-none text-[#fbbc04]">★</span>)}</div><motion.div className="flex items-center gap-[.4vw] text-[.7vw] font-bold text-[#34a853]" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.35, duration: .45 }}><Check size=".9vw" /> human-approved</motion.div></div><motion.div className="absolute -right-[2.1vw] -top-[2.1vw] flex h-[4.2vw] w-[4.2vw] items-center justify-center rounded-full bg-[#fbbc04] shadow-[0_.7vw_1.2vw_rgba(251,188,4,.22)]" animate={{ rotate: [0, 8, -2, 0] }} transition={{ duration: 3.4, repeat: Infinity }}><Sparkles size="1.65vw" color="#202124" /></motion.div></div>
          </div>
        </div>
      </motion.div>
      <motion.div className="absolute bottom-[12vh] right-[9vw] flex items-center gap-[.7vw] rounded-full border border-[#202124]/12 bg-[#fffdf8]/65 px-[1vw] py-[.62vw]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.28, duration: .5, ease }}><span className="h-[.55vw] w-[.55vw] rounded-full bg-[#2f6fed]" /><span className="font-mono text-[.72vw] uppercase tracking-[.12em] text-[#202124]/58">thoughtful replies, without the blank page</span></motion.div>
    </motion.section>
  );
}