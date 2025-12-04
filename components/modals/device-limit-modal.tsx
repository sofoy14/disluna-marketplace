"use client"

// components/modals/device-limit-modal.tsx
// Modal shown when user reaches device limit (max 2 devices)

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Laptop,
  LogOut,
  AlertTriangle,
  Check
} from 'lucide-react';
import type { DeviceSession } from '@/lib/hooks/use-device-session';

interface DeviceLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: DeviceSession[];
  onRemoveSession: (sessionId: string) => Promise<boolean>;
  onForceCreate: () => Promise<boolean>;
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />;
    case 'tablet':
      return <Tablet className="h-5 w-5" />;
    case 'desktop':
      return <Monitor className="h-5 w-5" />;
    default:
      return <Laptop className="h-5 w-5" />;
  }
}

function formatLastActivity(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
  return `Hace ${days} día${days !== 1 ? 's' : ''}`;
}

export function DeviceLimitModal({
  isOpen,
  onClose,
  sessions,
  onRemoveSession,
  onForceCreate
}: DeviceLimitModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRemoveSession = async (sessionId: string) => {
    setIsLoading(true);
    setSelectedSession(sessionId);
    
    const result = await onRemoveSession(sessionId);
    
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    }
    
    setIsLoading(false);
    setSelectedSession(null);
  };

  const handleForceCreate = async () => {
    setIsLoading(true);
    
    const result = await onForceCreate();
    
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Límite de dispositivos alcanzado
          </DialogTitle>
          <DialogDescription>
            Tu cuenta está activa en 2 dispositivos, que es el máximo permitido.
            Para continuar, cierra sesión en uno de los dispositivos existentes.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-500/20 p-3 mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-center font-medium">¡Listo! Ya puedes continuar.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 my-4">
              <p className="text-sm text-muted-foreground font-medium">
                Sesiones activas:
              </p>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {session.deviceName}
                        {session.isCurrent && (
                          <span className="ml-2 text-xs text-green-500">(Este dispositivo)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.browser} • {formatLastActivity(session.lastActivity)}
                      </p>
                    </div>
                  </div>
                  
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSession(session.id)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      {isLoading && selectedSession === session.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                ¿Quieres continuar de todos modos? Se cerrará la sesión más antigua automáticamente.
              </p>
            </div>
          </>
        )}

        {!success && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleForceCreate}
              disabled={isLoading}
              className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-600 to-indigo-600"
            >
              {isLoading ? 'Procesando...' : 'Continuar y cerrar sesión anterior'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

