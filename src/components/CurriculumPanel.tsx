import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CaretDown, CaretRight, ArrowCounterClockwise } from '@phosphor-icons/react'
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
import {
  parseCurriculumTopics,
  getCurriculumProgress,
  calculateProgress,
  resetCurriculumProgress,
  type CurriculumTopic
} from '@/lib/curriculum'
import { getCurriculumTopics } from '@/lib/storage'

interface CurriculumPanelProps {
  onTopicClick: (topicName: string) => void
  onProgressChange?: (completed: number, total: number, percentage: number) => void
}

export function CurriculumPanel({ onTopicClick, onProgressChange }: CurriculumPanelProps) {
  const [topics, setTopics] = useState<CurriculumTopic[]>([])
  const [progress, setProgress] = useState(getCurriculumProgress())
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [showResetDialog, setShowResetDialog] = useState(false)

  useEffect(() => {
    const curriculumMarkdown = getCurriculumTopics()
    if (curriculumMarkdown) {
      const parsed = parseCurriculumTopics(curriculumMarkdown)
      setTopics(parsed)
      
      const expandedIds = new Set<string>()
      parsed.forEach(topic => {
        expandedIds.add(topic.id)
      })
      setExpandedTopics(expandedIds)
    }
  }, [])

  useEffect(() => {
    const updateProgress = () => {
      setProgress(getCurriculumProgress())
    }
    
    const interval = setInterval(updateProgress, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (topics.length > 0 && onProgressChange) {
      const { completed, total, percentage } = calculateProgress(topics, progress.completed_topics)
      onProgressChange(completed, total, percentage)
    }
  }, [topics, progress, onProgressChange])

  if (topics.length === 0) {
    return (
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl p-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">📚</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Skonfiguruj tematy kursu w Ustawieniach, aby śledzić postęp.
          </p>
        </div>
      </Card>
    )
  }

  const { completed, total, percentage } = calculateProgress(topics, progress.completed_topics)

  const toggleExpanded = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else {
        next.add(topicId)
      }
      return next
    })
  }

  const handleTopicClick = (topic: CurriculumTopic) => {
    onTopicClick(`Omów temat: ${topic.name}`)
  }

  const handleResetProgress = () => {
    resetCurriculumProgress()
    setProgress(getCurriculumProgress())
    setShowResetDialog(false)
  }

  const getStatusIcon = (topic: CurriculumTopic) => {
    if (progress.completed_topics.includes(topic.id)) {
      return <span className="text-emerald-400">✅</span>
    }
    if (progress.current_topic === topic.id) {
      return <span className="text-amber-400 animate-pulse">▶️</span>
    }
    return <span className="text-muted-foreground">⬜</span>
  }

  const renderTopic = (topic: CurriculumTopic, depth: number = 0) => {
    const hasChildren = topic.children.length > 0
    const isExpanded = expandedTopics.has(topic.id)
    const isCurrent = progress.current_topic === topic.id
    const isCompleted = progress.completed_topics.includes(topic.id)

    return (
      <div key={topic.id} style={{ marginLeft: `${depth * 12}px` }}>
        <div
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer
            transition-colors hover:bg-emerald-500/10
            ${isCurrent ? 'bg-amber-500/10 border border-amber-500/30' : ''}
            ${isCompleted ? 'opacity-70' : ''}
          `}
          onClick={() => handleTopicClick(topic)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(topic.id)
              }}
              className="shrink-0 hover:bg-emerald-500/20 p-1 rounded"
            >
              {isExpanded ? (
                <CaretDown size={14} weight="bold" />
              ) : (
                <CaretRight size={14} weight="bold" />
              )}
            </button>
          )}
          
          {!hasChildren && <span className="w-[14px]" />}
          
          <span className="shrink-0">{getStatusIcon(topic)}</span>
          
          <span className={`
            text-sm flex-1 leading-tight
            ${topic.level === 1 ? 'font-bold' : ''}
            ${topic.level === 2 ? 'font-medium' : ''}
          `}>
            {topic.name}
          </span>
        </div>

        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {topic.children.map(child => renderTopic(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>📚</span>
              <span>Program kursu</span>
            </h3>
            
            <div className="space-y-2">
              <Progress value={percentage} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Postęp: {completed} / {total} tematów ({percentage}%)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowResetDialog(true)}
                >
                  <ArrowCounterClockwise size={12} className="mr-1" />
                  🔄 Resetuj
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto space-y-1 pr-2">
            {topics.map(topic => renderTopic(topic))}
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+→</kbd> Następny temat
              <br />
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+←</kbd> Poprzedni temat
            </p>
          </div>
        </div>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zresetować postęp kursu?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja usunie cały postęp w programie kursu. Wszystkie tematy zostaną oznaczone jako nieukończone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProgress}>
              Resetuj postęp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
