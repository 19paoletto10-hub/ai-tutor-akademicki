import { safeStorageGet, safeStorageSet } from './storage'

export interface CurriculumTopic {
  id: string
  name: string
  level: 1 | 2 | 3
  children: CurriculumTopic[]
}

export interface CurriculumProgress {
  current_topic: string | null
  completed_topics: string[]
  started_at: string
}

const PROGRESS_KEY = 'curriculum_progress'

export function parseCurriculumTopics(markdown: string): CurriculumTopic[] {
  const lines = markdown.split('\n').filter(line => line.trim())
  const topics: CurriculumTopic[] = []
  const stack: { level: number; topic: CurriculumTopic }[] = []

  lines.forEach((line) => {
    const h1Match = line.match(/^#\s+(.+)/)
    const h2Match = line.match(/^##\s+(.+)/)
    const h3Match = line.match(/^###\s+(.+)/)

    if (h1Match) {
      const topic: CurriculumTopic = {
        id: generateTopicId(h1Match[1]),
        name: h1Match[1].trim(),
        level: 1,
        children: []
      }
      topics.push(topic)
      stack.length = 0
      stack.push({ level: 1, topic })
    } else if (h2Match) {
      const topic: CurriculumTopic = {
        id: generateTopicId(h2Match[1]),
        name: h2Match[1].trim(),
        level: 2,
        children: []
      }
      
      while (stack.length > 0 && stack[stack.length - 1].level >= 2) {
        stack.pop()
      }
      
      if (stack.length > 0 && stack[stack.length - 1].level === 1) {
        stack[stack.length - 1].topic.children.push(topic)
        stack.push({ level: 2, topic })
      }
    } else if (h3Match) {
      const topic: CurriculumTopic = {
        id: generateTopicId(h3Match[1]),
        name: h3Match[1].trim(),
        level: 3,
        children: []
      }
      
      while (stack.length > 0 && stack[stack.length - 1].level >= 3) {
        stack.pop()
      }
      
      if (stack.length > 0 && stack[stack.length - 1].level === 2) {
        stack[stack.length - 1].topic.children.push(topic)
        stack.push({ level: 3, topic })
      }
    }
  })

  return topics
}

function generateTopicId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function flattenTopics(topics: CurriculumTopic[]): CurriculumTopic[] {
  const flattened: CurriculumTopic[] = []
  
  function traverse(topic: CurriculumTopic) {
    flattened.push(topic)
    topic.children.forEach(traverse)
  }
  
  topics.forEach(traverse)
  return flattened
}

export function getCurriculumProgress(): CurriculumProgress {
  return safeStorageGet<CurriculumProgress>(PROGRESS_KEY, {
    current_topic: null,
    completed_topics: [],
    started_at: new Date().toISOString()
  })
}

export function saveCurriculumProgress(progress: CurriculumProgress): void {
  safeStorageSet(PROGRESS_KEY, progress)
}

export function markTopicCompleted(topicId: string): CurriculumProgress {
  const progress = getCurriculumProgress()
  
  if (!progress.completed_topics.includes(topicId)) {
    progress.completed_topics.push(topicId)
  }
  
  saveCurriculumProgress(progress)
  return progress
}

export function setCurrentTopic(topicId: string): CurriculumProgress {
  const progress = getCurriculumProgress()
  progress.current_topic = topicId
  saveCurriculumProgress(progress)
  return progress
}

export function getNextTopic(
  currentTopicId: string,
  allTopics: CurriculumTopic[]
): CurriculumTopic | null {
  const flattened = flattenTopics(allTopics)
  const currentIndex = flattened.findIndex(t => t.id === currentTopicId)
  
  if (currentIndex === -1 || currentIndex === flattened.length - 1) {
    return null
  }
  
  return flattened[currentIndex + 1]
}

export function getPreviousTopic(
  currentTopicId: string,
  allTopics: CurriculumTopic[]
): CurriculumTopic | null {
  const flattened = flattenTopics(allTopics)
  const currentIndex = flattened.findIndex(t => t.id === currentTopicId)
  
  if (currentIndex <= 0) {
    return null
  }
  
  return flattened[currentIndex - 1]
}

export function resetCurriculumProgress(): void {
  safeStorageSet(PROGRESS_KEY, {
    current_topic: null,
    completed_topics: [],
    started_at: new Date().toISOString()
  })
}

export function calculateProgress(
  topics: CurriculumTopic[],
  completedTopics: string[]
): { completed: number; total: number; percentage: number } {
  const flattened = flattenTopics(topics)
  const total = flattened.length
  const completed = flattened.filter(t => completedTopics.includes(t.id)).length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  
  return { completed, total, percentage }
}

export function isAllCompleted(
  topics: CurriculumTopic[],
  completedTopics: string[]
): boolean {
  const flattened = flattenTopics(topics)
  return flattened.length > 0 && flattened.every(t => completedTopics.includes(t.id))
}
