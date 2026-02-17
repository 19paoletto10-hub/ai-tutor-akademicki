import { Button } from '@/components/ui/button'
import { Target, MagnifyingGlass, Lightbulb, NotePencil } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface ActionButtonsProps {
  onAction: (actionMessage: string) => void
  disabled?: boolean
}

export function ActionButtons({ onAction, disabled }: ActionButtonsProps) {
  const actions = [
    {
      emoji: '🎯',
      label: 'Mini Quiz',
      icon: Target,
      message: '[ACTION] Wygeneruj mini-quiz z ostatnio omawianego tematu.',
    },
    {
      emoji: '🔍',
      label: 'Wyjaśnij głębiej',
      icon: MagnifyingGlass,
      message: '[ACTION] Proszę wyjaśnij głębiej ostatni temat — podaj więcej szczegółów i kontekstu.',
    },
    {
      emoji: '💡',
      label: 'Pokaż przykład',
      icon: Lightbulb,
      message: '[ACTION] Podaj praktyczny przykład zastosowania ostatnio omawianego tematu.',
    },
    {
      emoji: '📝',
      label: 'Ćwiczenie',
      icon: NotePencil,
      message: '[ACTION] Wygeneruj ćwiczenie praktyczne z ostatniego tematu — z instrukcjami krok po kroku.',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="flex flex-wrap gap-2 mt-3"
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onAction(action.message)}
          className="h-8 px-3 text-xs bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-accent/50 hover:-translate-y-0.5 transition-all shadow-sm hover:shadow-md"
        >
          <span className="mr-1.5">{action.emoji}</span>
          {action.label}
        </Button>
      ))}
    </motion.div>
  )
}
