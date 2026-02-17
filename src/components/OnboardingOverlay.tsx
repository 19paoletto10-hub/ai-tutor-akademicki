import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from '@phosphor-icons/react'

export function OnboardingOverlay() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onboardingDone = localStorage.getItem('onboarding_done')
    const hasAnyData = 
      localStorage.getItem('tutor_chat_history') ||
      localStorage.getItem('mentor_chat_history') ||
      localStorage.getItem('student_profile') ||
      localStorage.getItem('course_config')
    
    if (!onboardingDone && !hasAnyData) {
      setTimeout(() => setIsVisible(true), 500)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('onboarding_done', 'true')
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="max-w-lg w-full p-8 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🎓</div>
                  <h2 className="text-2xl font-bold gradient-text">
                    Witaj w AI Tutor Akademicki!
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="hover:bg-muted/50"
                  aria-label="Zamknij"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-muted-foreground leading-relaxed">
                  Zanim zaczniesz swoją przygodę z nauką, wykonaj te trzy proste kroki:
                </p>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      1
                    </div>
                    <p className="text-sm leading-relaxed">
                      Przejdź do <span className="font-medium text-foreground">⚙️ Ustawienia</span> i skonfiguruj temat kursu
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      2
                    </div>
                    <p className="text-sm leading-relaxed">
                      Wklej tematy programu (opcjonalnie) dla śledzenia postępu
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      3
                    </div>
                    <p className="text-sm leading-relaxed">
                      Wróć do <span className="font-medium text-foreground">🎓 Tutor</span> lub <span className="font-medium text-foreground">👨‍🏫 Mentor</span> i zacznij się uczyć!
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleDismiss}
                className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-opacity"
                size="lg"
                aria-label="Rozpocznij"
              >
                Rozpocznij →
              </Button>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
