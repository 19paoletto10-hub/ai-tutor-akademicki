import { useState, useEffect } from 'react'

export interface MaterialChunk {
  text: string
  index: number
}

export interface UploadedMaterial {
  filename: string
  fileSize: number
  uploadedAt: string
  chunks: MaterialChunk[]
  totalChars: number
  status: 'processing' | 'processed' | 'error'
  errorMessage?: string
}

const STORAGE_KEY = 'uploaded_materials'
const MAX_CONTEXT_CHARS = 80000

export function useUploadedMaterials() {
  const [materials, setMaterials] = useState<UploadedMaterial[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setMaterials(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      console.error('Failed to load materials from localStorage:', error)
      setMaterials([])
    }
  }, [])

  const saveMaterials = (newMaterials: UploadedMaterial[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMaterials))
      setMaterials(newMaterials)
    } catch (error) {
      console.error('Failed to save materials to localStorage:', error)
      throw error
    }
  }

  const addMaterial = (material: UploadedMaterial) => {
    const updated = [...materials.filter(m => m.filename !== material.filename), material]
    saveMaterials(updated)
  }

  const removeMaterial = (filename: string) => {
    const updated = materials.filter(m => m.filename !== filename)
    saveMaterials(updated)
  }

  const clearAllMaterials = () => {
    saveMaterials([])
  }

  return {
    materials,
    addMaterial,
    removeMaterial,
    clearAllMaterials,
  }
}

export function getKnowledgeBaseContext(
  materials: UploadedMaterial[],
  userMessage?: string
): string {
  const processedMaterials = materials.filter(m => m.status === 'processed')
  
  if (processedMaterials.length === 0) {
    return ''
  }

  const keywords = userMessage 
    ? userMessage
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length >= 3)
    : []

  interface ScoredChunk {
    material: UploadedMaterial
    chunk: MaterialChunk
    score: number
  }

  const scoredChunks: ScoredChunk[] = []
  
  processedMaterials.forEach(material => {
    material.chunks.forEach(chunk => {
      let score = 0
      
      if (keywords.length > 0) {
        const chunkLower = chunk.text.toLowerCase()
        keywords.forEach(keyword => {
          const matches = (chunkLower.match(new RegExp(keyword, 'g')) || []).length
          score += matches
        })
      }
      
      scoredChunks.push({
        material,
        chunk,
        score: keywords.length > 0 ? score : 1
      })
    })
  })

  scoredChunks.sort((a, b) => b.score - a.score)

  const selectedChunks: ScoredChunk[] = []
  let totalChars = 0
  const filesIncluded = new Set<string>()

  for (const scored of scoredChunks) {
    const chunkLength = scored.chunk.text.length
    
    if (totalChars + chunkLength <= MAX_CONTEXT_CHARS) {
      selectedChunks.push(scored)
      totalChars += chunkLength
      filesIncluded.add(scored.material.filename)
    }
    
    if (filesIncluded.size === processedMaterials.length && selectedChunks.length >= processedMaterials.length * 2) {
      break
    }
  }

  const minChunksPerFile = 2
  processedMaterials.forEach(material => {
    const chunksFromThisFile = selectedChunks.filter(sc => sc.material.filename === material.filename)
    
    if (chunksFromThisFile.length < minChunksPerFile) {
      const additionalNeeded = minChunksPerFile - chunksFromThisFile.length
      const availableChunks = scoredChunks.filter(
        sc => sc.material.filename === material.filename && 
              !selectedChunks.find(sel => sel.chunk.index === sc.chunk.index)
      )
      
      for (let i = 0; i < Math.min(additionalNeeded, availableChunks.length); i++) {
        const chunk = availableChunks[i]
        if (totalChars + chunk.chunk.text.length <= MAX_CONTEXT_CHARS) {
          selectedChunks.push(chunk)
          totalChars += chunk.chunk.text.length
        }
      }
    }
  })

  const groupedByFile = new Map<string, ScoredChunk[]>()
  selectedChunks.forEach(sc => {
    if (!groupedByFile.has(sc.material.filename)) {
      groupedByFile.set(sc.material.filename, [])
    }
    groupedByFile.get(sc.material.filename)!.push(sc)
  })

  let knowledgeBlock = `BAZA WIEDZY — MATERIAŁY KURSOWE:
Poniżej znajdują się fragmenty materiałów kursowych przesłanych przez studenta. Odpowiadaj NA ICH PODSTAWIE gdy to możliwe. Cytuj źródła (nazwa pliku) gdy korzystasz z materiałów.

`

  groupedByFile.forEach((chunks, filename) => {
    knowledgeBlock += `--- Źródło: ${filename} ---\n`
    chunks.sort((a, b) => a.chunk.index - b.chunk.index)
    chunks.forEach(sc => {
      knowledgeBlock += `${sc.chunk.text}\n\n`
    })
    knowledgeBlock += '\n'
  })

  knowledgeBlock += `WAŻNE:
- Przy odpowiadaniu PRIORYTETOWO traktuj informacje z materiałów kursowych.
- Gdy odpowiedź pochodzi z materiałów, dodaj na końcu: "📚 Źródło: {filename}".
- Gdy materiały nie zawierają odpowiedzi, korzystaj z wiedzy ogólnej i zaznacz to.
`

  return knowledgeBlock
}

export function getKnowledgeBaseSummary(materials: UploadedMaterial[]): string | null {
  const processedMaterials = materials.filter(m => m.status === 'processed')
  
  if (processedMaterials.length === 0) {
    return null
  }

  const totalFragments = processedMaterials.reduce((sum, m) => sum + m.chunks.length, 0)
  
  return `📚 Baza wiedzy: ${processedMaterials.length} ${
    processedMaterials.length === 1 ? 'plik' : 'plików'
  } (${totalFragments} ${totalFragments === 1 ? 'fragment' : 'fragmentów'})`
}
