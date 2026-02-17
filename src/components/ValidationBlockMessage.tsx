import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Warning, Info } from '@phosphor-icons/react'

interface ValidationBlockMessageProps {
  type: 'anti-cheating' | 'off-topic'
  message: string
}

export function ValidationBlockMessage({ type, message }: ValidationBlockMessageProps) {
  const isAntiCheating = type === 'anti-cheating'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start mb-6"
    >
      <Card className={`max-w-[85%] p-4 ${
        isAntiCheating 
          ? 'bg-card/40 border-l-4 border-l-yellow-500/80' 
          : 'bg-card/40 border-l-4 border-l-cyan-400/80'
      }`}>
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isAntiCheating ? (
              <Warning className="text-yellow-500" size={20} weight="fill" />
            ) : (
              <Info className="text-cyan-400" size={20} weight="fill" />
            )}
          </div>
          <div className="flex-1 text-sm text-foreground/90 whitespace-pre-line">
            {message}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
