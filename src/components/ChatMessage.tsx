import { motion } from 'framer-motion'
import { Message } from '@/components/TutorView'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { marked } from 'marked'
import { useEffect, useState } from 'react'
import { ActionButtons } from '@/components/ActionButtons'
import { QuizEvaluationCard, QuizEvaluation } from '@/components/QuizEvaluationCard'

interface ChatMessageProps {
  message: Message
  showActionButtons?: boolean
  onAction?: (actionMessage: string) => void
  isGenerating?: boolean
}

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function ChatMessage({ message, showActionButtons = false, onAction, isGenerating = false }: ChatMessageProps) {
  const [htmlContent, setHtmlContent] = useState('')
  const isUser = message.role === 'user'

  useEffect(() => {
    const parseMarkdown = async () => {
      const html = await marked.parse(message.content)
      setHtmlContent(html)
    }
    parseMarkdown()
  }, [message.content])

  const timeAgo = formatDistanceToNow(message.timestamp, {
    addSuffix: true,
    locale: pl,
  })

  const quizEvaluation = message.quizEvaluation

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'} w-full`}>
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">🎓</span>
            <span className="text-xs font-medium text-muted-foreground">Tutor</span>
            {message.partInfo && (
              <span className="text-xs text-accent/70 ml-auto">
                Część {message.partInfo.partNumber}/{message.partInfo.totalParts}
              </span>
            )}
          </div>
        )}
        
        <div
          className={`
            rounded-2xl px-5 py-3.5 shadow-lg w-full
            ${
              isUser
                ? 'bg-gradient-to-br from-primary via-secondary to-secondary text-primary-foreground'
                : 'bg-slate-800 text-slate-100 border border-slate-700/50'
            }
          `}
        >
          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="prose prose-invert prose-sm max-w-none
                prose-headings:font-semibold prose-headings:tracking-tight
                prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-2
                prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-4
                prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-3
                prose-p:leading-relaxed prose-p:my-2
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                prose-strong:text-white prose-strong:font-semibold
                prose-code:text-accent prose-code:bg-slate-900/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-slate-900/80 prose-pre:border prose-pre:border-slate-700/50 prose-pre:shadow-inner
                prose-pre:my-3 prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto
                prose-ul:my-2 prose-ul:list-disc prose-ul:pl-6
                prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-6
                prose-li:my-1
                prose-table:border-collapse prose-table:w-full prose-table:my-4
                prose-th:border prose-th:border-slate-600 prose-th:bg-slate-700/50 prose-th:px-3 prose-th:py-2 prose-th:text-left
                prose-td:border prose-td:border-slate-600 prose-td:px-3 prose-td:py-2
                prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-300
              "
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </div>

        {!isUser && showActionButtons && onAction && (
          <ActionButtons onAction={onAction} disabled={isGenerating} />
        )}

        {!isUser && quizEvaluation && onAction && (
          <QuizEvaluationCard 
            evaluation={quizEvaluation} 
            onAction={(action) => {
              if (action === 'repeat') {
                onAction('[ACTION] Powtórz ten temat z innymi przykładami — wyjaśnij go inaczej.')
              } else if (action === 'next') {
                onAction('[ACTION] Wygeneruj następne pytanie quiz z tego samego tematu.')
              } else if (action === 'new') {
                onAction('[ACTION] Przejdźmy do nowego tematu.')
              }
            }}
          />
        )}

        <span className="text-xs text-muted-foreground px-1">{timeAgo}</span>
      </div>
    </motion.div>
  )
}
