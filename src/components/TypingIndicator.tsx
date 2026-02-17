import { motion } from 'framer-motion'

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[75%]">
        <div className="flex items-center gap-2 px-1">
          <span className="text-lg">🎓</span>
          <span className="text-xs font-medium text-muted-foreground">Tutor</span>
        </div>
        
        <div className="rounded-2xl px-5 py-4 bg-slate-800 border border-slate-700/50 shadow-lg">
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-2 h-2 bg-accent rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-accent rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-accent rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
