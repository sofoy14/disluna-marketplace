// components/modals/CreateFileModal.tsx
"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Upload, 
  Link, 
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateFileModalProps {
  children: React.ReactNode;
  onFileCreated?: (file: any) => void;
}

export function CreateFileModal({ children, onFileCreated }: CreateFileModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'upload' | 'url'>('upload');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    if (!fileName.trim()) {
      setFileName(file.name.split('.')[0]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleCreateFile = async () => {
    if (!fileName.trim()) return;

    setIsUploading(true);
    try {
      const newFile = {
        id: Date.now().toString(),
        name: fileName,
        method: selectedMethod,
        url: fileUrl,
        file: uploadedFile,
        createdAt: new Date().toISOString()
      };

      onFileCreated?.(newFile);
      setIsOpen(false);
      
      // Reset form
      setSelectedMethod('upload');
      setFileName('');
      setFileUrl('');
      setUploadedFile(null);
    } catch (error) {
      console.error('Error creating file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedMethod('upload');
    setFileName('');
    setFileUrl('');
    setUploadedFile(null);
  };

  const acceptedFileTypes = '.pdf,.doc,.docx,.txt';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden bg-[#1a1a1a] border-gray-800">
        <div className="flex flex-col h-full">
          {/* Header Banner */}
          <div className="px-6 py-4 bg-[#2d2d2d] border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-500" />
              <p className="text-white text-sm">
                Sube un archivo desde tu dispositivo o agrega un enlace para organizar tu documentación legal
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-2 h-full">
              {/* Panel Izquierdo - Método de Agregar */}
              <div className="border-r border-gray-800 p-6 bg-[#1f1f1f]">
                <h3 className="text-white text-base font-semibold mb-6">Método de Agregar</h3>
                
                <div className="space-y-4">
                  {/* Opción Subir Archivo */}
                  <div
                    onClick={() => setSelectedMethod('upload')}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all",
                      selectedMethod === 'upload'
                        ? "bg-[#3a1f3a] border-purple-500"
                        : "bg-[#2d2d2d] border-gray-700 hover:border-gray-600"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <Upload className={cn(
                        "h-6 w-6 flex-shrink-0",
                        selectedMethod === 'upload' ? "text-purple-400" : "text-purple-500"
                      )} />
                      <div className="flex-1">
                        <p className={cn(
                          "font-semibold mb-1",
                          "text-white"
                        )}>
                          Subir Archivo
                        </p>
                        <p className="text-sm text-gray-400">
                          Selecciona un archivo desde tu dispositivo
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Opción Agregar Enlace */}
                  <div
                    onClick={() => setSelectedMethod('url')}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all",
                      selectedMethod === 'url'
                        ? "bg-[#3a1f3a] border-purple-500"
                        : "bg-[#2d2d2d] border-gray-700 hover:border-gray-600"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <Link className={cn(
                        "h-6 w-6 flex-shrink-0",
                        selectedMethod === 'url' ? "text-purple-400" : "text-purple-500"
                      )} />
                      <div className="flex-1">
                        <p className={cn(
                          "font-semibold mb-1",
                          "text-white"
                        )}>
                          Agregar Enlace
                        </p>
                        <p className="text-sm text-gray-400">
                          Ingresa una URL para vincular un archivo externo
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel Derecho - Formulario */}
              <div className="p-6 bg-[#1f1f1f]">
                {selectedMethod === 'upload' ? (
                  <>
                    <h3 className="text-white text-base font-semibold mb-6">Subir Archivo</h3>
                    
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                        isDragging
                          ? "border-purple-500 bg-purple-500/10"
                          : uploadedFile
                          ? "border-gray-700"
                          : "border-purple-500 bg-[#2d2d2d] hover:bg-[#333333]"
                      )}
                    >
                      <Upload className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                      <p className="text-white font-medium mb-2">
                        Haz clic para seleccionar
                      </p>
                      <p className="text-gray-400 text-sm mb-1">
                        o arrastra un archivo aquí
                      </p>
                      <p className="text-gray-500 text-xs">
                        PDF, DOC, DOCX, TXT
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept={acceptedFileTypes}
                    />

                    {uploadedFile && (
                      <div className="mt-4 p-4 bg-[#2d2d2d] rounded-lg border border-gray-700">
                        <p className="text-white font-medium">{uploadedFile.name}</p>
                        <p className="text-gray-400 text-sm">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    )}

                    <div className="mt-6">
                      <Label htmlFor="file-name-url" className="text-gray-300 mb-2 block">
                        Nombre del archivo (opcional)
                      </Label>
                      <Input
                        id="file-name-url"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Mi documento"
                        className="bg-[#2d2d2d] border-gray-700 text-white placeholder:text-gray-500"
                      />
                    </div>

                    <Button
                      onClick={handleCreateFile}
                      disabled={!uploadedFile || isUploading}
                      className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        "Subir Archivo"
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-white text-base font-semibold mb-6">Agregar Enlace</h3>
                    
                    <div className="flex justify-center mb-8">
                      <Link className="h-16 w-16 text-purple-500" />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file-url-input" className="text-gray-300 mb-2 block">
                          URL del archivo
                        </Label>
                        <Input
                          id="file-url-input"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                          placeholder="https://ejemplo.com/archivo.pdf"
                          className="bg-[#2d2d2d] border-gray-700 text-white placeholder:text-gray-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="file-name-link" className="text-gray-300 mb-2 block">
                          Nombre del archivo (opcional)
                        </Label>
                        <Input
                          id="file-name-link"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          placeholder="Mi documento"
                          className="bg-[#2d2d2d] border-gray-700 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateFile}
                      disabled={!fileUrl.trim() || isUploading}
                      className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Agregando...
                        </>
                      ) : (
                        "Agregar Enlace"
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
