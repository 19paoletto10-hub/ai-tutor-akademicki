interface PdfJs {
  GlobalWorkerOptions: {
    workerSrc: string
  }
  getDocument(options: { data: ArrayBuffer }): {
    promise: Promise<{
      numPages: number
      getPage(num: number): Promise<{
        getTextContent(): Promise<{
          items: Array<{ str: string }>
        }>
      }>
    }>
  }
}

interface Mammoth {
  extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>
}

declare global {
  interface Window {
    pdfjsLib?: PdfJs
    mammoth?: Mammoth
    JSZip?: any
  }
}

export interface DocumentChunk {
  text: string
  index: number
}

export interface ProcessedDocument {
  filename: string
  fileSize: number
  uploadedAt: string
  chunks: DocumentChunk[]
  totalChars: number
  status: 'processing' | 'processed' | 'error'
  errorMessage?: string
}

const CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 200

export async function loadPdfJs(): Promise<void> {
  if (window.pdfjsLib) {
    return
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'
        resolve()
      } else {
        reject(new Error('PDF.js not loaded'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js'))
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs'
    document.head.appendChild(script)
  })
}

export async function extractPdfText(file: File): Promise<string> {
  await loadPdfJs()
  
  if (!window.pdfjsLib) {
    throw new Error('PDF.js not loaded')
  }
  
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    
    fullText += `\n\n--- Strona ${pageNum} ---\n\n${pageText}`
  }
  
  return fullText.trim()
}

export async function extractDocxText(file: File): Promise<string> {
  if (!window.mammoth) {
    throw new Error('Mammoth library not loaded')
  }
  
  const arrayBuffer = await file.arrayBuffer()
  const result = await window.mammoth.extractRawText({ arrayBuffer })
  
  return result.value
}

export async function extractPptxText(file: File): Promise<string> {
  if (!window.JSZip) {
    throw new Error('JSZip library not loaded')
  }
  
  const arrayBuffer = await file.arrayBuffer()
  const zip = await window.JSZip.loadAsync(arrayBuffer)
  
  let fullText = ''
  let slideNum = 0
  
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.match(/ppt\/slides\/slide\d+\.xml/))
    .sort((a, b) => {
      const matchA = a.match(/\d+/)
      const matchB = b.match(/\d+/)
      const numA = matchA ? parseInt(matchA[0]) : 0
      const numB = matchB ? parseInt(matchB[0]) : 0
      return numA - numB
    })
  
  for (const slidePath of slideFiles) {
    slideNum++
    const slideFile = zip.files[slidePath]
    const slideXml = await slideFile.async('text')
    
    const textMatches = slideXml.matchAll(/<a:t>(.*?)<\/a:t>/g)
    const slideText = Array.from(textMatches)
      .map((match) => (match as RegExpMatchArray)[1])
      .join(' ')
    
    if (slideText.trim()) {
      fullText += `\n\n--- Slajd ${slideNum} ---\n\n${slideText}`
    }
  }
  
  return fullText.trim()
}

export function chunkText(text: string): DocumentChunk[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: DocumentChunk[] = []
  
  let currentChunk = ''
  let chunkIndex = 0
  
  for (const paragraph of paragraphs) {
    const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph
    
    if (testChunk.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk,
        index: chunkIndex
      })
      chunkIndex++
      
      const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP)
      currentChunk = currentChunk.slice(overlapStart) + '\n\n' + paragraph
    } else {
      currentChunk = testChunk
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk,
      index: chunkIndex
    })
  }
  
  return chunks
}

export async function processDocument(file: File): Promise<ProcessedDocument> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  
  let extractedText = ''
  
  try {
    if (fileExtension === 'pdf') {
      extractedText = await extractPdfText(file)
    } else if (fileExtension === 'docx') {
      extractedText = await extractDocxText(file)
    } else if (fileExtension === 'pptx') {
      extractedText = await extractPptxText(file)
    } else {
      throw new Error('Unsupported file type')
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text extracted from file')
    }
    
    const chunks = chunkText(extractedText)
    
    return {
      filename: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      chunks,
      totalChars: extractedText.length,
      status: 'processed'
    }
  } catch (error) {
    return {
      filename: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      chunks: [],
      totalChars: 0,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function getTotalStorageSize(documents: ProcessedDocument[]): number {
  return documents.reduce((total, doc) => {
    const docSize = JSON.stringify(doc).length
    return total + docSize
  }, 0)
}

export function buildKnowledgeBase(
  documents: ProcessedDocument[],
  userMessage?: string,
  maxChars: number = 80000
): string {
  if (documents.length === 0) {
    return ''
  }
  
  const allChunks: Array<{
    filename: string
    chunk: DocumentChunk
    relevanceScore: number
  }> = []
  
  documents.forEach(doc => {
    if (doc.status === 'processed') {
      doc.chunks.forEach(chunk => {
        let score = 0
        
        if (userMessage) {
          const keywords = userMessage
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length >= 3)
          
          const chunkText = chunk.text.toLowerCase()
          keywords.forEach(keyword => {
            const matches = (chunkText.match(new RegExp(keyword, 'g')) || []).length
            score += matches
          })
        }
        
        allChunks.push({
          filename: doc.filename,
          chunk,
          relevanceScore: score
        })
      })
    }
  })
  
  if (userMessage) {
    allChunks.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }
  
  const chunksPerFile = Math.max(2, Math.floor(maxChars / (documents.length * 1500)))
  const selectedChunks: typeof allChunks = []
  const fileChunkCount = new Map<string, number>()
  
  for (const item of allChunks) {
    const count = fileChunkCount.get(item.filename) || 0
    if (count < chunksPerFile) {
      selectedChunks.push(item)
      fileChunkCount.set(item.filename, count + 1)
    }
  }
  
  let knowledgeBase = `BAZA WIEDZY — MATERIAŁY KURSOWE:
Poniżej znajdują się fragmenty materiałów kursowych przesłanych przez studenta. Odpowiadaj NA ICH PODSTAWIE gdy to możliwe. Cytuj źródła (nazwa pliku) gdy korzystasz z materiałów.

`
  
  let currentChars = knowledgeBase.length
  const fileTexts = new Map<string, string[]>()
  
  for (const item of selectedChunks) {
    const chunkWithNewlines = item.chunk.text + '\n\n'
    if (currentChars + chunkWithNewlines.length > maxChars) {
      break
    }
    
    if (!fileTexts.has(item.filename)) {
      fileTexts.set(item.filename, [])
    }
    fileTexts.get(item.filename)!.push(item.chunk.text)
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
`
  
  return knowledgeBase
}
