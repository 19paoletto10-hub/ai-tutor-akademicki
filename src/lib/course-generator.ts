import { getCourseConfig, getUploadedMaterials } from './storage'
import { llm } from './llm'

export interface GenerateCourseConfigOptions {
  materials?: any[]
}

export async function generateCourseNameAndDescription(
  options: GenerateCourseConfigOptions = {}
): Promise<{ courseName: string; courseDescription: string }> {
  const uploadedMaterials = options.materials || getUploadedMaterials()
  
  if (uploadedMaterials.length === 0) {
    throw new Error('Brak przesłanych materiałów. Prześlij pliki PDF, DOCX lub PPTX, aby wygenerować nazwę i opis kursu.')
  }
  
  const processedMaterials = uploadedMaterials.filter((m: any) => m.status === 'processed')
  
  if (processedMaterials.length === 0) {
    throw new Error('Materiały nie zostały jeszcze przetworzone. Poczekaj na zakończenie przetwarzania.')
  }
  
  let materialsContext = 'PRZESŁANE MATERIAŁY KURSOWE:\n\n'
  
  processedMaterials.forEach((material: any) => {
    materialsContext += `=== PLIK: ${material.filename} ===\n`
    
    if (material.chunks && material.chunks.length > 0) {
      const maxChunks = Math.min(10, material.chunks.length)
      const selectedChunks: any[] = []
      
      if (material.chunks.length <= maxChunks) {
        selectedChunks.push(...material.chunks)
      } else {
        const step = Math.floor(material.chunks.length / maxChunks)
        for (let i = 0; i < maxChunks; i++) {
          const index = Math.min(i * step, material.chunks.length - 1)
          selectedChunks.push(material.chunks[index])
        }
      }
      
      selectedChunks.forEach((chunk: any, idx: number) => {
        const preview = chunk.text.substring(0, 1500)
        materialsContext += `\n--- Fragment ${idx + 1} ---\n${preview}\n`
      })
    }
    
    materialsContext += '\n\n'
  })
  
  const promptText = `Jesteś ekspertem edukacyjnym. Przeanalizuj dokładnie przesłane materiały kursowe i wygeneruj:
1. NAZWĘ KURSU (zwięzła, merytoryczna, max 80 znaków)
2. OPIS KURSU (szczegółowy opis zakresu, kluczowych tematów i pojęć, 200-800 znaków)

${materialsContext}

WYMAGANIA:
- Nazwa kursu powinna być KONKRETNA i odzwierciedlać główny temat materiałów
- Opis kursu powinien zawierać:
  * Główny zakres tematyczny
  * Kluczowe pojęcia i zagadnienia (wylistowane)
  * Poziom zaawansowania (jeśli da się określić)
  * Kontekst akademicki/praktyczny
- Bazuj WYŁĄCZNIE na treści materiałów — NIE wymyślaj informacji
- Jeśli materiały dotyczą różnych tematów, znajdź wspólny mianownik
- Odpowiedź TYLKO w formacie JSON (bez dodatkowych komentarzy)

FORMAT ODPOWIEDZI (JSON):
{
  "courseName": "Dokładna nazwa kursu",
  "courseDescription": "Szczegółowy opis kursu obejmujący zakres tematyczny, kluczowe pojęcia i zagadnienia. Lista głównych tematów: temat1, temat2, temat3. Poziom: podstawowy/średniozaawansowany/zaawansowany."
}

Wygeneruj JSON:`

  const prompt = spark.llmPrompt([promptText], '')
  
  const result = await llm(prompt, 'gpt-4o', {
    maxTokens: 1500,
    jsonMode: true,
    autoContinue: false
  })
  
  let parsedResult: any
  try {
    parsedResult = JSON.parse(result.content)
  } catch (error) {
    throw new Error('Błąd parsowania odpowiedzi AI. Spróbuj ponownie.')
  }
  
  if (!parsedResult.courseName || !parsedResult.courseDescription) {
    throw new Error('AI nie zwróciło poprawnych danych. Spróbuj ponownie.')
  }
  
  return {
    courseName: parsedResult.courseName.trim(),
    courseDescription: parsedResult.courseDescription.trim()
  }
}
