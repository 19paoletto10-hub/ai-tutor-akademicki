import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Lightbulb, Trash } from '@phosphor-icons/react'

interface TutorSidebarProps {
  onSendPrompt: (prompt: string) => void
  onClearChat: () => void
}

const quickPrompts = [
  'Wyjaśnij mi podstawowe pojęcia tego kursu',
  'Podaj przykład zastosowania',
  'Podsumuj najważniejsze zagadnienia',
]

export function TutorSidebar({ onSendPrompt, onClearChat }: TutorSidebarProps) {
  return (
    <aside className="lg:w-[30%] space-y-4">
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>🎓</span>
              <span>Jak działa tutor</span>
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tutor odpowiada na Twoje pytania krok po kroku. Odpowiedzi oparte są na materiałach kursowych i dostosowane do Twoich potrzeb.
            </p>
          </div>

          <Separator className="bg-border/50" />

          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-accent" />
              <span>Szybkie pytania</span>
            </h4>
            <div className="space-y-2">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-accent/10 hover:border-accent/50 hover:text-accent transition-colors"
                  onClick={() => onSendPrompt(prompt)}
                >
                  <span className="text-xs leading-relaxed">{prompt}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div>
            <h4 className="text-sm font-medium mb-2">Pamięć rozmowy</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Rozmowa zapisywana lokalnie w przeglądarce. Twoje dane pozostają prywatne.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={onClearChat}
            >
              <Trash size={16} className="mr-2" />
              Wyczyść historię
            </Button>
          </div>
        </div>
      </Card>
    </aside>
  )
}
