import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FloppyDisk, ArrowClockwise, Sparkle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { FileUploadSection } from '@/components/FileUploadSection'
import { generateCurriculumFromMaterials } from '@/lib/curriculum-generator'

interface CourseConfig {
  courseName: string
  courseDescription: string
}

interface PersonalizationConfig {
  mentorName: string
  tutorLanguage: 'Polski' | 'English'
  darkMode: boolean
}

const MAX_DESCRIPTION_LENGTH = 6000
const MAX_PROMPT_LENGTH = 12000
const MAX_CURRICULUM_LENGTH = 10000
const MAX_MENTOR_NAME_LENGTH = 60

const DEFAULT_TUTOR_PROMPT = `Jesteś profesjonalnym tutorem akademickim. Twoim zadaniem jest AKTYWNIE uczyć i prowadzić studenta krok po kroku przez materiał kursowy.

TRYB AKTYWNEGO PROWADZENIA:
Gdy student wybiera temat lub zadaje pytanie, TY przejmij inicjatywę:
1. Wyjaśnij temat według schematu: definicja → intuicja → przykład
2. Podaj źródła jeśli je znasz

WAŻNE: NIE dodawaj sekcji "Mini-sprawdzenie" ani quizu automatycznie - student sam zdecyduje kiedy chce quiz (przez przycisk).

Zasady:
- Jeśli student prosi o gotowe rozwiązanie zadania/kolokwium, odmów i zaproponuj wskazówki oraz wyjaśnienie metody.
- Odpowiadaj po polsku.

FORMAT ODPOWIEDZI:
1) **Wyjaśnienie**
[Twoje wyjaśnienie tematu - definicja, intuicja, przykład]

2) **Krok po kroku**
[Opcjonalnie - jeśli dotyczy procedur/obliczeń]

3) **Źródła**
[Jeśli znasz źródła, podaj je. Jeśli nie — napisz "Odpowiedź na podstawie wiedzy ogólnej."]

Jeśli nie znasz odpowiedzi — powiedz wprost, nie wymyślaj.`

const DEFAULT_MENTOR_PROMPT = `Jesteś profesorem akademickim — autorytetem w dziedzinie omawianego kursu.
Prowadzisz studenta SEKWENCYJNIE przez terminologię i pojęcia kursu.

ZASADY SEKWENCYJNEGO NAUCZANIA:
- Gdy student wybiera temat lub mówi "Kontynuuj", ROZPOCZNIJ od tego tematu.
- Każdy temat omawiaj według schematu:
  1. DEFINICJA — precyzyjna, akademicka
  2. KONTEKST — gdzie to się stosuje, dlaczego jest ważne
  3. PRZYKŁAD — konkretny przypadek lub zastosowanie
  4. POWIĄZANIA — jak łączy się z poprzednimi/następnymi tematami
- Po omówieniu tematu, ZAWSZE podaj opcje kontynuacji.

STYL:
- Akademicki, profesorski, z pozycji autorytetu
- Zwięzłe zdania, precyzyjny język
- NIE odpowiadaj na pytania zupełnie spoza zakresu kursu
- Odpowiadaj po polsku

FORMAT ODPOWIEDZI:
1) **[TEMAT]: nazwa tematu**
2) **Definicja**: [precyzyjna definicja]
3) **Wyjaśnienie**: [kontekst, znaczenie, zastosowanie]
4) **Przykład**: [przypadek lub praktyczne zastosowanie]
5) **Źródła**: [jeśli znasz, podaj. Inaczej: "Wiedza ogólna."]
6) **Opcje**:
   [A] Kontynuuj do następnego punktu | [B] Wyjaśnij dokładniej

WAŻNE:
- Gdy student wybiera [A] — PRZEJDŹ do następnego tematu natychmiast
- Gdy student wybiera [B] — POGŁĘB aktualny temat (więcej przykładów, szczegółów)
  Po rozwinięciu ([B]) podaj TYLKO opcję [A] (BEZ [B]) — nie oferuj ponownego rozwinięcia!`

