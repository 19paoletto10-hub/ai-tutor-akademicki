import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { MentorMessage } from '@/components/MentorMessage'
import { TypingIndicator } from '@/components/TypingIndicator'
import { MentorSidebar } from '@/components/MentorSidebar'
import { truncateMessage, trimMessagesToLimit, safeStorageSet, safeStorageGet, injectCourseContext, getCustomMentorPrompt, getPersonalizationConfig, getCurriculumTopics, injectKnowledgeBase } from '@/lib/storage'
import { validateMessage } from '@/lib/validators'
import { ValidationBlockMessage } from '@/components/ValidationBlockMessage'
import {
  parseCurriculumTopics,
  getCurriculumProgress,
  setCurrentTopic,
  markTopicCompleted,
  getNextTopic,
  getPreviousTopic,
  flattenTopics,
  isAllCompleted,
  type CurriculumTopic
} from '@/lib/curriculum'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  validationBlock?: {
    type: 'anti-cheating' | 'off-topic'
    message: string
  }
}

const DEFAULT_SYSTEM_PROMPT = `Jesteś profesorem akademickim — autorytetem w dziedzinie omawianego kursu.
Prowadzisz studenta SEKWENCYJNIE przez terminologię i pojęcia kursu.

ZASADY SEKWENCYJNEGO NAUCZANIA:
- Gdy student wybiera temat lub mówi "Kontynuuj", ROZPOCZNIJ od tego tematu.
- Każdy temat omawiaj według schematu:
  1. DEFINICJA — precyzyjna, akademicka
  2. KONTEKST — gdzie to się stosuje, dlaczego jest ważne
  3. PRZYKŁAD — konkretny przypadek lub zastosowanie
  4. POWIĄZANIA — jak łączy się z poprzednimi/następnymi tematami
- Po omówieniu tematu, ZAWSZE podaj opcje kontynuacji.

STYL:
- Akademicki, profesorski, z pozycji autorytetu
- Zwięzłe zdania, precyzyjny język
- NIE odpowiadaj na pytania zupełnie spoza zakresu kursu
- Odpowiadaj po polsku

FORMAT ODPOWIEDZI:
1) **[TEMAT]: nazwa tematu**
2) **Definicja**: [precyzyjna definicja]
3) **Wyjaśnienie**: [kontekst, znaczenie, zastosowanie]
4) **Przykład**: [przypadek lub praktyczne zastosowanie]
5) **Źródła**: [jeśli znasz, podaj. Inaczej: "Wiedza ogólna."]
6) **Opcje**:
   [A] Kontynuuj do następnego punktu | [B] Wyjaśnij dokładniej

WAŻNE:
- Gdy student wybiera [A] — PRZEJDŹ do następnego tematu natychmiast
- Gdy student wybiera [B] — POGŁĘB aktualny temat (więcej przykładów, szczegółów)
  Po rozwinięciu ([B]) podaj TYLKO opcję [A] (BEZ [B]) — nie oferuj ponownego rozwinięcia!`

function getSystemPrompt(): string {
  const customPrompt = getCustomMentorPrompt()
  return customPrompt || DEFAULT_SYSTEM_PROMPT
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Witaj na wykładzie. 👨‍🏫 Jestem Twoim profesorem. Wybierz temat z panelu po prawej lub wpisz temat, który chcesz omówić. Poprowadzę Cię sekwencyjnie przez materiał.',
  timestamp: Date.now(),
}

const STORAGE_KEY = 'mentor_chat_history'
const MAX_MESSAGES = 50

