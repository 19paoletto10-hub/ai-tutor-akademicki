import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { ChatMessage } from '@/components/ChatMessage'
import { TypingIndicator } from '@/components/TypingIndicator'
import { TutorSidebar } from '@/components/TutorSidebar'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const SYSTEM_PROMPT = `Jesteś profesjonalnym tutorem akademickim. Twoja rola to:

1. Odpowiadać na pytania studentów w sposób jasny, szczegółowy i zrozumiały
2. Rozwijać odpowiedzi krok po kroku, wyjaśniając podstawowe koncepcje
3. Podawać przykłady praktyczne, które ułatwiają zrozumienie
4. Używać języka polskiego w sposób formalny, ale przystępny
5. Formatować odpowiedzi z użyciem markdown dla lepszej czytelności:
   - Używaj nagłówków (##, ###) dla struktury
   - Używaj list punktowanych i numerowanych
   - Używaj bloków kodu dla przykładów technicznych
   - Używaj pogrubienia dla kluczowych terminów
6. Zachęcać do zadawania pytań uzupełniających
7. Być cierpliwym i pomocnym, jak prawdziwy nauczyciel akademicki

Odpowiadaj zawsze merytorycznie i staraj się być jak najbardziej pomocny dla studenta.`

export function TutorView() {
  const [messages, setMessages] = useKV<Message[]>('tutor-messages', [])
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

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isGenerating) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    }

    setMessages((current) => [...(current || []), userMessage])
    setInput('')
    setIsGenerating(true)

    try {
      const currentMessages = messages || []
      const conversationHistory = [...currentMessages, userMessage]
        .map((msg) => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`)
        .join('\n\n')

      const promptText = `${SYSTEM_PROMPT}

Historia rozmowy:
${conversationHistory}

Odpowiedz na ostatnie pytanie studenta w sposób profesjonalny i pomocny. Użyj markdown do formatowania odpowiedzi.`

      const response = await window.spark.llm(promptText, 'gpt-4o')

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }

      setMessages((current) => [...(current || []), assistantMessage])
    } catch (error) {
      console.error('Error generating response:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd podczas generowania odpowiedzi. Spróbuj ponownie.',
        timestamp: Date.now(),
      }
      setMessages((current) => [...(current || []), errorMessage])
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
    setMessages([])
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
