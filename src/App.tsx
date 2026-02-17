import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navigation, ViewType } from '@/components/Navigation'
import { ViewWrapper } from '@/components/ViewWrapper'
import { TutorView } from '@/components/TutorView'
import { MentorView } from '@/components/MentorView'
import { SettingsView } from '@/components/SettingsView'
import { ExamView } from '@/components/ExamView'
import { OnboardingOverlay } from '@/components/OnboardingOverlay'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const [activeView, setActiveView] = useState<ViewType>('tutor')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === '1') {
        setActiveView('tutor')
      } else if (e.key === '2') {
        setActiveView('mentor')
      } else if (e.key === '3') {
        setActiveView('exam')
      } else if (e.key === '4') {
        setActiveView('settings')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      
      <main className="max-w-[1200px] mx-auto px-6 md:px-8 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {activeView === 'tutor' ? (
            <ViewWrapper key="tutor" viewId="tutor">
              <TutorView />
            </ViewWrapper>
          ) : activeView === 'mentor' ? (
            <ViewWrapper key="mentor" viewId="mentor">
              <MentorView />
            </ViewWrapper>
          ) : activeView === 'exam' ? (
            <ViewWrapper key="exam" viewId="exam">
              <ExamView />
            </ViewWrapper>
          ) : activeView === 'settings' ? (
            <ViewWrapper key="settings" viewId="settings">
              <SettingsView />
            </ViewWrapper>
          ) : null}
        </AnimatePresence>
      </main>
      <OnboardingOverlay />
      <Toaster position="top-right" />
    </div>
  )
}

export default App