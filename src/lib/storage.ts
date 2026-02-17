import { toast } from 'sonner'

const MAX_MESSAGES = 50
const MAX_MESSAGE_LENGTH = 4000

export function truncateMessage(content: string): string {
  if (content.length <= MAX_MESSAGE_LENGTH) {
    return content
  }
  return content.slice(0, MAX_MESSAGE_LENGTH) + '...'
}

export function trimMessagesToLimit<T>(messages: T[], limit: number = MAX_MESSAGES): T[] {
  if (messages.length <= limit) {
    return messages
  }
  return messages.slice(-limit)
}

export function safeStorageSet(key: string, data: any): boolean {
  try {
    const jsonString = JSON.stringify(data)
    localStorage.setItem(key, jsonString)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      toast.error('Pamięć pełna — starsza historia została usunięta')
      
      if (Array.isArray(data) && data.length > 10) {
        const trimmedData = data.slice(-Math.floor(data.length / 2))
        try {
          localStorage.setItem(key, JSON.stringify(trimmedData))
          return true
        } catch {
          return false
        }
      }
    }
    console.error('Error saving to localStorage:', error)
    return false
  }
}

export function safeStorageGet<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored) as T
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  return defaultValue
}

export interface CourseConfig {
  courseName: string
  courseDescription: string
}

export function getCourseConfig(): CourseConfig | null {
  try {
    const stored = localStorage.getItem('course_config')
    if (stored) {
      const config = JSON.parse(stored) as CourseConfig
      if (config.courseName?.trim() && config.courseDescription?.trim()) {
        return config
      }
    }
  } catch (error) {
    console.error('Error loading course config:', error)
  }
  return null
}

export function injectCourseContext(systemPrompt: string): string {
  const config = getCourseConfig()
  
  if (!config) {
    return systemPrompt
  }
  
  const courseContext = `KURS: ${config.courseName}
ZAKRES KURSU I KLUCZOWE TEMATY:
${config.courseDescription}

Odpowiadaj WYŁĄCZNIE w kontekście tego kursu. Jeśli pytanie wykracza poza zakres — poinformuj grzecznie studenta.

---

`
  
  return courseContext + systemPrompt
}
