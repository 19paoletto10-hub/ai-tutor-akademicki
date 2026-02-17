import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowLeft, ArrowRight, Check, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useStudentProfile } from '@/hooks/use-student-profile'
import { safeStorageGet } from '@/lib/storage'

interface ExamQuestion {
  id: number
  question: string
  type: 'single' | 'multiple'
  options: string[]
  correct: string
}

interface ExamState {
  questions: ExamQuestion[]
  currentQuestionIndex: number
  answers: Record<number, string[]>
  timeRemaining: number
  startTime: number
}

interface ExamResults {
  score: number
  total: number
  percentage: number
  timeUsed: number
  grade: number
  gradeText: string
  correctAnswers: Record<number, boolean>
}

type ExamPhase = 'start' | 'generating' | 'questions' | 'results' | 'review'

const EXAM_DURATION = 60 * 60
const TOTAL_QUESTIONS = 20

export function ExamView() {
  const [phase, setPhase] = useState<ExamPhase>('start')
  const [examState, setExamState] = useState<ExamState | null>(null)
  const [results, setResults] = useState<ExamResults | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const { addQuizGrade } = useStudentProfile()

  useEffect(() => {
    const savedState = localStorage.getItem('exam_state')
    if (savedState) {
      try {
        const state = JSON.parse(savedState) as ExamState
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
        if (elapsed < EXAM_DURATION) {
          state.timeRemaining = EXAM_DURATION - elapsed
          setExamState(state)
          setPhase('questions')
        } else {
          localStorage.removeItem('exam_state')
        }
      } catch (error) {
        console.error('Error restoring exam state:', error)
        localStorage.removeItem('exam_state')
      }
    }
  }, [])

  useEffect(() => {
    if (phase === 'questions' && examState) {
      const interval = setInterval(() => {
        setExamState((current) => {
          if (!current) return null
          const newTime = current.timeRemaining - 1
          if (newTime <= 0) {
            handleSubmitExam()
            return current
          }
          const updated = { ...current, timeRemaining: newTime }
          localStorage.setItem('exam_state', JSON.stringify(updated))
          return updated
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [phase, examState])

  const startExam = async () => {
    setPhase('generating')
    
    try {
      const courseConfig = safeStorageGet<{ courseName?: string; courseDescription?: string } | null>('course_config', null)
      const courseName = courseConfig?.courseName || 'Temat ogólny'
      const courseDescription = courseConfig?.courseDescription || ''

      const systemPrompt = `Wygeneruj dokładnie 20 pytań egzaminacyjnych z tematu: ${courseName}.
${courseDescription ? `\nOpis kursu: ${courseDescription}` : ''}

FORMAT — zwróć TYLKO JSON array, bez dodatkowego tekstu:
[
  {
    "id": 1,
    "question": "Treść pytania",
    "type": "single",
    "options": ["A) opcja 1", "B) opcja 2", "C) opcja 3", "D) opcja 4"],
    "correct": "A"
  },
  {
    "id": 2,
    "question": "Treść pytania wielokrotnego wyboru",
    "type": "multiple",
    "options": ["A) opcja 1", "B) opcja 2", "C) opcja 3", "D) opcja 4"],
    "correct": "A,C"
  }
]

Zasady:
- 15 pytań jednokrotnego wyboru (type: "single")
- 5 pytań wielokrotnego wyboru (type: "multiple"), oznacz je "(wielokrotny wybór)" w treści
- Pytania od łatwych do trudnych
- 4 opcje odpowiedzi (A-D) do każdego pytania
- Pytania powinny pokrywać różne aspekty tematu`

      const promptText = `${systemPrompt}`
      const response = await window.spark.llm(promptText, 'gpt-4o', true)
      
      const parsed = JSON.parse(response)
      let questions: ExamQuestion[]
      
      if (Array.isArray(parsed)) {
        questions = parsed
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions
      } else {
        throw new Error('Invalid response format')
      }

      questions = questions.map((q, index) => ({ ...q, id: index + 1 }))
      
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]]
      }

      const newState: ExamState = {
        questions,
        currentQuestionIndex: 0,
        answers: {},
        timeRemaining: EXAM_DURATION,
        startTime: Date.now(),
      }

      setExamState(newState)
      localStorage.setItem('exam_state', JSON.stringify(newState))
      setPhase('questions')
      toast.success('Egzamin rozpoczęty! Powodzenia!')
    } catch (error) {
      console.error('Error generating exam:', error)
      toast.error('Nie udało się wygenerować pytań. Spróbuj ponownie.')
      setPhase('start')
    }
  }

  const handleAnswerChange = (questionId: number, option: string, type: 'single' | 'multiple') => {
    setExamState((current) => {
      if (!current) return null
      
      let newAnswers: Record<number, string[]>
      
      if (type === 'single') {
        newAnswers = { ...current.answers, [questionId]: [option] }
      } else {
        const currentAnswers = current.answers[questionId] || []
        if (currentAnswers.includes(option)) {
          newAnswers = {
            ...current.answers,
            [questionId]: currentAnswers.filter((a) => a !== option),
          }
        } else {
          newAnswers = { ...current.answers, [questionId]: [...currentAnswers, option] }
        }
      }

      const updated = { ...current, answers: newAnswers }
      localStorage.setItem('exam_state', JSON.stringify(updated))
      return updated
    })
  }

  const navigateToQuestion = (index: number) => {
    setExamState((current) => {
      if (!current) return null
      return { ...current, currentQuestionIndex: index }
    })
  }

  const handleSubmitExam = () => {
    if (!examState) return

    const timeUsed = EXAM_DURATION - examState.timeRemaining
    const correctAnswers: Record<number, boolean> = {}
    let correctCount = 0

    examState.questions.forEach((q) => {
      const userAnswers = examState.answers[q.id] || []
      const correctAnswerList = q.correct.split(',').map((a) => a.trim())
      
      const isCorrect =
        userAnswers.length === correctAnswerList.length &&
        userAnswers.every((a) => correctAnswerList.includes(a))
      
      correctAnswers[q.id] = isCorrect
      if (isCorrect) correctCount++
    })

    const percentage = Math.round((correctCount / TOTAL_QUESTIONS) * 100)
    let grade: number
    let gradeText: string

    if (percentage >= 90) {
      grade = 5
      gradeText = 'bardzo dobry'
    } else if (percentage >= 75) {
      grade = 4
      gradeText = 'dobry'
    } else if (percentage >= 60) {
      grade = 3
      gradeText = 'dostateczny'
    } else {
      grade = 2
      gradeText = 'niedostateczny'
    }

    const examResults: ExamResults = {
      score: correctCount,
      total: TOTAL_QUESTIONS,
      percentage,
      timeUsed,
      grade,
      gradeText,
      correctAnswers,
    }

    setResults(examResults)
    addQuizGrade(grade)
    localStorage.removeItem('exam_state')
    setPhase('results')
  }

  const handleFinishClick = () => {
    if (!examState) return
    
    const unansweredCount = examState.questions.filter(
      (q) => !examState.answers[q.id] || examState.answers[q.id].length === 0
    ).length

    if (unansweredCount > 0) {
      setShowConfirmDialog(true)
    } else {
      handleSubmitExam()
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const formatTimeUsed = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const getTimerColor = (timeRemaining: number): string => {
    if (timeRemaining > 300) return 'text-emerald-400'
    if (timeRemaining > 60) return 'text-amber-400 animate-pulse'
    return 'text-red-400 animate-bounce'
  }

  const getGradeEmoji = (grade: number): string => {
    if (grade === 5) return '🌟'
    if (grade === 4) return '👍'
    if (grade === 3) return '📝'
    return '📚'
  }

  if (phase === 'start') {
    const courseConfig = safeStorageGet<{ courseName?: string; courseDescription?: string } | null>('course_config', null)
    const courseName = courseConfig?.courseName || 'Temat ogólny'

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-2xl mx-auto bg-card/40 backdrop-blur-sm border-border/50">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-8 border-b border-border/50">
            <h1 className="text-3xl font-bold text-center gradient-text">
              📝 Egzamin próbny
            </h1>
          </div>
          
          <div className="p-8 space-y-6">
            <p className="text-lg text-foreground/90 text-center">
              Sprawdź swoją wiedzę! 20 pytań, 60 minut. Pytania generowane na podstawie tematu kursu.
            </p>
            
            <div className="bg-muted/30 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Temat egzaminu:</p>
              <p className="text-xl font-semibold text-foreground">{courseName}</p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={startExam}
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                🚀 Rozpocznij egzamin
              </Button>
            </div>

            <p className="text-sm text-center text-muted-foreground italic">
              Pytania są losowane — każdy egzamin jest inny!
            </p>
          </div>
        </Card>
      </motion.div>
    )
  }

  if (phase === 'generating') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <Card className="p-12 text-center bg-card/40 backdrop-blur-sm border-border/50">
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent mx-auto" />
            <p className="text-xl text-foreground">Generuję pytania egzaminacyjne... ⏳</p>
            <p className="text-sm text-muted-foreground">To może chwilę potrwać</p>
          </div>
        </Card>
      </motion.div>
    )
  }

  if (phase === 'questions' && examState) {
    const currentQuestion = examState.questions[examState.currentQuestionIndex]
    const userAnswers = examState.answers[currentQuestion.id] || []
    const unansweredCount = examState.questions.filter(
      (q) => !examState.answers[q.id] || examState.answers[q.id].length === 0
    ).length

    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between bg-card/40 backdrop-blur-sm border border-border/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">
              Pytanie {examState.currentQuestionIndex + 1} / {TOTAL_QUESTIONS}
            </div>
            <div className={`text-2xl font-mono font-bold ${getTimerColor(examState.timeRemaining)}`}>
              {formatTime(examState.timeRemaining)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {examState.questions.map((q, index) => {
              const isAnswered = examState.answers[q.id] && examState.answers[q.id].length > 0
              const isCurrent = index === examState.currentQuestionIndex

              return (
                <button
                  key={q.id}
                  onClick={() => navigateToQuestion(index)}
                  className={`w-10 h-10 rounded-full font-medium transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-white scale-110 shadow-lg'
                      : isAnswered
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted/50 text-muted-foreground border border-border/50'
                  }`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          <Card className="bg-card/40 backdrop-blur-sm border-border/50 p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <h2 className="text-2xl font-semibold text-foreground flex-1">
                  {currentQuestion.question}
                </h2>
                {currentQuestion.type === 'multiple' && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/50">
                    (wielokrotny wybór)
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const optionLetter = option.charAt(0)
                  const isSelected = userAnswers.includes(optionLetter)

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswerChange(currentQuestion.id, optionLetter, currentQuestion.type)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-md'
                          : 'border-border/50 bg-muted/20 hover:border-amber-500/50 hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500'
                              : 'border-muted-foreground/50'
                          }`}
                        >
                          {isSelected && <Check className="text-white" size={16} weight="bold" />}
                        </div>
                        <span className="text-foreground">{option}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={() => navigateToQuestion(examState.currentQuestionIndex - 1)}
              disabled={examState.currentQuestionIndex === 0}
              variant="outline"
              className="border-border/50"
            >
              <ArrowLeft className="mr-2" /> Poprzednie
            </Button>

            <Button
              onClick={handleFinishClick}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              Zakończ egzamin
            </Button>

            <Button
              onClick={() => navigateToQuestion(examState.currentQuestionIndex + 1)}
              disabled={examState.currentQuestionIndex === examState.questions.length - 1}
              variant="outline"
              className="border-border/50"
            >
              Następne <ArrowRight className="ml-2" />
            </Button>
          </div>
        </motion.div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Czy na pewno chcesz zakończyć?</AlertDialogTitle>
              <AlertDialogDescription>
                Nie odpowiedziałeś na {unansweredCount} {unansweredCount === 1 ? 'pytanie' : 'pytań'}. Możesz wrócić i uzupełnić odpowiedzi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Wróć do egzaminu</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmitExam}>
                Zakończ mimo to
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  if (phase === 'results' && results && examState) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-3xl mx-auto bg-card/40 backdrop-blur-sm border-border/50">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-8 border-b border-border/50">
            <h1 className="text-3xl font-bold text-center gradient-text mb-4">
              📊 Wyniki egzaminu
            </h1>
          </div>

          <div className="p-8 space-y-8">
            <div className="text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted/30"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - results.percentage / 100)}`}
                    className="text-amber-500 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl font-bold gradient-text">{results.percentage}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-2xl font-semibold text-foreground">
                  {results.score} / {results.total} poprawnych odpowiedzi
                </p>
                <p className="text-lg text-muted-foreground">
                  Czas: {formatTimeUsed(results.timeUsed)} / 60:00
                </p>
              </div>

              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-8 py-4 rounded-lg border border-amber-500/30">
                <span className="text-4xl">{getGradeEmoji(results.grade)}</span>
                <div className="text-left">
                  <p className="text-3xl font-bold text-foreground">{results.grade}</p>
                  <p className="text-sm text-muted-foreground">({results.gradeText})</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={() => setPhase('review')}
                size="lg"
                variant="outline"
                className="border-border/50"
              >
                📋 Przejrzyj odpowiedzi
              </Button>
              <Button
                onClick={() => {
                  setPhase('start')
                  setExamState(null)
                  setResults(null)
                }}
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                🔄 Nowy egzamin
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  if (phase === 'review' && results && examState) {
    const currentQuestion = examState.questions[examState.currentQuestionIndex]
    const userAnswers = examState.answers[currentQuestion.id] || []
    const correctAnswerList = currentQuestion.correct.split(',').map((a) => a.trim())
    const isCorrect = results.correctAnswers[currentQuestion.id]

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setPhase('results')}
            variant="outline"
            className="border-border/50"
          >
            <ArrowLeft className="mr-2" /> Powrót do wyników
          </Button>
          <div className="text-sm text-muted-foreground">
            Pytanie {examState.currentQuestionIndex + 1} / {TOTAL_QUESTIONS}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {examState.questions.map((q, index) => {
            const isAnsweredCorrectly = results.correctAnswers[q.id]
            const isCurrent = index === examState.currentQuestionIndex

            return (
              <button
                key={q.id}
                onClick={() => navigateToQuestion(index)}
                className={`w-10 h-10 rounded-full font-medium transition-all ${
                  isCurrent
                    ? 'scale-110 shadow-lg ring-2 ring-amber-500'
                    : ''
                } ${
                  isAnsweredCorrectly
                    ? 'bg-emerald-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {index + 1}
              </button>
            )
          })}
        </div>

        <Card className="bg-card/40 backdrop-blur-sm border-border/50 p-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <h2 className="text-2xl font-semibold text-foreground flex-1">
                {currentQuestion.question}
              </h2>
              <Badge
                variant="secondary"
                className={isCorrect ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-red-500/20 text-red-300 border-red-500/50'}
              >
                {isCorrect ? <Check className="mr-1" size={16} weight="bold" /> : <X className="mr-1" size={16} weight="bold" />}
                {isCorrect ? 'Poprawnie' : 'Błędnie'}
              </Badge>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const optionLetter = option.charAt(0)
                const isUserAnswer = userAnswers.includes(optionLetter)
                const isCorrectAnswer = correctAnswerList.includes(optionLetter)

                return (
                  <div
                    key={option}
                    className={`p-4 rounded-lg border-2 ${
                      isCorrectAnswer
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : isUserAnswer
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-border/50 bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isCorrectAnswer
                            ? 'border-emerald-500 bg-emerald-500'
                            : isUserAnswer
                            ? 'border-red-500 bg-red-500'
                            : 'border-muted-foreground/50'
                        }`}
                      >
                        {isCorrectAnswer && <Check className="text-white" size={16} weight="bold" />}
                        {isUserAnswer && !isCorrectAnswer && <X className="text-white" size={16} weight="bold" />}
                      </div>
                      <span className="text-foreground flex-1">{option}</span>
                      {isCorrectAnswer && <span className="text-emerald-400 text-sm font-medium">Poprawna odpowiedź</span>}
                      {isUserAnswer && !isCorrectAnswer && <span className="text-red-400 text-sm font-medium">Twoja odpowiedź</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <Button
            onClick={() => navigateToQuestion(examState.currentQuestionIndex - 1)}
            disabled={examState.currentQuestionIndex === 0}
            variant="outline"
            className="border-border/50"
          >
            <ArrowLeft className="mr-2" /> Poprzednie
          </Button>

          <Button
            onClick={() => navigateToQuestion(examState.currentQuestionIndex + 1)}
            disabled={examState.currentQuestionIndex === examState.questions.length - 1}
            variant="outline"
            className="border-border/50"
          >
            Następne <ArrowRight className="ml-2" />
          </Button>
        </div>
      </motion.div>
    )
  }

  return null
}
