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
import { trimMessagesToLimit, safeStorageSet, safeStorageGet, injectCourseContext, getCustomTutorPrompt, getPersonalizationConfig, injectLanguageInstruction, injectKnowledgeBase, splitLongMessage } from '@/lib/storage'
import { useUploadedMaterials, getKnowledgeBaseSummary } from '@/hooks/use-uploaded-materials'
import { QuizEvaluation } from '@/components/QuizEvaluationCard'
import { validateMessage, isVagueMessage, augmentContextualMessage } from '@/lib/validators'
import { ValidationBlockMessage } from '@/components/ValidationBlockMessage'
import { VagueSuggestionCard } from '@/components/VagueSuggestionCard'
import { llm, llmSimple, getErrorMessage, LlmError } from '@/lib/llm'
import { toast } from 'sonner'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isQuizQuestion?: boolean
  quizEvaluation?: QuizEvaluation
  validationBlock?: {
    type: 'anti-cheating' | 'off-topic'
    message: string
  }
  isVagueSuggestion?: boolean
  partInfo?: {
    partNumber: number
    totalParts: number
  }
}

const PROMPT_HISTORY_LIMIT = 10

const DEFAULT_SYSTEM_PROMPT = `Jesteś profesjonalnym tutorem akademickim. Twoim zadaniem jest AKTYWNIE uczyć i prowadzić studenta krok po kroku przez materiał kursowy.

WAŻNA ZASADA — GATING PEWNOŚCI:
Jeśli pytanie studenta jest NIEJASNE lub ZBYT OGÓLNE (np. "dalej", "?", "nie rozumiem", pojedyncza litera/cyfra bez kontekstu), zamiast odpowiadać na siłę, ZAPYTAJ o doprecyzowanie:
- "O który aspekt tematu pytasz dokładniej?"
- "Czy chcesz, żebym wyjaśnił [konkretne pojęcie] czy [inne pojęcie]?"
- "Powiedz mi więcej — co dokładnie sprawia trudność?"

Nie zgaduj — lepsza jest diagnoza niż błędna odpowiedź.

KRÓTKIE ODPOWIEDZI KONTEKSTOWE:
Jeśli student pisze krótką odpowiedź jak "A", "1", "tak", "kontynuuj" — odnieś ją do OSTATNIEGO tematu z rozmowy. Nie pytaj "o czym mowa?" — wiesz z kontekstu rozmowy.

TRYB AKTYWNEGO PROWADZENIA:
Gdy student wybiera temat lub zadaje pytanie, TY przejmij inicjatywę:
1. Wyjaśnij temat zwięźle: definicja → kluczowe wyjaśnienie
2. Podaj źródła jeśli je znasz
3. Na końcu zaproponuj: "Chcesz, żebym rozwinął przykłady, szczegóły lub podał więcej źródeł?"

WAŻNE: NIE dodawaj sekcji "Mini-sprawdzenie" ani quizu automatycznie - student sam zdecyduje kiedy chce quiz (przez przycisk).

STYL ODPOWIEDZI:
- Odpowiadaj ZWIĘŹLE i KONKRETNIE — podaj esencję tematu, nie rozwlekaj.
- Student może poprosić o rozwinięcie w kolejnych wiadomościach.
- ZAWSZE kończ myśl — NIGDY nie urywaj odpowiedzi w połowie zdania.
- Jeśli temat jest obszerny, podaj zwięzłe wyjaśnienie i zaproponuj rozwinięcie.

Zasady:
- Jeśli student prosi o gotowe rozwiązanie zadania/kolokwium, odmów i zaproponuj wskazówki oraz wyjaśnienie metody.
- Odpowiadaj po polsku.

FORMAT ODPOWIEDZI:
1) **Wyjaśnienie**
[Zwięzłe wyjaśnienie tematu — definicja i kluczowa intuicja]

2) **Krok po kroku**
[Opcjonalnie — jeśli dotyczy procedur/obliczeń]

3) **Źródła**
[Jeśli znasz źródła, podaj je. Jeśli nie — "Odpowiedź na podstawie wiedzy ogólnej."]

4) Zaproponuj: "Chcesz, żebym rozwinął [konkretny aspekt]?"

Jeśli nie znasz odpowiedzi — powiedz wprost, nie wymyślaj.`

function getSystemPrompt(): string {
  const customPrompt = getCustomTutorPrompt()
  const personalization = getPersonalizationConfig()
  const basePrompt = customPrompt || DEFAULT_SYSTEM_PROMPT
  return injectLanguageInstruction(basePrompt, personalization.tutorLanguage)
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Cześć! 👋 Jestem Twoim tutorem akademickim. Zadaj mi pytanie z materiału kursowego, a wyjaśnię Ci temat krok po kroku. Możesz też wybrać jedno z szybkich pytań po prawej stronie.',
  timestamp: Date.now(),
}

const STORAGE_KEY = 'tutor_chat_history'
const MAX_MESSAGES = 50

