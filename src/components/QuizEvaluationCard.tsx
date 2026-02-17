import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export interface QuizEvaluation {
  grade: number
  justification: string
  correctAnswer: string
  hint?: string
}

interface QuizEvaluationCardProps {
  evaluation: QuizEvaluation
  onAction: (action: 'repeat' | 'next' | 'new') => void
}

const gradeEmojis: Record<number, string> = {
  5: '🌟',
  4: '👍',
  3: '📝',
  2: '❌',
}

const gradeTexts: Record<number, string> = {
  5: 'bardzo dobry',
  4: 'dobry',
  3: 'dostateczny',
  2: 'niedostateczny',
}

export function QuizEvaluationCard({ evaluation, onAction }: QuizEvaluationCardProps) {
  const gradeEmoji = gradeEmojis[evaluation.grade] || '📝'
  const gradeText = gradeTexts[evaluation.grade] || 'oceniono'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-accent/30 shadow-xl p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{gradeEmoji}</span>
            <div>
              <h3 className="text-xl font-bold text-white">
                Ocena: {evaluation.grade} ({gradeText})
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {evaluation.justification}
              </p>
            </div>

            {evaluation.grade < 4 && evaluation.correctAnswer && (
              <div className="bg-slate-700/40 border border-accent/20 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-accent mb-1.5">Poprawna odpowiedź:</h4>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {evaluation.correctAnswer}
                </p>
              </div>
            )}

            {evaluation.hint && evaluation.grade < 5 && (
              <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Wskazówka:</h4>
                <p className="text-sm text-slate-300 italic leading-relaxed">
                  {evaluation.hint}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('repeat')}
              className="flex-1 text-xs hover:bg-accent/10 hover:border-accent/50"
            >
              [A] Powtórz temat z innymi przykładami
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('next')}
              className="flex-1 text-xs hover:bg-accent/10 hover:border-accent/50"
            >
              [B] Następne pytanie quiz
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('new')}
              className="flex-1 text-xs hover:bg-accent/10 hover:border-accent/50"
            >
              [C] Przejdź do nowego tematu
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
