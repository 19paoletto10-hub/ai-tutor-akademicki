import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { File as FileIcon, Trash, Eye, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { processDocument, formatFileSize, getTotalStorageSize, type ProcessedDocument } from '@/lib/document-processor'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const MAX_STORAGE_SIZE = 4 * 1024 * 1024

interface FileUploadSectionProps {
  onMaterialsChange?: () => void
}

export function FileUploadSection({ onMaterialsChange }: FileUploadSectionProps) {
  const [materials, setMaterials] = useState<ProcessedDocument[]>(() => {
    try {
      const stored = localStorage.getItem('uploaded_materials')
      if (stored) {
        return JSON.parse(stored) as ProcessedDocument[]
      }
    } catch (error) {
      console.error('Error loading materials:', error)
    }
    return []
  })

  const [dragOver, setDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<ProcessedDocument | null>(null)
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<string | null>(null)
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const saveMaterials = (newMaterials: ProcessedDocument[]) => {
    try {
      const storageSize = getTotalStorageSize(newMaterials)
      if (storageSize > MAX_STORAGE_SIZE) {
        toast.error('Przekroczono limit pamięci (4 MB). Usuń stare materiały, aby dodać nowe.')
        return false
      }
      
      localStorage.setItem('uploaded_materials', JSON.stringify(newMaterials))
      setMaterials(newMaterials)
      onMaterialsChange?.()
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        toast.error('Przekroczono limit pamięci (4 MB). Usuń stare materiały, aby dodać nowe.')
      } else {
        toast.error('Błąd zapisu materiałów')
      }
      return false
    }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const currentCount = materials.length
    if (currentCount + files.length > MAX_FILES) {
      toast.error(`Maksymalnie ${MAX_FILES} plików. Usuń stare materiały.`)
      return
    }

    const validFiles: File[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      if (!extension || !['pdf', 'docx', 'pptx'].includes(extension)) {
        toast.error(`Nieobsługiwany format pliku: ${file.name}. Użyj PDF, DOCX lub PPTX.`)
        continue
      }
      
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Plik ${file.name} jest za duży (maks. 10 MB).`)
        continue
      }
      
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    const processingMaterials = validFiles.map(file => ({
      filename: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      chunks: [],
      totalChars: 0,
      status: 'processing' as const
    }))

    const updatedMaterials = [...materials, ...processingMaterials]
    setMaterials(updatedMaterials)

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const processingIndex = materials.length + i
      
      try {
        const processed = await processDocument(file)
        
        if (processed.status === 'error') {
          toast.error(`Nie udało się przetworzyć ${file.name}: ${processed.errorMessage}`)
        } else if (processed.totalChars === 0) {
          toast.error(`Nie udało się wyodrębnić tekstu z pliku ${file.name}`)
          processed.status = 'error'
          processed.errorMessage = 'No text extracted'
        } else {
          toast.success(`Przetworzono ${file.name}: ${processed.chunks.length} fragmentów`)
        }
        
        updatedMaterials[processingIndex] = processed
        
        const success = saveMaterials([...updatedMaterials])
        if (!success) {
          updatedMaterials.splice(processingIndex, 1)
          setMaterials([...updatedMaterials])
          break
        }
      } catch (error) {
        toast.error(`Błąd przetwarzania ${file.name}`)
        updatedMaterials[processingIndex] = {
          ...updatedMaterials[processingIndex],
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
        setMaterials([...updatedMaterials])
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDelete = (filename: string) => {
    const newMaterials = materials.filter(m => m.filename !== filename)
    saveMaterials(newMaterials)
    toast.success('Materiał usunięty')
    setDeleteConfirmFile(null)
  }

  const handleDeleteAll = () => {
    localStorage.removeItem('uploaded_materials')
    setMaterials([])
    onMaterialsChange?.()
    toast.success('Wszystkie materiały usunięte')
    setDeleteAllConfirm(false)
  }

  const totalFiles = materials.length
  const totalChunks = materials.reduce((sum, m) => sum + m.chunks.length, 0)
  const totalChars = materials.reduce((sum, m) => sum + m.totalChars, 0)
  const storageUsed = getTotalStorageSize(materials)
  const storagePercent = (storageUsed / MAX_STORAGE_SIZE) * 100

  return (
    <div className="space-y-4 pb-8 border-b border-white/10">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        📄 Materiały kursowe
      </h3>

      <div
        className={`
          relative border-2 border-dashed rounded-xl transition-all duration-200 h-[200px]
          flex flex-col items-center justify-center gap-3 cursor-pointer
          ${dragOver 
            ? 'border-primary bg-primary/10' 
            : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800/70 hover:border-slate-500'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <FileIcon size={48} className="text-muted-foreground" />
        <p className="text-foreground font-medium">
          Przeciągnij pliki tutaj lub kliknij, aby wybrać
        </p>
        <p className="text-sm text-muted-foreground text-center px-4">
          Obsługiwane formaty: PDF, DOCX, PPTX (maks. 10 MB na plik, maks. {MAX_FILES} plików)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {materials.length > 0 && (
        <>
          <div className="space-y-3">
            {materials.map((material) => (
              <Card
                key={material.filename}
                className="bg-slate-800/50 border-white/10 p-4 hover:bg-slate-800/70 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileIcon size={20} className="text-primary flex-shrink-0" />
                      <p className="font-medium truncate">{material.filename}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatFileSize(material.fileSize)}</span>
                      {material.status === 'processed' && (
                        <>
                          <span>•</span>
                          <span>{material.chunks.length} fragmentów</span>
                          <span>•</span>
                          <span>{material.totalChars.toLocaleString()} znaków</span>
                        </>
                      )}
                    </div>

                    <div className="mt-2">
                      {material.status === 'processing' && (
                        <div className="flex items-center gap-2">
                          <Progress value={50} className="h-1 flex-1" />
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                            ⏳ Przetwarzanie...
                          </Badge>
                        </div>
                      )}
                      {material.status === 'processed' && (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                          ✅ Przetworzony
                        </Badge>
                      )}
                      {material.status === 'error' && (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                          ❌ Błąd: {material.errorMessage}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {material.status === 'processed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 hover:bg-white/5"
                        onClick={() => setPreviewFile(material)}
                      >
                        <Eye className="mr-2" />
                        👁️ Podgląd
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => setDeleteConfirmFile(material.filename)}
                    >
                      <Trash className="mr-2" />
                      🗑️ Usuń
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-900/50 border-white/10 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Łącznie: {totalFiles} plików, {totalChunks} fragmentów, {totalChars.toLocaleString()} znaków
                </span>
                <span className={`font-medium ${storagePercent > 90 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formatFileSize(storageUsed)} / {formatFileSize(MAX_STORAGE_SIZE)}
                </span>
              </div>
              <Progress value={storagePercent} className="h-2" />
              {storagePercent > 90 && (
                <p className="text-xs text-destructive">
                  ⚠️ Zbliżasz się do limitu pamięci. Usuń stare materiały, aby dodać nowe.
                </p>
              )}
            </div>
          </Card>

          <Button
            variant="destructive"
            onClick={() => setDeleteAllConfirm(true)}
            className="w-full"
          >
            <Trash className="mr-2" />
            🗑️ Usuń wszystkie materiały
          </Button>
        </>
      )}

      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileIcon size={24} className="text-primary" />
              {previewFile?.filename}
            </DialogTitle>
            <DialogDescription>
              Podgląd pierwszych 2000 znaków
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-950 p-4 rounded-lg border border-white/10">
            <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
              {previewFile?.chunks
                .map(c => c.text)
                .join('\n\n')
                .slice(0, 2000)}
              {previewFile && previewFile.totalChars > 2000 && '\n\n...'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmFile} onOpenChange={() => setDeleteConfirmFile(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń materiał?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć <strong>{deleteConfirmFile}</strong>? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmFile(null)}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmFile && handleDelete(deleteConfirmFile)}>
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń wszystkie materiały?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć wszystkie przesłane materiały? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAllConfirm(false)}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive">
              Usuń wszystko
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
