import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Trash, DownloadSimple, Target } from '@phosphor-icons/react'
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
import { CurriculumPanel } from '@/components/CurriculumPanel'
import type { Message } from '@/components/MentorView'

interface MentorSidebarProps {
  onSendPrompt: (prompt: string) => void
  onClearChat: () => void
  messages: Message[]
  discussedTopics: string[]
}

export function MentorSidebar({ onSendPrompt, onClearChat, messages, discussedTopics }: MentorSidebarProps) {
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
    
    let markdown = `# Wykład z Profesorem — ${date}\n\n`
    
    messages.forEach((message) => {
      const role = message.role === 'user' ? 'Student' : 'Profesor'
      markdown += `## ${role}\n\n${message.content}\n\n---\n\n`
    })
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wyklad-mentor-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalTopicsDiscussed = discussedTopics.length

  return (
    <aside className="lg:w-[20%] xl:w-[25%] space-y-4 hidden lg:block overflow-y-auto max-h-[calc(100vh-8rem)]">
      <CurriculumPanel onTopicClick={onSendPrompt} />

      <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl p-4 lg:p-5">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>👨‍🏫</span>
              <span>Prowadzenie sekwencyjne</span>
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Profesor prowadzi Cię przez materiał krok po kroku, jak na wykładzie. Odpowiedzi są akademickie i uporządkowane.
            </p>
          </div>

          <Separator className="bg-border/50" />

          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>📊</span>
                <span>Omówione tematy</span>
              </span>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                {totalTopicsDiscussed} {totalTopicsDiscussed === 1 ? 'temat' : 'tematów'}
              </Badge>
            </h4>
            {discussedTopics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {discussedTopics.map((topic, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs bg-emerald-900/20 border-emerald-500/30 text-emerald-300"
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Omówione tematy pojawią się tutaj
              </p>
            )}
          </div>

          <Separator className="bg-border/50" />

          <div>
            <h4 className="text-sm font-medium mb-2">🎯 Sprawdź wiedzę</h4>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-800/30"
              onClick={() => onSendPrompt('[ACTION] Wygeneruj pytanie quiz o aktualnym temacie.')}
            >
              <Target size={16} className="mr-2" />
              Mini Quiz
            </Button>
          </div>

          <Separator className="bg-border/50" />

          <div>
            <h4 className="text-sm font-medium mb-2">Pamięć wykładu</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Rozmowa zapisywana lokalnie w przeglądarce. Twoje notatki pozostają prywatne.
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
                📥 Eksportuj wykład
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash size={16} className="mr-2" />
                🗑️ Wyczyść wykład
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyczyścić historię wykładu?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja usunie całą historię wykładu z pamięci przeglądarki. Nie będzie można jej cofnąć.
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