export function MentorView() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = safeStorageGet<Message[]>(STORAGE_KEY, [])
    if (stored.length > 0) {
      return trimMessagesToLimit(stored, MAX_MESSAGES)
    }
    return [WELCOME_MESSAGE]
  })
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [discussedTopics, setDiscussedTopics] = useState<string[]>([])
  const [currentTopicName, setCurrentTopicName] = useState<string | null>(null)
  const [curriculumTopics, setCurriculumTopics] = useState<CurriculumTopic[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const curriculumMarkdown = getCurriculumTopics()
    if (curriculumMarkdown) {
      const parsed = parseCurriculumTopics(curriculumMarkdown)
      setCurriculumTopics(parsed)
    }
  }, [])

  useEffect(() => {
    const progress = getCurriculumProgress()
    if (progress.current_topic && curriculumTopics.length > 0) {
      const flattened = flattenTopics(curriculumTopics)
      const currentTopic = flattened.find(t => t.id === progress.current_topic)
      if (currentTopic) {
        setCurrentTopicName(currentTopic.name)
      }
    } else {
      setCurrentTopicName(null)
    }
  }, [curriculumTopics])

  useEffect(() => {
    const interval = setInterval(() => {
      const progress = getCurriculumProgress()
      if (progress.current_topic && curriculumTopics.length > 0) {
        const flattened = flattenTopics(curriculumTopics)
        const currentTopic = flattened.find(t => t.id === progress.current_topic)
        if (currentTopic) {
          setCurrentTopicName(currentTopic.name)
        }
      }
    }, 500)
    return () => clearInterval(interval)
  }, [curriculumTopics])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const trimmedMessages = trimMessagesToLimit(messages, MAX_MESSAGES)
    const truncatedMessages = trimmedMessages.map(msg => ({
      ...msg,
      content: truncateMessage(msg.content)
    }))
    safeStorageSet(STORAGE_KEY, truncatedMessages)
  }, [messages])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && curriculumTopics.length > 0) {
        const progress = getCurriculumProgress()
        if (!progress.current_topic) return

        if (e.key === 'ArrowRight') {
          e.preventDefault()
          const nextTopic = getNextTopic(progress.current_topic, curriculumTopics)
          if (nextTopic) {
            handleSend(`[A] Kontynuuj do następnego punktu`)
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          const prevTopic = getPreviousTopic(progress.current_topic, curriculumTopics)
          if (prevTopic) {
            setCurrentTopic(prevTopic.id)
            handleSend(`Omów temat: ${prevTopic.name}`)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [curriculumTopics])

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isGenerating) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setIsGenerating(true)

    const validationResult = await validateMessage(textToSend)
    
    if (!validationResult.allowed) {
      const blockMessage: Message = {
        id: `block-${Date.now()}`,
        role: 'assistant',
        content: validationResult.blockMessage || '',
        timestamp: Date.now(),
        validationBlock: {
          type: validationResult.blockReason!,
          message: validationResult.blockMessage || ''
        }
      }
      setMessages((current) => [...current, blockMessage])
      setIsGenerating(false)
      return
    }

    try {
      const conversationHistory = [...messages, userMessage]
        .map((msg) => `${msg.role === 'user' ? 'Student' : 'Profesor'}: ${msg.content}`)
        .join('\n\n')

      const promptText = `${injectKnowledgeBase(injectCourseContext(getSystemPrompt()), textToSend)}

Historia rozmowy:
${conversationHistory}

Odpowiedz na ostatnie pytanie studenta w sposób akademicki i sekwencyjny. Użyj markdown do formatowania odpowiedzi. Pamiętaj o podaniu opcji kontynuacji.`

      const response = await window.spark.llm(promptText, 'gpt-4o')

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }

      setMessages((current) => [...current, assistantMessage])

      const topicMatch = response.match(/\*\*\[TEMAT\]:\s*(.+?)\*\*/i)
      if (topicMatch && topicMatch[1]) {
        const newTopic = topicMatch[1].trim()
        setDiscussedTopics((current) => {
          if (!current.includes(newTopic)) {
            return [...current, newTopic]
          }
          return current
        })
      }

      if (curriculumTopics.length > 0) {
        if (textToSend.includes('Omów temat:')) {
          const requestedTopic = textToSend.replace('Omów temat:', '').trim()
          const flattened = flattenTopics(curriculumTopics)
          const topic = flattened.find(t => t.name === requestedTopic)
          if (topic) {
            setCurrentTopic(topic.id)
            setCurrentTopicName(topic.name)
          }
        } else if (textToSend.match(/\[A\]/i) || textToSend.toLowerCase().includes('kontynuuj')) {
          const progress = getCurriculumProgress()
          if (progress.current_topic) {
            markTopicCompleted(progress.current_topic)
            const nextTopic = getNextTopic(progress.current_topic, curriculumTopics)
            if (nextTopic) {
              setCurrentTopic(nextTopic.id)
              setCurrentTopicName(nextTopic.name)
            } else {
              const updatedProgress = getCurriculumProgress()
              if (isAllCompleted(curriculumTopics, updatedProgress.completed_topics)) {
                toast.success('🎉 Gratulacje! Ukończyłeś cały program kursu!', {
                  duration: 5000,
                  description: 'Gotowy na egzamin końcowy? 🎓'
                })
                localStorage.setItem('show_completion_egg', 'true')
              }
            }
          }
        }
      }
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
    setDiscussedTopics([])
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 lg:w-[70%] flex flex-col min-h-[calc(100vh-12rem)]">
        {currentTopicName && (
          <Badge className="mb-3 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-4 py-2 w-fit">
            📖 Aktualny temat: {currentTopicName}
          </Badge>
        )}
        
        <Card className="flex-1 bg-card/60 backdrop-blur-sm border-border/50 shadow-xl flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">{!messages || messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-md">
                  <div className="text-5xl">👨‍🏫</div>
                  <h3 className="text-xl font-semibold">Witaj na wykładzie!</h3>
                  <p className="text-muted-foreground">
                    Prowadzę Cię sekwencyjnie przez materiał kursowy.
                    Wybierz temat z panelu lub zadaj pytanie.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {(messages || []).map((message) => {
                    if (message.validationBlock) {
                      return (
                        <ValidationBlockMessage
                          key={message.id}
                          type={message.validationBlock.type}
                          message={message.validationBlock.message}
                        />
                      )
                    }
                    
                    return (
                      <MentorMessage 
                        key={message.id} 
                        message={message}
                        onOptionClick={handleSend}
                      />
                    )
                  })}
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
                placeholder="Wpisz temat lub wybierz opcję..."
                disabled={isGenerating}
                className="min-h-[60px] max-h-[200px] resize-none bg-background/50 border-border/50 focus:border-emerald-500"
                rows={2}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isGenerating}
                size="icon"
                className="h-[60px] w-[60px] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-400 hover:opacity-90 transition-opacity shrink-0"
              >
                <PaperPlaneTilt size={24} weight="fill" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <MentorSidebar 
        onSendPrompt={handleSend} 
        onClearChat={handleClearChat} 
        messages={messages}
        discussedTopics={discussedTopics}
      />
    </div>
  )
}
