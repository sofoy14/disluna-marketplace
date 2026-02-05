// components/modals/CreateProcessModal.tsx
"use client";

import React, { useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import { ALIContext } from '@/context/context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FolderOpen,
  Plus,
  FileText,
  Users,
  Calendar,
  Tag,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Upload,
  X,
  FileArchive
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  complexity: 'Básico' | 'Intermedio' | 'Avanzado';
  features: string[];
  icon: React.ReactNode;
}

const processTemplates: ProcessTemplate[] = [
  {
    id: 'contract-review',
    name: 'Revisión de Contratos',
    description: 'Análisis completo de contratos con identificación de cláusulas importantes',
    category: 'Contratos',
    estimatedTime: '15-30 min',
    complexity: 'Intermedio',
    features: ['Análisis de cláusulas', 'Identificación de riesgos', 'Recomendaciones legales'],
    icon: <FileText className="h-6 w-6 text-blue-500" />
  },
  {
    id: 'legal-research',
    name: 'Investigación Legal',
    description: 'Búsqueda y análisis de jurisprudencia y normativa aplicable',
    category: 'Investigación',
    estimatedTime: '20-45 min',
    complexity: 'Avanzado',
    features: ['Búsqueda de jurisprudencia', 'Análisis normativo', 'Síntesis de hallazgos'],
    icon: <Sparkles className="h-6 w-6 text-purple-500" />
  },
  {
    id: 'client-consultation',
    name: 'Consulta con Cliente',
    description: 'Estructuración de consultas legales y seguimiento de casos',
    category: 'Atención al Cliente',
    estimatedTime: '10-20 min',
    complexity: 'Básico',
    features: ['Estructuración de consultas', 'Seguimiento de casos', 'Documentación'],
    icon: <Users className="h-6 w-6 text-green-500" />
  },
  {
    id: 'litigation-prep',
    name: 'Preparación de Litigio',
    description: 'Preparación de documentos y estrategias para procesos judiciales',
    category: 'Litigios',
    estimatedTime: '30-60 min',
    complexity: 'Avanzado',
    features: ['Estrategia legal', 'Documentos procesales', 'Análisis de pruebas'],
    icon: <Calendar className="h-6 w-6 text-red-500" />
  },
  {
    id: 'compliance-check',
    name: 'Verificación de Cumplimiento',
    description: 'Revisión de cumplimiento normativo y regulatorio',
    category: 'Cumplimiento',
    estimatedTime: '25-40 min',
    complexity: 'Intermedio',
    features: ['Auditoría normativa', 'Identificación de brechas', 'Plan de acción'],
    icon: <CheckCircle className="h-6 w-6 text-orange-500" />
  },
  {
    id: 'custom-process',
    name: 'Proceso Personalizado',
    description: 'Crea tu propio proceso legal desde cero',
    category: 'Personalizado',
    estimatedTime: 'Variable',
    complexity: 'Básico',
    features: ['Configuración libre', 'Plantillas personalizadas', 'Flujo adaptativo'],
    icon: <Plus className="h-6 w-6 text-gray-500" />
  }
];

interface CreateProcessModalProps {
  children: React.ReactNode;
  onProcessCreated?: (process: any) => void;
}

