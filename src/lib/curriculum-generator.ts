import { getCourseConfig, getUploadedMaterials } from './storage'

export interface GenerateCurriculumOptions {
  courseName?: string
  courseDescription?: string
  materials?: any[]
}

export async function generateCurriculumFromMaterials(
  options: GenerateCurriculumOptions = {}
): Promise<string> {
  const courseConfig = getCourseConfig()
  const uploadedMaterials = getUploadedMaterials()
  
  const courseName = options.courseName || courseConfig?.courseName || ''
  const courseDescription = options.courseDescription || courseConfig?.courseDescription || ''
  const materials = options.materials || uploadedMaterials
  
  if (!courseName && !courseDescription && materials.length === 0) {
    throw new Error('Brak danych do wygenerowania curriculum. Dodaj nazwę kursu, opis lub prześlij materiały.')
  }
  
  let materialsContext = ''
  
  if (materials.length > 0) {
    materialsContext = '\n\nMATERIAŁY KURSOWE:\n'
    
    materials.forEach((material: any) => {
      materialsContext += `\n--- ${material.filename} ---\n`
      
      if (material.chunks && material.chunks.length > 0) {
        const maxChunks = Math.min(5, material.chunks.length)
        for (let i = 0; i < maxChunks; i++) {
          const chunk = material.chunks[i]
          const preview = chunk.text.substring(0, 2000)
          materialsContext += preview + '\n\n'
        }
      }
    })
  }
  
  const promptText = `Jesteś ekspertem edukacyjnym. Wygeneruj szczegółową listę tematów kursu (curriculum) w formacie Markdown.

${courseName ? `NAZWA KURSU: ${courseName}\n` : ''}
${courseDescription ? `OPIS KURSU:\n${courseDescription}\n` : ''}
${materialsContext}

WYMAGANIA:
1. Użyj formatu Markdown z nagłówkami # (H1), ## (H2), ### (H3)
2. Struktura hierarchiczna: główne rozdziały (H1), podtematy (H2), szczegóły (H3)
3. 5-12 głównych rozdziałów (H1)
4. Każdy rozdział powinien mieć 2-6 podtematów (H2)
5. Podtematy mogą mieć 0-4 szczegółów (H3)
6. Nazwy tematów zwięzłe i konkretne (max 60 znaków)
7. Logiczna progresja od podstaw do zaawansowanych
8. Jeśli są materiały kursowe - PRIORYTETOWO bazuj na ich strukturze i zawartości

PRZYKŁADOWY FORMAT:
# Rozdział 1: Wprowadzenie
## 1.1 Podstawowe pojęcia
### 1.1.1 Definicje
### 1.1.2 Terminologia
## 1.2 Historia dziedziny
# Rozdział 2: Teoria
## 2.1 Modele koncepcyjne
## 2.2 Paradygmaty badawcze

ZWRÓĆ UWAGĘ:
- Jeśli BRAK materiałów, generuj curriculum na podstawie opisu kursu i ogólnej wiedzy
- Jeśli SĄ materiały, analizuj ich zawartość i twórz curriculum odzwierciedlające strukturę materiałów
- Nazwy rozdziałów i podtematów muszą być DOKŁADNE i MERYTORYCZNE

Wygeneruj curriculum TYLKO w formacie Markdown. Bez dodatkowych komentarzy ani objaśnień.`

  const prompt = spark.llmPrompt([promptText], '')
  const response = await spark.llm(prompt, 'gpt-4o')
  
  return response.trim()
}
