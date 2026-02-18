### [src/components/TutorView.tsx](src/components/TutorView.tsx)

**1. Import (linia 1)** — dodaj `useCallback` i `ArrowDown`:
```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
// ...
import { PaperPlaneTilt, ArrowDown } from '@phosphor-icons/react'
```

**2. Stan i scroll (~linia 107-115)** — zamień blok z `messagesEndRef` / `scrollToBottom`:
```tsx
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    setShowScrollButton(distanceFromBottom > 150)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])
```

**3. Kontener główny (return)** — stała wysokość + scroll container z ref:
```tsx
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 lg:w-[70%] flex flex-col min-h-0">
        <Card className="flex-1 bg-card/60 backdrop-blur-sm border-border/50 shadow-xl flex flex-col overflow-hidden min-h-0">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
          >
```

**4. Przycisk scroll-to-bottom** — dodaj między `</div>` (koniec scroll area) a `<div className="border-t">` (input area):
```tsx
              </> 
            )}
          </div>

          {showScrollButton && (
            <div className="relative">
              <Button
                onClick={() => scrollToBottom()}
                size="icon"
                variant="secondary"
                className="absolute -top-12 right-4 z-10 rounded-full shadow-lg h-9 w-9 bg-background/90 border border-border/50 hover:bg-background transition-all"
                aria-label="Przewiń do najnowszej wiadomości"
              >
                <ArrowDown size={18} />
              </Button>
            </div>
          )}

          <div className="border-t border-border/50 p-4 md:p-6 bg-muted/20 shrink-0">
```

---

### [src/components/MentorView.tsx](src/components/MentorView.tsx)

Identyczne zmiany — **linia 1** dodaj `useCallback` i `ArrowDown`, plus:

**1. Import:**
```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
// ...
import { PaperPlaneTilt, ArrowDown } from '@phosphor-icons/react'
```

**2. Stan** — po `textareaRef` dodaj:
```tsx
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
```

**3. scrollToBottom** — zamień na:
```tsx
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    setShowScrollButton(distanceFromBottom > 150)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])
```

**4. Kontener główny:**
```tsx
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 lg:w-[70%] flex flex-col min-h-0">
        {currentTopicName && (
          <Badge className="mb-3 ... shrink-0">
```

**5. Card + scroll area:**
```tsx
        <Card className="flex-1 bg-card/60 backdrop-blur-sm border-border/50 shadow-xl flex flex-col overflow-hidden min-h-0">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
          >
```

**6. Przycisk scroll-to-bottom** — identycznie jak w TutorView, między scroll area a input area. Input area dostaje `shrink-0`.

---

### Kluczowe zmiany CSS:
| Element | Było | Jest |
|---|---|---|
| Wrapper | `min-h-[calc(100vh-12rem)]` | `h-[calc(100vh-8rem)]` — stała wysokość |
| Kolumna chatu | brak `min-h-0` | `min-h-0` — pozwala flex child na shrink |
| Card | brak `min-h-0` | `min-h-0` — j.w. |
| Scroll area | `overflow-y-auto` | + `ref`, `onScroll`, `scroll-smooth` |
| Input area | brak | `shrink-0` — nie kurczy się |
| **Nowy** | — | Floating przycisk ↓ gdy >150px od dołu |
