import { motion } from 'framer-motion'

export type ViewType = 'tutor' | 'mentor' | 'exam' | 'settings'

interface NavigationProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const navItems: { id: ViewType; label: string; emoji: string }[] = [
  { id: 'tutor', label: 'Tutor', emoji: '🎓' },
  { id: 'mentor', label: 'Mentor', emoji: '👨‍🏫' },
  { id: 'exam', label: 'Egzamin', emoji: '📝' },
  { id: 'settings', label: 'Ustawienia', emoji: '⚙️' },
]

export function Navigation({ activeView, onViewChange }: NavigationProps) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              <span className="gradient-text">AI Tutor Akademicki</span>
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-medium tracking-wider uppercase bg-muted/50 text-muted-foreground rounded-md border border-border">
              v1.0
            </span>
          </div>

          <nav className="flex items-center gap-2" role="tablist">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  relative px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium
                  transition-all duration-200 ease-out
                  hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring
                  ${
                    activeView === item.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }
                `}
                role="tab"
                aria-selected={activeView === item.id}
                aria-controls={`${item.id}-panel`}
              >
                <span className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-base md:text-lg">{item.emoji}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
                {activeView === item.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 gradient-border"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-full" />
                  </motion.div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
