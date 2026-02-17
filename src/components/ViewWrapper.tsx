import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'

interface ViewWrapperProps {
  children: React.ReactNode
  viewId: string
}

export function ViewWrapper({ children, viewId }: ViewWrapperProps) {
  return (
    <motion.div
      key={viewId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
      role="tabpanel"
      id={`${viewId}-panel`}
    >
      {children}
    </motion.div>
  )
}

interface PlaceholderViewProps {
  title: string
  description: string
  emoji: string
}

export function PlaceholderView({ title, description, emoji }: PlaceholderViewProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
    >
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl p-8 md:p-10">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="text-6xl md:text-7xl">{emoji}</div>
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {title}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
