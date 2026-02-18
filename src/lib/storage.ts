import { toast } from 'sonner'

const MAX_MESSAGES = 50
const MAX_MESSAGE_LENGTH = 8000

export function splitLongMessage(content: string, maxLength: number = MAX_MESSAGE_LENGTH): string[] {
  if (content.length <= maxLength) {
    return [content]
  }

  const parts: string[] = []
  let remainingContent = content
  
  while (remainingContent.length > 0) {
    if (remainingContent.length <= maxLength) {
      parts.push(remainingContent)
      break
    }
    
    let splitIndex = maxLength
    const searchWindow = remainingContent.substring(0, maxLength)
    
    const markdownSectionBreak = searchWindow.match(/\n#{1,3}\s+[^\n]+\n/g)
    if (markdownSectionBreak && markdownSectionBreak.length > 0) {
      const lastSectionIndex = remainingContent.lastIndexOf(markdownSectionBreak[markdownSectionBreak.length - 1], maxLength)
      if (lastSectionIndex > maxLength * 0.4) {
        splitIndex = lastSectionIndex
      }
    }
    
    if (splitIndex === maxLength) {
      const paragraphBreak = remainingContent.lastIndexOf('\n\n', maxLength)
      if (paragraphBreak > maxLength * 0.4) {
        splitIndex = paragraphBreak + 2
      }
    }
    
    if (splitIndex === maxLength) {
      const sentencePatterns = [
        /\.\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/g,
        /\.\s*\n/g,
        /\.\s*$/g,
        /[!?]\s+/g
      ]
      
      for (const pattern of sentencePatterns) {
        const matches = Array.from(searchWindow.matchAll(pattern))
        if (matches.length > 0) {
          const lastMatch = matches[matches.length - 1]
          const matchIndex = lastMatch.index! + lastMatch[0].length
          if (matchIndex > maxLength * 0.3) {
            splitIndex = matchIndex
            break
          }
        }
      }
    }
    
    if (splitIndex === maxLength) {
      const newlineBreak = remainingContent.lastIndexOf('\n', maxLength)
      if (newlineBreak > maxLength * 0.2) {
        splitIndex = newlineBreak + 1
      }
    }
    
    if (splitIndex === maxLength) {
      const spaceBreak = remainingContent.lastIndexOf(' ', maxLength)
      if (spaceBreak > maxLength * 0.2) {
        splitIndex = spaceBreak + 1
      }
    }
    
    const part = remainingContent.substring(0, splitIndex).trim()
    if (part.length > 0) {
      parts.push(part)
    }
    remainingContent = remainingContent.substring(splitIndex).trim()
  }

  return parts.length > 0 ? parts : [content]
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

export interface PersonalizationConfig {
  mentorName: string
  tutorLanguage: 'Polski' | 'English'
  darkMode: boolean
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

export function getPersonalizationConfig(): PersonalizationConfig {
  try {
    const stored = localStorage.getItem('personalization_config')
    if (stored) {
      return JSON.parse(stored) as PersonalizationConfig
    }
  } catch (error) {
    console.error('Error loading personalization config:', error)
  }
  return {
    mentorName: 'Profesor',
    tutorLanguage: 'Polski',
    darkMode: true
  }
}

export function getUploadedMaterials(): any[] {
  try {
    const stored = localStorage.getItem('uploaded_materials')
    if (stored) {
      const materials = JSON.parse(stored)
      return Array.isArray(materials) ? materials.filter((m: any) => m.status === 'processed') : []
    }
  } catch (error) {
    console.error('Error loading uploaded materials:', error)
  }
  return []
}

export function getCustomTutorPrompt(): string | null {
  try {
    return localStorage.getItem('custom_tutor_prompt')
  } catch (error) {
    console.error('Error loading custom tutor prompt:', error)
    return null
  }
}

export function getCustomMentorPrompt(): string | null {
  try {
    return localStorage.getItem('custom_mentor_prompt')
  } catch (error) {
    console.error('Error loading custom mentor prompt:', error)
    return null
  }
}

export function getCurriculumTopics(): string | null {
  try {
    return localStorage.getItem('curriculum_topics')
  } catch (error) {
    console.error('Error loading curriculum topics:', error)
    return null
  }
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

export function injectLanguageInstruction(systemPrompt: string, language: 'Polski' | 'English'): string {
  if (language === 'English') {
    return systemPrompt.replace(/Odpowiadaj po polsku\./g, 'Odpowiadaj po angielsku.')
  }
  return systemPrompt
}

export function injectKnowledgeBase(systemPrompt: string, userMessage?: string): string {
  const materials = getUploadedMaterials()
  
  if (materials.length === 0) {
    return systemPrompt
  }
  
  let knowledgeBase = `\n\nBAZA WIEDZY — MATERIAŁY KURSOWE:
Poniżej znajdują się fragmenty materiałów kursowych przesłanych przez studenta. Odpowiadaj NA ICH PODSTAWIE gdy to możliwe. Cytuj źródła (nazwa pliku) gdy korzystasz z materiałów.

`
  
  const allChunks: Array<{
    filename: string
    text: string
    relevanceScore: number
  }> = []
  
  materials.forEach((doc: any) => {
    if (doc.chunks && Array.isArray(doc.chunks)) {
      doc.chunks.forEach((chunk: any) => {
        let score = 0
        
        if (userMessage) {
          const keywords = userMessage
            .toLowerCase()
            .split(/\s+/)
            .filter((word: string) => word.length >= 3)
          
          const chunkText = chunk.text.toLowerCase()
          keywords.forEach((keyword: string) => {
            const matches = (chunkText.match(new RegExp(keyword, 'g')) || []).length
            score += matches
          })
        }
        
        allChunks.push({
          filename: doc.filename,
          text: chunk.text,
          relevanceScore: score
        })
      })
    }
  })
  
  // Always sort: relevant chunks first, then by original order within same score
  // This ensures the most important content fits within the token budget
  if (allChunks.length > 0) {
    allChunks.sort((a, b) => {
      // Primary: higher relevance first
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore
      // Secondary: maintain original order for same-score chunks
      return 0
    })
  }
  
  const maxChars = 80000
  const chunksPerFile = Math.max(2, Math.floor(maxChars / (materials.length * 1500)))
  const selectedChunks: typeof allChunks = []
  const fileChunkCount = new Map<string, number>()
  
  for (const item of allChunks) {
    const count = fileChunkCount.get(item.filename) || 0
    if (count < chunksPerFile) {
      selectedChunks.push(item)
      fileChunkCount.set(item.filename, count + 1)
    }
  }
  
  let currentChars = knowledgeBase.length
  const fileTexts = new Map<string, string[]>()
  
  for (const item of selectedChunks) {
    const chunkWithNewlines = item.text + '\n\n'
    if (currentChars + chunkWithNewlines.length > maxChars) {
      break
    }
    
    if (!fileTexts.has(item.filename)) {
      fileTexts.set(item.filename, [])
    }
    fileTexts.get(item.filename)!.push(item.text)
    currentChars += chunkWithNewlines.length
  }
  
  fileTexts.forEach((texts, filename) => {
    knowledgeBase += `--- Źródło: ${filename} ---\n`
    knowledgeBase += texts.join('\n\n')
    knowledgeBase += '\n\n'
  })
  
  knowledgeBase += `WAŻNE:
- Przy odpowiadaniu PRIORYTETOWO traktuj informacje z materiałów kursowych.
- Gdy odpowiedź pochodzi z materiałów, dodaj na końcu: "📚 Źródło: {filename}".
- Gdy materiały nie zawierają odpowiedzi, korzystaj z wiedzy ogólnej i zaznacz to.

---

`
  
  return systemPrompt + knowledgeBase
}

