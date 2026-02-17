import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface StudentProfile {
  level: number
  weak_topics: string[]
  last_mistakes: string[]
  quiz_history: number[]
}

const DEFAULT_PROFILE: StudentProfile = {
  level: 3,
  weak_topics: [],
  last_mistakes: [],
  quiz_history: [],
}

const STORAGE_KEY = 'student_profile'
const MAX_WEAK_TOPICS = 10
const MAX_MISTAKES = 5
const MAX_QUIZ_HISTORY = 10

export function useStudentProfile() {
  const [profile, setProfile] = useState<StudentProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as StudentProfile
      }
    } catch (error) {
      console.error('Error loading student profile:', error)
    }
    return DEFAULT_PROFILE
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch (error) {
      console.error('Error saving student profile:', error)
    }
  }, [profile])

  const updateLevel = (newLevel: number) => {
    setProfile((current) => ({
      ...current,
      level: Math.max(1, Math.min(5, newLevel)),
    }))
  }

  const addWeakTopic = (topic: string) => {
    setProfile((current) => {
      const topics = [...current.weak_topics]
      if (!topics.includes(topic)) {
        topics.push(topic)
        if (topics.length > MAX_WEAK_TOPICS) {
          topics.shift()
        }
      }
      return { ...current, weak_topics: topics }
    })
  }

  const removeWeakTopic = (topic: string) => {
    setProfile((current) => ({
      ...current,
      weak_topics: current.weak_topics.filter((t) => t !== topic),
    }))
  }

  const addMistake = (mistake: string) => {
    setProfile((current) => {
      const mistakes = [...current.last_mistakes, mistake]
      if (mistakes.length > MAX_MISTAKES) {
        mistakes.shift()
      }
      return { ...current, last_mistakes: mistakes }
    })
  }

  const addQuizGrade = (grade: number) => {
    setProfile((current) => {
      const history = [...current.quiz_history, Math.max(2, Math.min(5, grade))]
      if (history.length > MAX_QUIZ_HISTORY) {
        history.shift()
      }
      
      const newProfile = { ...current, quiz_history: history }
      
      if (history.length >= 3) {
        const lastThree = history.slice(-3)
        const average = lastThree.reduce((acc, g) => acc + g, 0) / 3
        
        if (average >= 4.5 && current.level < 5) {
          const newLevel = current.level + 1
          toast.success(`🎉 Awans! Poziom ${newLevel}`)
          return { ...newProfile, level: newLevel }
        } else if (average <= 2.5 && current.level > 1) {
          const newLevel = current.level - 1
          toast.info(`📚 Poziom obniżony do ${newLevel} — poćwicz jeszcze!`)
          return { ...newProfile, level: newLevel }
        }
      }
      
      return newProfile
    })
  }

  const checkLevelAdjustment = () => {
    if (profile.quiz_history.length < 3) return

    const lastThree = profile.quiz_history.slice(-3)
    const average = lastThree.reduce((acc, grade) => acc + grade, 0) / 3

    if (average >= 4.5 && profile.level < 5) {
      setProfile((current) => {
        const newLevel = current.level + 1
        toast.success(`🎉 Awans! Poziom ${newLevel}`)
        return { ...current, level: newLevel }
      })
    } else if (average <= 2.5 && profile.level > 1) {
      setProfile((current) => {
        const newLevel = current.level - 1
        toast.info(`📚 Poziom obniżony do ${newLevel} — poćwicz jeszcze!`)
        return { ...current, level: newLevel }
      })
    }
  }

  const getQuizAverage = (): number | null => {
    if (profile.quiz_history.length === 0) return null
    const sum = profile.quiz_history.reduce((acc, grade) => acc + grade, 0)
    return sum / profile.quiz_history.length
  }

  return {
    profile,
    updateLevel,
    addWeakTopic,
    removeWeakTopic,
    addMistake,
    addQuizGrade,
    checkLevelAdjustment,
    getQuizAverage,
  }
}
