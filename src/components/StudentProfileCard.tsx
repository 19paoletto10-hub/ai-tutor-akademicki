import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star } from '@phosphor-icons/react'
import { useStudentProfile } from '@/hooks/use-student-profile'

export function StudentProfileCard() {
  const { profile, getQuizAverage, addQuizGrade, checkLevelAdjustment } = useStudentProfile()
  const quizAverage = getQuizAverage()

  const renderStars = (level: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      if (i <= level) {
        stars.push(
          <Star key={i} size={20} weight="fill" className="text-accent" />
        )
      } else {
        stars.push(
          <Star key={i} size={20} weight="regular" className="text-muted-foreground/30" />
        )
      }
    }
    return stars
  }

  const simulateQuiz = () => {
    const grade = Math.floor(Math.random() * 4) + 2
    addQuizGrade(grade)
    checkLevelAdjustment()
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>📊</span>
            <span>Twój profil</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-1.5">
                Poziom: {profile.level}/5
              </div>
              <div className="flex gap-1">
                {renderStars(profile.level)}
              </div>
            </div>

            {profile.weak_topics.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Słabe tematy:</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.weak_topics.map((topic, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-1">Średnia quizów:</div>
              <div className="text-lg font-semibold text-accent">
                {quizAverage !== null ? (
                  `${quizAverage.toFixed(1)}`
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Brak quizów — spróbuj Mini Quiz!
                  </span>
                )}
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="pt-2 border-t border-border/30">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={simulateQuiz}
                >
                  🎲 Symuluj quiz (dev)
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