export function CreateProcessModal({ children, onProcessCreated }: CreateProcessModalProps) {
  const { selectedWorkspace } = useContext(ALIContext);
  const params = useParams();
  const workspaceIdFromUrl = params.workspaceid as string | undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProcessTemplate | null>(null);
  const [processName, setProcessName] = useState('');
  const [processContext, setProcessContext] = useState('');
  const [processDescription, setProcessDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleTemplateSelect = (template: ProcessTemplate) => {
    setSelectedTemplate(template);
    setProcessName(template.name);
    setProcessDescription(template.description);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isZipFile = (file: File) => {
    return file.name.toLowerCase().endsWith('.zip');
  };

  const handleCreateProcess = async () => {
    if (!processName.trim() || !processContext.trim()) return;

    setIsCreating(true);
    try {
      // Crear FormData para enviar archivos
      const formData = new FormData();
      formData.append('name', processName);
      formData.append('description', processDescription || '');
      formData.append('context', processContext);

      // Agregar workspace_id del workspace actual
      // Prioridad: selectedWorkspace del contexto > workspaceId de la URL
      const workspaceId = selectedWorkspace?.id || workspaceIdFromUrl;

      if (workspaceId) {
        formData.append('workspace_id', workspaceId);
        console.log('📌 Creating process with workspace_id:', workspaceId);
        console.log('📌 Workspace source:', selectedWorkspace?.id ? 'context' : 'URL');
        console.log('📌 Selected workspace name:', selectedWorkspace?.name || 'N/A');
      } else {
        console.error('❌ No workspace_id found in context or URL!');
        console.error('Context workspace:', selectedWorkspace);
        console.error('URL workspace:', workspaceIdFromUrl);
        alert('Error: No se pudo determinar el workspace actual. Por favor, recarga la página.');
        throw new Error('No workspace_id available');
      }

      // Agregar archivos al FormData
      selectedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      // Llamar a la API para crear el proceso
      const response = await fetch('/api/processes/create', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el proceso');
      }

      console.log('✅ Proceso creado exitosamente:', data);
      console.log('📌 Proceso creado en workspace:', data.process?.workspace_id);
      console.log('📌 Workspace actual (contexto):', selectedWorkspace?.id);
      console.log('📌 Workspace actual (URL):', workspaceIdFromUrl);

      // Cerrar el modal primero
      setIsOpen(false);

      // Reset form
      setSelectedTemplate(null);
      setProcessName('');
      setProcessDescription('');
      setProcessContext('');
      setSelectedFiles([]);

      // Llamar callback si existe
      onProcessCreated?.(data.process);

      // Navigate to the created process immediately
      if (data.process?.id && data.process?.workspace_id) {
        console.log(`🚀 Redirecting to new process: ${data.process.id}`);
        // Close modal immediately
        setIsOpen(false);
        // Redirect
        window.location.href = `/${data.process.workspace_id}/processes/${data.process.id}`;
      } else {
        // Fallback if no ID (should not happen)
        console.warn('⚠️ No process ID returned, refreshing page');
        window.location.reload();
      }

      // onProcessCreated?.(data.process);
      // setIsOpen(false);

      // Reset form
      // setSelectedTemplate(null);
      // setProcessName('');
      // setProcessDescription('');
      // setProcessContext('');
      // setSelectedFiles([]);
    } catch (error) {
      console.error('Error creating process:', error);
      alert(`Error al crear el proceso: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Básico':
        return 'bg-green-100 text-green-800';
      case 'Intermedio':
        return 'bg-yellow-100 text-yellow-800';
      case 'Avanzado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[95vh] p-0 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-blue-500" />
              Crear Nuevo Proceso
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Selecciona una plantilla o crea un proceso personalizado para organizar tu trabajo legal
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex">
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full flex-1">
              {/* Panel izquierdo - Selección de plantillas */}
              <div className="border-r p-6 bg-gray-50/50 overflow-hidden flex flex-col h-full">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Plantillas Disponibles</h3>
                <ScrollArea className="flex-1 pr-4 h-[calc(95vh-250px)]">
                  <div className="grid grid-cols-1 gap-4">
                    {processTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2",
                          selectedTemplate?.id === template.id
                            ? "ring-2 ring-blue-500 bg-blue-50 border-blue-200"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {template.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base truncate">{template.name}</CardTitle>
                                <CardDescription className="text-sm line-clamp-2">
                                  {template.description}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge className={cn("flex-shrink-0", getComplexityColor(template.complexity))}>
                              {template.complexity}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Tag className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{template.category}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>{template.estimatedTime}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {template.features.slice(0, 2).map((feature, index) => (
                                <Badge key={index} variant="secondary" className="text-xs truncate max-w-[120px]">
                                  {feature}
                                </Badge>
                              ))}
                              {template.features.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{template.features.length - 2} más
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Panel derecho - Configuración del proceso */}
              <div className="p-6 bg-white overflow-y-auto h-full">
                <ScrollArea className="h-[calc(95vh-200px)]">
                  {selectedTemplate || processName ? (
                    <div className="space-y-6 pr-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">
                          {selectedTemplate ? 'Configurar Proceso' : 'Crear Proceso Personalizado'}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="process-name" className="text-sm font-medium text-gray-700">Nombre del Proceso</Label>
                            <Input
                              id="process-name"
                              value={processName}
                              onChange={(e) => setProcessName(e.target.value)}
                              placeholder="Ingresa el nombre del proceso"
                              className="mt-1 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <Label htmlFor="process-description" className="text-sm font-medium text-gray-700">Descripción</Label>
                            <Textarea
                              id="process-description"
                              value={processDescription}
                              onChange={(e) => setProcessDescription(e.target.value)}
                              placeholder="Describe el propósito de este proceso"
                              className="mt-1 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor="process-context" className="text-sm font-medium text-gray-700">
                              Contexto del Proceso <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              id="process-context"
                              value={processContext}
                              onChange={(e) => setProcessContext(e.target.value)}
                              placeholder="Proporciona información detallada del contexto del proceso para la IA..."
                              className="mt-1 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              rows={5}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Esta información será usada por la IA para entender el contexto de trabajo de este proceso
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* Sección de Archivos */}
                      <div className="flex-1">
                        <h4 className="font-semibold mb-3 text-gray-800">Archivos del Proceso</h4>

                        {/* Área de Drop */}
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          className={cn(
                            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                            isDragging
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 hover:border-gray-400"
                          )}
                        >
                          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Arrastra archivos aquí o haz click para seleccionar
                          </p>
                          <p className="text-xs text-gray-500 mb-4">
                            Soporta ZIP, PDF, DOCX y más
                          </p>
                          <Input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                          />
                          <Label
                            htmlFor="file-upload"
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Seleccionar Archivos
                          </Label>
                        </div>

                        {/* Lista de Archivos Seleccionados */}
                        {selectedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Archivos seleccionados:</p>
                            <ScrollArea className="max-h-32">
                              <div className="space-y-2">
                                {selectedFiles.map((file, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
                                  >
                                    {isZipFile(file) ? (
                                      <FileArchive className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                    ) : (
                                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{file.name}</p>
                                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleRemoveFile(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>

                      {selectedTemplate && (
                        <>
                          <Separator className="my-4" />
                          <div className="flex-1">
                            <h4 className="font-semibold mb-3 text-gray-800">Características del Proceso</h4>
                            <div className="space-y-2">
                              {selectedTemplate.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  <span className="truncate">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex gap-3 pt-4 border-t mt-4">
                        <Button
                          onClick={handleCreateProcess}
                          disabled={!processName.trim() || !processContext.trim() || isCreating}
                          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
                        >
                          {isCreating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Creando...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Crear Proceso
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(null);
                            setProcessName('');
                            setProcessContext('');
                            setProcessDescription('');
                            setSelectedFiles([]);
                          }}
                          className="rounded-lg border-gray-300 hover:bg-gray-50"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center">
                      <div className="max-w-sm space-y-4">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <FolderOpen className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          Selecciona una Plantilla
                        </h3>
                        <p className="text-gray-500 text-sm mb-4">
                          Elige una plantilla del panel izquierdo para comenzar a configurar tu proceso
                        </p>
                        <Button
                          onClick={() => setProcessName('Proceso Personalizado')}
                          variant="outline"
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Proceso Personalizado
                        </Button>
                      </div>
                    </div>
                  )
                  }
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
