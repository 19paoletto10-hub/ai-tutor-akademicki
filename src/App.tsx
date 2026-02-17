import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navigation, ViewType } from '@/components/Navigation'
import { ViewWrapper, PlaceholderView } from '@/components/ViewWrapper'
import { TutorView } from '@/components/TutorView'
import { Toaster } from '@/components/ui/sonner'

const viewContent = {
  mentor: {
    title: 'Prowadzenie Sekwencyjne',
    description: 'Sekwencyjne prowadzenie przez materiał — jak na wykładzie',
    emoji: '👨‍🏫',
  },
  exam: {
    title: 'Egzamin',
    description: 'Sprawdź swoją wiedzę — 20 pytań, 60 minut',
    emoji: '📝',
  },
  settings: {
    title: 'Ustawienia',
    description: 'Konfiguracja tematu kursu i promptów',
    emoji: '⚙️',
  },
}

function App() {
  const [activeView, setActiveView] = useState<ViewType>('tutor')

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      
      <main className="max-w-[1200px] mx-auto px-6 md:px-8 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {activeView === 'tutor' ? (
            <ViewWrapper key="tutor" viewId="tutor">
              <TutorView />
            </ViewWrapper>
          ) : (
            <ViewWrapper key={activeView} viewId={activeView}>
              <PlaceholderView
                title={viewContent[activeView].title}
                description={viewContent[activeView].description}
                emoji={viewContent[activeView].emoji}
              />
            </ViewWrapper>
          )}
        </AnimatePresence>
      </main>
      <Toaster />
    </div>
  )
}

export default App