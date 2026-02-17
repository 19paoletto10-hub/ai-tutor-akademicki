import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lightbulb } from '@phosphor-icons/react'

interface VagueSuggestionCardProps {
  onSuggestionClick: (text: string) => void
}

export function VagueSuggestionCard({ onSuggestionClick }: VagueSuggestionCardProps) {
  const suggestions = [
    'Wyjaśnij podstawy kursu',
    'Pokaż listę tematów',
    'Mini Quiz na start'
  ]

  return (
    <Card className="p-6 bg-card/95 backdrop-blur-xl border-accent/30">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 rounded-lg bg-accent/10">
          <Lightbulb className="h-6 w-6 text-accent" weight="duotone" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Wygląda na to, że dopiero zaczynasz! 😊
            </h3>
            <p className="text-sm text-muted-foreground">
              Spróbuj jedno z tych:
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
                variant="outline"
                size="sm"
                className="hover:bg-accent/10 hover:text-accent hover:border-accent/50"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
