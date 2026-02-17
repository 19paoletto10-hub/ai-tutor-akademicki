import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { ChatMessage } from '@/components/ChatMessage'
import { TypingIndicator } from '@/components/TypingIndicator'
import { TutorSidebar } from '@/components/TutorSidebar'
import { useStudentProfile } from '@/hooks/use-student-profile'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const SYSTEM_PROMPT = `Jesteś profesjonalnym tutorem akademickim. Twoim zadaniem jest AKTYWNIE uczyć i prowadzić studenta krok po kroku przez materiał kursowy.

TRYB AKTYWNEGO PROWADZENIA:
Gdy student wybiera temat lub zadaje pytanie, TY przejmij inicjatywę:
1. Wyjaśnij temat według schematu: definicja → intuicja → przykład
2. Podaj źródła jeśli je znasz

WAŻNE: NIE dodawaj sekcji "Mini-sprawdzenie" ani quizu automatycznie - student sam zdecyduje kiedy chce quiz (przez przycisk).

Zasady:
- Jeśli student prosi o gotowe rozwiązanie zadania/kolokwium, odmów i zaproponuj wskazówki oraz wyjaśnienie metody.
- Odpowiadaj po polsku.

FORMAT ODPOWIEDZI:
1) **Wyjaśnienie**
[Twoje wyjaśnienie tematu - definicja, intuicja, przykład]

2) **Krok po kroku**
[Opcjonalnie - jeśli dotyczy procedur/obliczeń]

3) **Źródła**
[Jeśli znasz źródła, podaj je. Jeśli nie — napisz "Odpowiedź na podstawie wiedzy ogólnej."]

Jeśli nie znasz odpowiedzi — powiedz wprost, nie wymyślaj.`

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Cześć! 👋 Jestem Twoim tutorem akademickim. Zadaj mi pytanie z materiału kursowego, a wyjaśnię Ci temat krok po kroku. Możesz też wybrać jedno z szybkich pytań po prawej stronie.',
  timestamp: Date.now(),
}

const STORAGE_KEY = 'tutor_chat_history'
const MAX_MESSAGES = 50

export function TutorView() {
  const { profile, getQuizAverage } = useStudentProfile()
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Message[]
        return parsed.slice(-MAX_MESSAGES)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
    return [WELCOME_MESSAGE]
  })
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
    } catch (error) {
      console.error('Error saving chat history:', error)
    }
  }, [messages])

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isGenerating) return

    const quizAverage = getQuizAverage()
    const profileContext = `[PROFIL STUDENTA]
Poziom: ${profile.level}/5
Słabe tematy: ${profile.weak_topics.length > 0 ? profile.weak_topics.join(', ') : 'brak'}
Ostatnie błędy: ${profile.last_mistakes.length > 0 ? profile.last_mistakes.join(', ') : 'brak'}
Średnia quizów: ${quizAverage !== null ? quizAverage.toFixed(1) : 'brak danych'}

[PYTANIE STUDENTA]
${textToSend}`

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setIsGenerating(true)

    try {
      const conversationHistory = [...messages, userMessage]
        .map((msg) => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`)
        .join('\n\n')

      const promptText = `${SYSTEM_PROMPT}

Historia rozmowy:
${conversationHistory}

Odpowiedz na ostatnie pytanie studenta w sposób profesjonalny i pomocny. Użyj markdown do formatowania odpowiedzi. Uwzględnij profil studenta w swojej odpowiedzi - dostosuj poziom wyjaśnień do jego poziomu, zwróć szczególną uwagę na słabe tematy jeśli są powiązane z pytaniem.`

      const response = await window.spark.llm(promptText, 'gpt-4o')

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (error) {
      console.error('Error generating response:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd podczas generowania odpowiedzi. Spróbuj ponownie.',
        timestamp: Date.now(),
      }
      setMessages((current) => [...current, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE])
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 lg:w-[70%] flex flex-col min-h-[calc(100vh-12rem)]">
        <Card className="flex-1 bg-card/60 backdrop-blur-sm border-border/50 shadow-xl flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {!messages || messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-md">
                  <div className="text-5xl">🎓</div>
                  <h3 className="text-xl font-semibold">Witaj w trybie Tutor!</h3>
                  <p className="text-muted-foreground">
                    Zadaj pytanie, a ja postaram się odpowiedzieć krok po kroku.
                    Możesz zapytać o dowolny temat związany z kursem.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {(messages || []).map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                </AnimatePresence>
                {isGenerating && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="border-t border-border/50 p-4 md:p-6 bg-muted/20">
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zadaj pytanie..."
                disabled={isGenerating}
                className="min-h-[60px] max-h-[200px] resize-none bg-background/50 border-border/50 focus:border-ring"
                rows={2}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isGenerating}
                size="icon"
                className="h-[60px] w-[60px] bg-gradient-to-br from-primary via-secondary to-accent hover:opacity-90 transition-opacity shrink-0"
              >
                <PaperPlaneTilt size={24} weight="fill" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <TutorSidebar onSendPrompt={handleSend} onClearChat={handleClearChat} />
    </div>
  )
}
