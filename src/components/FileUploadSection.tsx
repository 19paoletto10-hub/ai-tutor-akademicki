import { useState, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FilePlus, Eye, Trash, UploadSimple, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useUploadedMaterials } from '@/hooks/use-uploaded-materials'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const MAX_TOTAL_CHARS = 4 * 1024 * 1024

interface UploadedFile {
  filename: string
  fileSize: number
  uploadedAt: string
  chunks: { text: string; index: number }[]
  totalChars: number
  status: 'processing' | 'processed' | 'error'
  errorMessage?: string
}

export function FileUploadSection() {
  const { materials, addMaterial, removeMaterial, clearAllMaterials } = useUploadedMaterials()
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const pdfjsLib = (window as any).pdfjsLib
    if (!pdfjsLib) {
      throw new Error('PDF.js not loaded')
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += `\n\n--- Strona ${i} ---\n\n${pageText}`
    }
    
    return fullText.trim()
  }

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const mammoth = (window as any).mammoth
    if (!mammoth) {
      throw new Error('Mammoth.js not loaded')
    }

    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  const extractTextFromPPTX = async (file: File): Promise<string> => {
    const JSZip = (window as any).JSZip
    if (!JSZip) {
      throw new Error('JSZip not loaded')
    }

    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    
    const slideFiles: string[] = []
    zip.folder('ppt/slides')?.forEach((relativePath: string, file: any) => {
      if (relativePath.match(/^slide\d+\.xml$/)) {
        slideFiles.push(file.name)
      }
    })

    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0')
      const numB = parseInt(b.match(/\d+/)?.[0] || '0')
      return numA - numB
    })

    let fullText = ''
    for (let i = 0; i < slideFiles.length; i++) {
      const slideXml = await zip.file(slideFiles[i])?.async('string')
      if (slideXml) {
        const textMatches = slideXml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g)
        const slideText = Array.from(textMatches).map(match => match[1]).join(' ')
        if (slideText.trim()) {
          fullText += `\n\n--- Slajd ${i + 1} ---\n\n${slideText}`
        }
      }
    }
    
    return fullText.trim()
  }

  const chunkText = (text: string): { text: string; index: number }[] => {
    const CHUNK_SIZE = 1500
    const OVERLAP = 200

    const paragraphs = text.split(/\n\n+/)
    const chunks: { text: string; index: number }[] = []
    
    let currentChunk = ''
    let chunkIndex = 0

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({ text: currentChunk.trim(), index: chunkIndex })
        chunkIndex++
        
        const words = currentChunk.split(' ')
        const overlapText = words.slice(-Math.floor(OVERLAP / 5)).join(' ')
        currentChunk = overlapText + '\n\n' + para
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ text: currentChunk.trim(), index: chunkIndex })
    }

    return chunks
  }

  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Plik za duży', {
        description: `Plik ${file.name} przekracza maksymalny rozmiar 10 MB.`
      })
      return
    }

    if (materials.length >= MAX_FILES) {
      toast.error('Za dużo plików', {
        description: `Maksymalnie ${MAX_FILES} plików. Usuń stare materiały.`
      })
      return
    }

    const tempMaterial: UploadedFile = {
      filename: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      chunks: [],
      totalChars: 0,
      status: 'processing'
    }

    addMaterial(tempMaterial)

    try {
      let text = ''
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (extension === 'pdf') {
        text = await extractTextFromPDF(file)
      } else if (extension === 'docx') {
        text = await extractTextFromDOCX(file)
      } else if (extension === 'pptx') {
        text = await extractTextFromPPTX(file)
      } else {
        throw new Error('Nieobsługiwany format pliku')
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Nie udało się wyodrębnić tekstu')
      }

      const chunks = chunkText(text)
      const totalChars = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0)

      const currentTotalChars = materials.reduce((sum, m) => sum + m.totalChars, 0)
      if (currentTotalChars + totalChars > MAX_TOTAL_CHARS) {
        throw new Error('Przekroczono limit 4 MB. Usuń stare materiały.')
      }

      const processedMaterial: UploadedFile = {
        ...tempMaterial,
        chunks,
        totalChars,
        status: 'processed'
      }

      removeMaterial(file.name)
      addMaterial(processedMaterial)

      toast.success('Plik przetworzony', {
        description: `${file.name}: ${chunks.length} fragmentów, ${formatFileSize(totalChars)}`
      })
    } catch (error: any) {
      const errorMaterial: UploadedFile = {
        ...tempMaterial,
        status: 'error',
        errorMessage: error.message || 'Błąd przetwarzania'
      }

      removeMaterial(file.name)
      addMaterial(errorMaterial)

      toast.error('Błąd przetwarzania', {
        description: error.message || `Nie udało się przetworzyć pliku ${file.name}`
      })
    }
  }

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    Array.from(files).forEach(file => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!['pdf', 'docx', 'pptx'].includes(extension || '')) {
        toast.error('Nieobsługiwany format', {
          description: 'Użyj plików PDF, DOCX lub PPTX.'
        })
        return
      }

      processFile(file)
    })
  }, [materials])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (filename: string) => {
    removeMaterial(filename)
    toast.success('Plik usunięty', {
      description: `${filename} został usunięty.`
    })
  }

  const totalFiles = materials.length
  const totalFragments = materials.reduce((sum, m) => sum + m.chunks.length, 0)
  const totalChars = materials.reduce((sum, m) => sum + m.totalChars, 0)

  return (
    <div className="space-y-4 pb-8 border-b border-white/10">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        📄 Materiały kursowe
      </h3>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300
          ${isDragging 
            ? 'border-primary bg-primary/10 scale-[1.02]' 
            : 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
          }
        `}
        style={{ height: '200px' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
          <div className={`transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
            <FilePlus size={48} className={isDragging ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          <div className="text-center">
            <p className={`font-medium ${isDragging ? 'text-primary' : 'text-foreground'}`}>
              📄 Przeciągnij pliki tutaj lub kliknij, aby wybrać
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, DOCX, PPTX • maks. 10 MB/plik • maks. {MAX_FILES} plików
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {materials.length > 0 && (
        <div className="space-y-3">
          {materials.map((material) => (
            <Card
              key={material.filename}
              className="bg-slate-800/50 border-white/10 p-4 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📄</span>
                    <span className="font-medium truncate">{material.filename}</span>
                    {material.status === 'processed' && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                        ✅ Przetworzony
                      </Badge>
                    )}
                    {material.status === 'processing' && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                        ⏳ Przetwarzanie...
                      </Badge>
                    )}
                    {material.status === 'error' && (
                      <Badge variant="destructive">
                        ❌ Błąd
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>Rozmiar: {formatFileSize(material.fileSize)}</span>
                    {material.status === 'processed' && (
                      <>
                        <span>Fragmenty: {material.chunks.length}</span>
                        <span>Znaki: {formatFileSize(material.totalChars)}</span>
                      </>
                    )}
                  </div>

                  {material.status === 'error' && material.errorMessage && (
                    <p className="text-sm text-destructive mt-1">{material.errorMessage}</p>
                  )}

                  {material.status === 'processing' && (
                    <Progress value={50} className="h-1 mt-2" />
                  )}
                </div>

                <div className="flex gap-2">
                  {material.status === 'processed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 hover:bg-white/5"
                      onClick={() => setPreviewFile(material)}
                    >
                      <Eye size={16} className="mr-1" />
                      👁️ Podgląd
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveFile(material.filename)}
                  >
                    <Trash size={16} className="mr-1" />
                    🗑️
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Łącznie:</span>{' '}
              {totalFiles} {totalFiles === 1 ? 'plik' : 'plików'}, {totalFragments} fragmentów, {formatFileSize(totalChars)}
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash size={16} className="mr-2" />
              🗑️ Usuń wszystkie materiały
            </Button>
          </div>
        </div>
      )}

      <Dialog open={previewFile !== null} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Podgląd: {previewFile?.filename}</DialogTitle>
            <DialogDescription>
              Pierwsze 2000 znaków wyodrębnionego tekstu
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
            {previewFile?.chunks[0]?.text.substring(0, 2000)}
            {(previewFile?.chunks[0]?.text.length || 0) > 2000 && '...'}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć wszystkie materiały?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć wszystkie przesłane materiały? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              clearAllMaterials()
              setShowClearDialog(false)
              toast.success('Wszystkie materiały usunięte')
            }}>
              Usuń wszystkie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
