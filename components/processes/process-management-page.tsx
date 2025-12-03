"use client";

import React, { useState, useContext, useEffect } from 'react';
import { ALIContext } from '@/context/context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, FileText, MessageSquare, Plus, FolderOpen, ArrowLeft } from 'lucide-react';
import { Tables } from '@/supabase/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getCollectionFilesByCollectionId } from '@/db/collection-files';

interface ProcessManagementPageProps {
  collectionId: string;
  onBack?: () => void;
}

export function ProcessManagementPage({ collectionId, onBack }: ProcessManagementPageProps) {
  const { collections, chats, setSelectedChat } = useContext(ALIContext);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'chats' | 'files'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [processFiles, setProcessFiles] = useState<Tables<"files">[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [processChats, setProcessChats] = useState<Tables<"chats">[]>([]);

  // Get collection/process details
  const collection = collections.find(c => c.id === collectionId);

  // Filter chats that belong to this collection
  useEffect(() => {
    if (collection && chats) {
      // Filter chats by collection_id if it exists in the chat object
      const filteredChats = chats.filter(chat => 
        (chat as any).collection_id === collectionId
      );
      setProcessChats(filteredChats);
    }
  }, [collectionId, chats, collection]);

  // Load process files
  useEffect(() => {
    const loadFiles = async () => {
      if (!collectionId) return;
      setLoadingFiles(true);
      try {
        const data = await getCollectionFilesByCollectionId(collectionId);
        setProcessFiles(data.files || []);
      } catch (error) {
        console.error('Error loading process files:', error);
      } finally {
        setLoadingFiles(false);
      }
    };

    if (activeTab === 'files') {
      loadFiles();
    }
  }, [collectionId, activeTab]);

  const handleStartNewChat = () => {
    // Create a new chat associated with this collection
    // This would typically call your chat creation logic
    router.push(`/chat?collection=${collectionId}`);
  };

  const handleChatClick = (chat: Tables<"chats">) => {
    setSelectedChat(chat);
    router.push(`/chat/${chat.id}`);
  };

  const filteredChats = processChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = processFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg font-semibold">Proceso no encontrado</p>
          {onBack && (
            <Button onClick={onBack} variant="outline" className="mt-4">
              Volver
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{collection.name}</h1>
              <p className="text-sm text-muted-foreground">{collection.description}</p>
            </div>
            <Button onClick={handleStartNewChat}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chats' | 'files')} className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chats ({processChats.length})
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Archivos ({processFiles.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Buscar ${activeTab === 'chats' ? 'chats' : 'archivos'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="chats" className="mt-0">
              {loadingFiles ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                  Cargando chats...
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold mb-2">
                    {searchQuery ? 'No se encontraron chats' : 'No hay chats en este proceso'}
                  </p>
                  <p className="text-sm mb-4">
                    {searchQuery 
                      ? 'Intenta con otro término de búsqueda' 
                      : 'Crea un nuevo chat para empezar a trabajar'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={handleStartNewChat}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primer chat
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredChats.map((chat) => (
                    <Card
                      key={chat.id}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleChatClick(chat)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{chat.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(chat.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              {loadingFiles ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                  Cargando archivos...
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold mb-2">
                    {searchQuery ? 'No se encontraron archivos' : 'No hay archivos en este proceso'}
                  </p>
                  <p className="text-sm">
                    {searchQuery 
                      ? 'Intenta con otro término de búsqueda' 
                      : 'Los archivos del proceso aparecerán aquí'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{file.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {file.type} • {file.file_category}
                            </p>
                          </div>
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