export function SettingsView() {
  const [courseName, setCourseName] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [charCount, setCharCount] = useState(0)
  
  const [mentorName, setMentorName] = useState('Profesor')
  const [tutorLanguage, setTutorLanguage] = useState<'Polski' | 'English'>('Polski')
  const [darkMode, setDarkMode] = useState(true)
  
  const [tutorPrompt, setTutorPrompt] = useState(DEFAULT_TUTOR_PROMPT)
  const [tutorPromptCount, setTutorPromptCount] = useState(DEFAULT_TUTOR_PROMPT.length)
  
  const [mentorPrompt, setMentorPrompt] = useState(DEFAULT_MENTOR_PROMPT)
  const [mentorPromptCount, setMentorPromptCount] = useState(DEFAULT_MENTOR_PROMPT.length)
  
  const [curriculum, setCurriculum] = useState('')
  const [curriculumCount, setCurriculumCount] = useState(0)
  const [isGeneratingCurriculum, setIsGeneratingCurriculum] = useState(false)

  useEffect(() => {
    const savedCourse = localStorage.getItem('course_config')
    if (savedCourse) {
      try {
        const config: CourseConfig = JSON.parse(savedCourse)
        setCourseName(config.courseName || '')
        setCourseDescription(config.courseDescription || '')
        setCharCount(config.courseDescription?.length || 0)
      } catch (e) {
        console.error('Failed to load course config:', e)
      }
    }
    
    const savedPersonalization = localStorage.getItem('personalization_config')
    if (savedPersonalization) {
      try {
        const config: PersonalizationConfig = JSON.parse(savedPersonalization)
        setMentorName(config.mentorName || 'Profesor')
        setTutorLanguage(config.tutorLanguage || 'Polski')
        setDarkMode(config.darkMode ?? true)
      } catch (e) {
        console.error('Failed to load personalization config:', e)
      }
    }
    
    const savedTutorPrompt = localStorage.getItem('custom_tutor_prompt')
    if (savedTutorPrompt) {
      setTutorPrompt(savedTutorPrompt)
      setTutorPromptCount(savedTutorPrompt.length)
    }
    
    const savedMentorPrompt = localStorage.getItem('custom_mentor_prompt')
    if (savedMentorPrompt) {
      setMentorPrompt(savedMentorPrompt)
      setMentorPromptCount(savedMentorPrompt.length)
    }
    
    const savedCurriculum = localStorage.getItem('curriculum_topics')
    if (savedCurriculum) {
      setCurriculum(savedCurriculum)
      setCurriculumCount(savedCurriculum.length)
    }
  }, [])

  const handleDescriptionChange = (value: string) => {
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setCourseDescription(value)
      setCharCount(value.length)
    }
  }
  
  const handleMentorNameChange = (value: string) => {
    if (value.length <= MAX_MENTOR_NAME_LENGTH) {
      setMentorName(value)
    }
  }
  
  const handleTutorPromptChange = (value: string) => {
    if (value.length <= MAX_PROMPT_LENGTH) {
      setTutorPrompt(value)
      setTutorPromptCount(value.length)
    }
  }
  
  const handleMentorPromptChange = (value: string) => {
    if (value.length <= MAX_PROMPT_LENGTH) {
      setMentorPrompt(value)
      setMentorPromptCount(value.length)
    }
  }
  
  const handleCurriculumChange = (value: string) => {
    if (value.length <= MAX_CURRICULUM_LENGTH) {
      setCurriculum(value)
      setCurriculumCount(value.length)
    }
  }

  const handleSaveCourse = () => {
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
  
  const handleSavePersonalization = () => {
    const config: PersonalizationConfig = {
      mentorName: mentorName.trim(),
      tutorLanguage,
      darkMode,
    }

    try {
      localStorage.setItem('personalization_config', JSON.stringify(config))
      toast.success('Personalizacja zapisana', {
        description: 'Ustawienia zostały zaktualizowane.',
      })
    } catch (e) {
      toast.error('Błąd zapisu', {
        description: 'Nie udało się zapisać ustawień.',
      })
    }
  }
  
  const handleSaveTutorPrompt = () => {
    try {
      localStorage.setItem('custom_tutor_prompt', tutorPrompt)
      toast.success('Prompt tutora zapisany', {
        description: 'Zmiany wpływają natychmiast na nowe pytania.',
      })
    } catch (e) {
      toast.error('Błąd zapisu', {
        description: 'Nie udało się zapisać promptu.',
      })
    }
  }
  
  const handleResetTutorPrompt = () => {
    setTutorPrompt(DEFAULT_TUTOR_PROMPT)
    setTutorPromptCount(DEFAULT_TUTOR_PROMPT.length)
    localStorage.removeItem('custom_tutor_prompt')
    toast.success('Prompt przywrócony', {
      description: 'Ustawiono domyślny prompt tutora.',
    })
  }
  
  const handleSaveMentorPrompt = () => {
    try {
      localStorage.setItem('custom_mentor_prompt', mentorPrompt)
      toast.success('Prompt mentora zapisany', {
        description: 'Zmiany wpływają natychmiast na nowe pytania.',
      })
    } catch (e) {
      toast.error('Błąd zapisu', {
        description: 'Nie udało się zapisać promptu.',
      })
    }
  }
  
  const handleResetMentorPrompt = () => {
    setMentorPrompt(DEFAULT_MENTOR_PROMPT)
    setMentorPromptCount(DEFAULT_MENTOR_PROMPT.length)
    localStorage.removeItem('custom_mentor_prompt')
    toast.success('Prompt przywrócony', {
      description: 'Ustawiono domyślny prompt mentora.',
    })
  }
  
  const handleSaveCurriculum = () => {
    try {
      localStorage.setItem('curriculum_topics', curriculum)
      toast.success('Curriculum zapisane', {
        description: 'Lista tematów została zaktualizowana.',
      })
    } catch (e) {
      toast.error('Błąd zapisu', {
        description: 'Nie udało się zapisać curriculum.',
      })
    }
  }

  const handleGenerateCurriculum = async () => {
    setIsGeneratingCurriculum(true)
    
    try {
      const generatedCurriculum = await generateCurriculumFromMaterials({
        courseName,
        courseDescription
      })
      
      setCurriculum(generatedCurriculum)
      setCurriculumCount(generatedCurriculum.length)
      
      localStorage.setItem('curriculum_topics', generatedCurriculum)
      
      toast.success('Curriculum wygenerowane!', {
        description: 'Lista tematów została automatycznie utworzona na podstawie materiałów i opisu kursu.'
      })
    } catch (error: any) {
      toast.error('Błąd generowania', {
        description: error.message || 'Nie udało się wygenerować curriculum.'
      })
    } finally {
      setIsGeneratingCurriculum(false)
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
              Skonfiguruj temat kursu, personalizację oraz prompty systemowe
            </p>
          </div>

          <div className="space-y-8">
            <FileUploadSection />

            <div className="space-y-4 pb-8 border-b border-white/10">
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
                onClick={handleSaveCourse}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              >
                <FloppyDisk className="mr-2" />
                💾 Zapisz
              </Button>
            </div>

            <div className="space-y-4 pb-8 border-b border-white/10">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                🎨 Personalizacja
              </h3>

              <div className="space-y-2">
                <Label htmlFor="mentor-name" className="text-sm font-medium">
                  Nazwa mentora
                </Label>
                <Input
                  id="mentor-name"
                  value={mentorName}
                  onChange={(e) => handleMentorNameChange(e.target.value)}
                  placeholder="Profesor"
                  maxLength={MAX_MENTOR_NAME_LENGTH}
                  className="bg-background/50 border-white/10 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Wyświetlane jako etykieta awatara Mentora (max {MAX_MENTOR_NAME_LENGTH} znaków)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tutor-language" className="text-sm font-medium">
                  Język tutora
                </Label>
                <Select value={tutorLanguage} onValueChange={(value) => setTutorLanguage(value as 'Polski' | 'English')}>
                  <SelectTrigger id="tutor-language" className="bg-background/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Polski">Polski</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tutorLanguage === 'English' 
                    ? 'Tutor będzie odpowiadał po angielsku' 
                    : 'Tutor będzie odpowiadał po polsku'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode" className="text-sm font-medium">
                    Tryb ciemny
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Przechowywane na przyszłość (obecnie zawsze włączone)
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>

              <Button
                onClick={handleSavePersonalization}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              >
                <FloppyDisk className="mr-2" />
                💾 Zapisz
              </Button>
            </div>

            <div className="space-y-4 pb-8 border-b border-white/10">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                📝 Prompt systemowy (Tutor)
              </h3>

              <div className="space-y-2">
                <Label htmlFor="tutor-prompt" className="text-sm font-medium">
                  Instrukcja dla AI Tutora
                </Label>
                <Textarea
                  id="tutor-prompt"
                  value={tutorPrompt}
                  onChange={(e) => handleTutorPromptChange(e.target.value)}
                  rows={12}
                  className="bg-background/50 border-white/10 focus:border-primary resize-none font-mono text-sm"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Zmiany promptu wpływają natychmiast na nowe pytania.
                  </p>
                  <span
                    className={`text-sm ${
                      tutorPromptCount > MAX_PROMPT_LENGTH * 0.9
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {tutorPromptCount} / {MAX_PROMPT_LENGTH}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveTutorPrompt}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                >
                  <FloppyDisk className="mr-2" />
                  💾 Zapisz
                </Button>
                <Button
                  onClick={handleResetTutorPrompt}
                  variant="outline"
                  className="border-white/10 hover:bg-white/5"
                >
                  <ArrowClockwise className="mr-2" />
                  🔄 Przywróć domyślny
                </Button>
              </div>
            </div>

            <div className="space-y-4 pb-8 border-b border-white/10">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                📝 Prompt systemowy (Mentor)
              </h3>

              <div className="space-y-2">
                <Label htmlFor="mentor-prompt" className="text-sm font-medium">
                  Instrukcja dla AI Mentora
                </Label>
                <Textarea
                  id="mentor-prompt"
                  value={mentorPrompt}
                  onChange={(e) => handleMentorPromptChange(e.target.value)}
                  rows={12}
                  className="bg-background/50 border-white/10 focus:border-primary resize-none font-mono text-sm"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Zmiany promptu wpływają natychmiast na nowe pytania.
                  </p>
                  <span
                    className={`text-sm ${
                      mentorPromptCount > MAX_PROMPT_LENGTH * 0.9
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {mentorPromptCount} / {MAX_PROMPT_LENGTH}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveMentorPrompt}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                >
                  <FloppyDisk className="mr-2" />
                  💾 Zapisz
                </Button>
                <Button
                  onClick={handleResetMentorPrompt}
                  variant="outline"
                  className="border-white/10 hover:bg-white/5"
                >
                  <ArrowClockwise className="mr-2" />
                  🔄 Przywróć domyślny
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                📋 Lista tematów kursu (Curriculum)
              </h3>

              <div className="space-y-2">
                <Label htmlFor="curriculum" className="text-sm font-medium">
                  Struktura tematów
                </Label>
                <Textarea
                  id="curriculum"
                  value={curriculum}
                  onChange={(e) => handleCurriculumChange(e.target.value)}
                  rows={10}
                  placeholder={`# Rozdział 1: Wprowadzenie
## 1.1 Podstawowe pojęcia
## 1.2 Historia dziedziny
# Rozdział 2: Zagadnienia zaawansowane
## 2.1 Metody badawcze
## 2.2 Zastosowania praktyczne`}
                  className="bg-background/50 border-white/10 focus:border-primary resize-none font-mono text-sm"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Używane przez Mentora do sekwencyjnej nawigacji i śledzenia postępów. Format: # = H1, ## = H2, ### = H3
                  </p>
                  <span
                    className={`text-sm ${
                      curriculumCount > MAX_CURRICULUM_LENGTH * 0.9
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {curriculumCount} / {MAX_CURRICULUM_LENGTH}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveCurriculum}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                >
                  <FloppyDisk className="mr-2" />
                  💾 Zapisz
                </Button>
                <Button
                  onClick={handleGenerateCurriculum}
                  disabled={isGeneratingCurriculum}
                  variant="outline"
                  className="border-accent/30 hover:bg-accent/10 text-accent hover:text-accent"
                >
                  {isGeneratingCurriculum ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      ✨ Generowanie...
                    </>
                  ) : (
                    <>
                      <Sparkle className="mr-2" />
                      ✨ Generuj automatycznie
                    </>
                  )}
                </Button>
              </div>

              {isGeneratingCurriculum && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                  <p className="text-sm text-accent-foreground">
                    🤖 AI analizuje materiały kursowe i konfigurację tematu, aby wygenerować strukturę curriculum...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
