import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CourseConfig {
  courseName: string
  courseDescription: string
}

const MAX_DESCRIPTION_LENGTH = 6000

export function SettingsView() {
  const [courseName, setCourseName] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('course_config')
    if (saved) {
      try {
        const config: CourseConfig = JSON.parse(saved)
        setCourseName(config.courseName || '')
        setCourseDescription(config.courseDescription || '')
        setCharCount(config.courseDescription?.length || 0)
      } catch (e) {
        console.error('Failed to load course config:', e)
      }
    }
  }, [])

  const handleDescriptionChange = (value: string) => {
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setCourseDescription(value)
      setCharCount(value.length)
    }
  }

  const handleSave = () => {
    const config: CourseConfig = {
      courseName: courseName.trim(),
      courseDescription: courseDescription.trim(),
    }

    try {
      localStorage.setItem('course_config', JSON.stringify(config))
      toast.success('Konfiguracja zapisana', {
        description: 'Ustawienia kursu zostały zaktualizowane.',
      })
    } catch (e) {
      toast.error('Błąd zapisu', {
        description: 'Nie udało się zapisać konfiguracji.',
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="bg-card/40 border-white/10 backdrop-blur-sm p-8 md:p-10">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-2 gradient-text">Ustawienia</h2>
            <p className="text-muted-foreground">
              Skonfiguruj temat i zakres kursu dla AI Tutora i Mentora
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4 pb-6 border-b border-white/10">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                🎯 Temat kursu
              </h3>

              <div className="space-y-2">
                <Label htmlFor="course-name" className="text-sm font-medium">
                  Nazwa kursu
                </Label>
                <Input
                  id="course-name"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="np. Biologia molekularna, Historia średniowiecza, Programowanie w Python..."
                  className="bg-background/50 border-white/10 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-description" className="text-sm font-medium">
                  Opis kursu i kluczowe tematy
                </Label>
                <Textarea
                  id="course-description"
                  value={courseDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Opisz zakres kursu, kluczowe tematy i pojęcia, które tutor powinien znać..."
                  rows={8}
                  className="bg-background/50 border-white/10 focus:border-primary resize-none"
                />
                <div className="flex justify-end">
                  <span
                    className={`text-sm ${
                      charCount > MAX_DESCRIPTION_LENGTH * 0.9
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {charCount} / {MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              >
                <FloppyDisk className="mr-2" />
                💾 Zapisz
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground">
                ℹ️ Jak to działa?
              </h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Gdy zapiszesz konfigurację kursu, informacje te będą automatycznie
                  dołączane do promptów systemowych AI Tutora i Mentora.
                </p>
                <div className="bg-background/30 border border-white/5 rounded-lg p-4">
                  <p className="font-medium text-foreground mb-2">Format promptu:</p>
                  <pre className="text-xs font-mono text-accent whitespace-pre-wrap">
{`KURS: {nazwa kursu}
ZAKRES KURSU I KLUCZOWE TEMATY:
{opis kursu}

Odpowiadaj WYŁĄCZNIE w kontekście tego kursu.
Jeśli pytanie wykracza poza zakres — poinformuj
grzecznie studenta.`}
                  </pre>
                </div>
                <p>
                  Dzięki temu AI będzie skupiać się tylko na tematach związanych z Twoim kursem
                  i unikać odpowiedzi spoza zakresu materiału.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
