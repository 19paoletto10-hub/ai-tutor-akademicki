import { getCourseConfig } from './storage'

const ANTI_CHEATING_PATTERNS = [
  /zrób\s+mi\s+(całe|cały|pełne)\s+(rozwiązanie|rozwiazanie)/i,
  /podaj\s+(gotowca|odpowiedzi)\s+na\s+(kolokwium|egzamin|zaliczenie)/i,
  /to\s+jest\s+(kolokwium|egzamin)\s+i\s+potrzebuję\s+odpowiedzi/i,
  /rozwiąż.*(bez\s+tłumaczenia|bez\s+wyjaśnień)/i,
  /napisz\s+(całą|cały|całe)\s+(pracę|esej|referat)/i,
  /zrób\s+za\s+mnie\s+(zadanie|projekt|pracę)/i,
  /potrzebuję\s+gotow(ą|a|e)\s+odpowiedź/i,
]

const CONTEXTUAL_BYPASS_KEYWORDS = [
  'tak', 'nie', 'ok', 'kontynuuj', 'dalej', 'więcej', 'wyjaśnij', 'rozwiń'
]

const ACADEMIC_KEYWORDS = [
  'definicja', 'wyjaśnij', 'przykład', 'quiz', 'egzamin', 'teoria', 
  'metoda', 'analiza', 'dlaczego', 'jak działa', 'co to jest'
]

const VAGUE_PATTERNS = [
  /^(dalej|kontynuuj|więcej|next)\.?$/i,
  /^(nie\s+rozumiem|nie\s+wiem|help|pomóż)\.?$/i,
  /^\?+$/,
  /^(co\s+to|hm+)\??$/i,
]

export interface ValidationResult {
  allowed: boolean
  blockReason?: 'anti-cheating' | 'off-topic'
  blockMessage?: string
}

export function checkAntiCheating(message: string): ValidationResult {
  const trimmedMessage = message.trim()
  
  for (const pattern of ANTI_CHEATING_PATTERNS) {
    if (pattern.test(trimmedMessage)) {
      return {
        allowed: false,
        blockReason: 'anti-cheating',
        blockMessage: `Nie mogę dostarczyć gotowych odpowiedzi do zaliczenia lub egzaminu. Jako tutor akademicki, moim celem jest pomóc Ci **zrozumieć** materiał.

Mogę natomiast:
- Wyjaśnić teorię krok po kroku
- Przejść przez podobny przykład
- Wskazać gdzie szukać odpowiedzi
- Sprawdzić Twoje rozumowanie

Napisz, co już wiesz i gdzie utknęłaś/utknąłeś — pomogę Ci dalej!`
      }
    }
  }
  
  return { allowed: true }
}

function shouldBypassValidation(message: string): boolean {
  const trimmed = message.trim().toLowerCase()
  
  if (trimmed.length <= 3) {
    return true
  }
  
  if (/^[a-z0-9]$/i.test(trimmed)) {
    return true
  }
  
  if (CONTEXTUAL_BYPASS_KEYWORDS.includes(trimmed)) {
    return true
  }
  
  if (trimmed.startsWith('opcja') || trimmed.startsWith('moja odpowiedź')) {
    return true
  }
  
  return false
}

function hasKeywordMatch(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  const courseConfig = getCourseConfig()
  if (courseConfig) {
    const courseWords = (courseConfig.courseName + ' ' + courseConfig.courseDescription)
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length >= 3)
    
    for (const word of courseWords) {
      if (lowerMessage.includes(word)) {
        return true
      }
    }
  }
  
  for (const keyword of ACADEMIC_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return true
    }
  }
  
  return false
}

export async function checkTopicRelevance(message: string): Promise<ValidationResult> {
  if (shouldBypassValidation(message)) {
    return { allowed: true }
  }
  
  if (hasKeywordMatch(message)) {
    return { allowed: true }
  }
  
  try {
    const courseConfig = getCourseConfig()
    const courseName = courseConfig?.courseName || 'nieskonfigurowany'
    
    const validationPrompt = `Czy poniższe pytanie jest związane z JAKIMKOLWIEK tematem akademickim lub edukacyjnym?
Pytanie: "${message}"
Kurs: ${courseName}

Odpowiedz TYLKO liczbą 0.0-1.0:
- 0.0 = na pewno akademickie/edukacyjne
- 1.0 = na pewno niezwiązane (pogoda, jedzenie, sport, plotki, gry)

Bądź BARDZO liberalny — przepuszczaj wszystkie wątpliwe przypadki.`

    const response = await spark.llm(validationPrompt, 'gpt-4o-mini')
    const score = parseFloat(response.trim())
    
    if (isNaN(score)) {
      return { allowed: true }
    }
    
    if (score >= 0.90) {
      const courseInfo = courseConfig?.courseName ? `: ${courseConfig.courseName}` : ''
      return {
        allowed: false,
        blockReason: 'off-topic',
        blockMessage: `To pytanie wykracza poza zakres tematów akademickich. 🎓

Mogę pomóc z:
- Pytaniami z zakresu kursu${courseInfo}
- Pojęciami i definicjami akademickimi
- Przykładami i ćwiczeniami
- Przygotowaniem do egzaminu

Wpisz pytanie związane z nauką, a chętnie pomogę!`
      }
    }
    
    return { allowed: true }
  } catch (error) {
    console.error('Error checking topic relevance:', error)
    return { allowed: true }
  }
}

export function isVagueMessage(message: string, hasConversationHistory: boolean): boolean {
  if (hasConversationHistory) {
    return false
  }
  
  const trimmed = message.trim()
  for (const pattern of VAGUE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true
    }
  }
  
  return false
}

export function augmentContextualMessage(message: string, lastAIMessage: string | null): string {
  const trimmed = message.trim()
  
  if (!lastAIMessage || trimmed.length >= 30) {
    return message
  }
  
  const isContextualShort = /^[a-z0-9]$/i.test(trimmed) || 
                            ['a', 'b', 'c', 'd', '1', '2', '3', '4', 'tak', 'nie', 'kontynuuj', 'dalej'].includes(trimmed.toLowerCase())
  
  if (isContextualShort) {
    const contextSnippet = lastAIMessage.slice(0, 200)
    return `[Kontekst: ostatnia odpowiedź dotyczyła: ${contextSnippet}]\nOdpowiedź studenta: ${message}`
  }
  
  return message
}

export async function validateMessage(message: string): Promise<ValidationResult> {
  const antiCheatResult = checkAntiCheating(message)
  if (!antiCheatResult.allowed) {
    return antiCheatResult
  }
  
  const topicResult = await checkTopicRelevance(message)
  return topicResult
}