export function TutorView() {
  const { profile, getQuizAverage, addQuizGrade, addWeakTopic } = useStudentProfile()
  const { materials } = useUploadedMaterials()
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = safeStorageGet<Message[]>(STORAGE_KEY, [])
    if (stored.length > 0) {
      return trimMessagesToLimit(stored, MAX_MESSAGES)
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
    const trimmedMessages = trimMessagesToLimit(messages, MAX_MESSAGES)
    safeStorageSet(STORAGE_KEY, trimmedMessages)
  }, [messages])

  const isQuizAnswer = (userMessage: string, previousMessage: Message | undefined): boolean => {
    if (!previousMessage || previousMessage.role !== 'assistant') return false
    
    if (!previousMessage.isQuizQuestion && !previousMessage.content.includes('Mini-sprawdzenie')) {
      return false
    }
    
    const isShort = userMessage.length < 100
    const isQuestion = userMessage.includes('?') || userMessage.length > 150
    const isNewTopicRequest = /^(Wyjaśnij|Co to|Jak|Dlaczego|Powiedz|Pokaż)/i.test(userMessage.trim())
    
    if (isQuestion || isNewTopicRequest) {
      return false
    }
    
    return isShort
  }

  const extractQuizQuestion = (messageContent: string): string => {
    const lines = messageContent.split('\n').filter(line => line.trim())
    const quizIndex = lines.findIndex(line => line.includes('Mini-sprawdzenie'))
    
    if (quizIndex !== -1 && quizIndex + 1 < lines.length) {
      return lines.slice(quizIndex + 1).join('\n').trim()
    }
    
    return messageContent
  }

  const evaluateQuizAnswer = async (question: string, answer: string): Promise<QuizEvaluation | null> => {
    try {
      const promptText = `Jesteś egzaminatorem akademickim. Oceń odpowiedź studenta na pytanie kontrolne.

PYTANIE: ${question}
ODPOWIEDŹ STUDENTA: ${answer}

Oceń w skali 2-5 (polska skala):
- 5 (bardzo dobry): pełna, poprawna, głębokie zrozumienie
- 4 (dobry): poprawna, ale niepełna lub drobne braki
- 3 (dostateczny): częściowo poprawna, podstawowe zrozumienie
- 2 (niedostateczny): błędna lub brak zrozumienia

FORMAT ODPOWIEDZI (DOKŁADNIE):
OCENA: [2-5]
UZASADNIENIE: [1-2 zdania]
POPRAWNA ODPOWIEDŹ: [podaj poprawną odpowiedź]
WSKAZÓWKA: [jeśli ocena < 5, co poprawić]`

      const response = await llmSimple(promptText, 'gpt-4o', { maxTokens: 800 })
      
      const gradeMatch = response.match(/OCENA:\s*(\d)/)
      const justificationMatch = response.match(/UZASADNIENIE:\s*(.+?)(?=\n|POPRAWNA|$)/s)
      const correctAnswerMatch = response.match(/POPRAWNA ODPOWIEDŹ:\s*(.+?)(?=\n|WSKAZÓWKA|$)/s)
      const hintMatch = response.match(/WSKAZÓWKA:\s*(.+?)$/s)
      
      if (!gradeMatch) return null
      
      const grade = parseInt(gradeMatch[1])
      const justification = justificationMatch ? justificationMatch[1].trim() : 'Odpowiedź oceniona.'
      const correctAnswer = correctAnswerMatch ? correctAnswerMatch[1].trim() : ''
      const hint = hintMatch ? hintMatch[1].trim() : undefined
      
      return {
        grade,
        justification,
        correctAnswer,
        hint,
      }
    } catch (error) {
      console.error('Error evaluating quiz answer:', error)
      toast.error('Nie udało się ocenić odpowiedzi. Spróbuj ponownie.')
      return null
    }
  }

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isGenerating) return

    const hasHistory = messages.length > 1
    
    if (isVagueMessage(textToSend, hasHistory)) {
      setInput('')
      const suggestionMessage: Message = {
        id: `vague-help-${Date.now()}`,
        role: 'assistant',
        content: 'Wygląda na to, że dopiero zaczynasz! 😊',
        timestamp: Date.now(),
        isVagueSuggestion: true,
      }
      setMessages((current) => [...current, suggestionMessage])
      return
    }

    const previousMessage = messages.length > 0 ? messages[messages.length - 1] : undefined
    const lastAIMessage = previousMessage?.role === 'assistant' ? previousMessage.content : null
    
    const augmentedMessage = augmentContextualMessage(textToSend, lastAIMessage)

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    }

    const isAnswerToQuiz = isQuizAnswer(textToSend, previousMessage)

    setMessages((current) => [...current, userMessage])
    setInput('')
    
    if (!isAnswerToQuiz) {
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
    }

    setIsGenerating(true)

    try {
      if (isAnswerToQuiz && previousMessage) {
        const quizQuestion = extractQuizQuestion(previousMessage.content)
        const evaluation = await evaluateQuizAnswer(quizQuestion, textToSend)
        
        if (evaluation) {
          addQuizGrade(evaluation.grade)
          
          if (evaluation.grade <= 2) {
            const topicMatch = quizQuestion.match(/o\s+([^?]+)/i)
            if (topicMatch) {
              addWeakTopic(topicMatch[1].trim())
            }
          }
          
          const evaluationMessage: Message = {
            id: `evaluation-${Date.now()}`,
            role: 'assistant',
            content: `Twoja odpowiedź została oceniona.`,
            timestamp: Date.now(),
            quizEvaluation: evaluation,
          }
          
          setMessages((current) => [...current, evaluationMessage])
          setIsGenerating(false)
          return
        }
      }

      const isQuizRequest = textToSend.includes('[ACTION]') && textToSend.includes('mini-quiz')
      
      const quizAverage = getQuizAverage()
      const profileContext = `[PROFIL STUDENTA]
Poziom: ${profile.level}/5
Słabe tematy: ${profile.weak_topics.length > 0 ? profile.weak_topics.join(', ') : 'brak'}
Ostatnie błędy: ${profile.last_mistakes.length > 0 ? profile.last_mistakes.join(', ') : 'brak'}
Średnia quizów: ${quizAverage !== null ? quizAverage.toFixed(1) : 'brak danych'}

[PYTANIE STUDENTA]
${textToSend}`

      const recentMessages = [...messages, userMessage]
        .filter(msg => !msg.quizEvaluation)
        .slice(-PROMPT_HISTORY_LIMIT)
      
      const conversationHistory = recentMessages
        .map((msg) => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`)
        .join('\n\n')

      let systemPrompt = getSystemPrompt()
      
      if (isQuizRequest) {
        systemPrompt += `\n\nStudent prosi o mini-quiz. Wygeneruj JEDNO pytanie sprawdzające z ostatnio omawianego tematu.

FORMAT (DOKŁADNIE):
**Mini-sprawdzenie**
[Pytanie sprawdzające — otwarte lub z opcjami A/B/C/D]`
      }

      const promptText = `${injectKnowledgeBase(injectCourseContext(systemPrompt), textToSend)}

Historia rozmowy (ostatnie ${PROMPT_HISTORY_LIMIT} wiadomości):
${conversationHistory}

Odpowiedz na ostatnie pytanie studenta w sposób profesjonalny i pomocny. Użyj markdown do formatowania odpowiedzi. Uwzględnij profil studenta w swojej odpowiedzi - dostosuj poziom wyjaśnień do jego poziomu, zwróć szczególną uwagę na słabe tematy jeśli są powiązane z pytaniem.

WAŻNE: Odpowiedź MUSI być kompletna — zakończ każdą myśl, nie urywaj w połowie zdania. Jeśli temat jest obszerny, podaj zwięzłe wyjaśnienie i zaproponuj studentowi rozwinięcie szczegółów.`

      const llmResult = await llm(promptText, 'gpt-4o', { maxTokens: 2048 })
      let response = llmResult.content
      
      if (!llmResult.wasComplete) {
        response += '\n\n---\n*Chcesz, żebym rozwinął dalej? Wpisz "kontynuuj".*'
      }

      const messageParts = splitLongMessage(response)
      
      if (messageParts.length === 1) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
          isQuizQuestion: response.includes('Mini-sprawdzenie'),
        }
        setMessages((current) => [...current, assistantMessage])
      } else {
        const newMessages: Message[] = messageParts.map((part, index) => ({
          id: `assistant-${Date.now()}-part-${index}`,
          role: 'assistant',
          content: part,
          timestamp: Date.now() + index,
          isQuizQuestion: index === messageParts.length - 1 && response.includes('Mini-sprawdzenie'),
          partInfo: {
            partNumber: index + 1,
            totalParts: messageParts.length
          }
        }))
        setMessages((current) => [...current, ...newMessages])
      }
    } catch (error) {
      console.error('Error generating response:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: getErrorMessage(error),
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
                  {(messages || []).map((message, index) => {
                    if (message.validationBlock) {
                      return (
                        <ValidationBlockMessage
                          key={message.id}
                          type={message.validationBlock.type}
                          message={message.validationBlock.message}
                        />
                      )
                    }
                    
                    if (message.isVagueSuggestion) {
                      return (
                        <VagueSuggestionCard
                          key={message.id}
                          onSuggestionClick={(text) => handleSend(text)}
                        />
                      )
                    }
                    
                    const isLastAssistantMessage = 
                      message.role === 'assistant' && 
                      index === messages.length - 1
                    
                    return (
                      <ChatMessage 
                        key={message.id} 
                        message={message}
                        showActionButtons={isLastAssistantMessage && !message.quizEvaluation}
                        onAction={handleSend}
                        isGenerating={isGenerating}
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
            {getKnowledgeBaseSummary(materials) && (
              <div className="mb-3 text-sm text-emerald-400 flex items-center gap-2">
                <span>📚</span>
                <span>{getKnowledgeBaseSummary(materials)}</span>
              </div>
            )}
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

      <TutorSidebar onSendPrompt={handleSend} onClearChat={handleClearChat} messages={messages} />
    </div>
  )
}
