import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Lightbulb, Trash, DownloadSimple } from '@phosphor-icons/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StudentProfileCard } from '@/components/StudentProfileCard'
import type { Message } from '@/components/TutorView'

interface TutorSidebarProps {
  onSendPrompt: (prompt: string) => void
  onClearChat: () => void
  messages: Message[]
}

const quickPrompts = [
  'Wyjaśnij mi podstawowe pojęcia tego kursu',
  'Podaj przykład zastosowania',
  'Podsumuj najważniejsze zagadnienia',
]

export function TutorSidebar({ onSendPrompt, onClearChat, messages }: TutorSidebarProps) {
  const [showClearDialog, setShowClearDialog] = useState(false)

  const handleClearConfirm = () => {
    onClearChat()
    setShowClearDialog(false)
  }

  const handleExportConversation = () => {
    const date = new Date().toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    let markdown = `# Rozmowa z AI Tutorem — ${date}\n\n`
    
    messages.forEach((message) => {
      const role = message.role === 'user' ? 'Student' : 'Tutor'
      markdown += `## ${role}\n\n${message.content}\n\n---\n\n`
    })
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rozmowa-tutor-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <aside className="lg:w-[20%] xl:w-[25%] space-y-4 hidden lg:block overflow-y-auto max-h-[calc(100vh-8rem)]">
      <StudentProfileCard />
      
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl p-4 lg:p-5">
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
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleExportConversation}
                disabled={messages.length === 0}
              >
                <DownloadSimple size={16} className="mr-2" />
                📥 Eksportuj rozmowę
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash size={16} className="mr-2" />
                🗑️ Wyczyść rozmowę
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyczyścić historię rozmowy?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja usunie całą historię rozmowy z pamięci przeglądarki. Nie będzie można jej cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearConfirm}>
              Wyczyść
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
