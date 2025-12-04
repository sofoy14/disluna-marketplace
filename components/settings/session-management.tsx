"use client"

// components/settings/session-management.tsx
// Component for managing user's active sessions

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Tablet, Laptop, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DeviceSession {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  lastActivity: string;
  createdAt: string;
  isCurrent: boolean;
}

interface DeviceLimit {
  current: number;
  max: number;
  canAddMore: boolean;
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

export function SessionManagement() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [deviceLimit, setDeviceLimit] = useState<DeviceLimit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Error fetching sessions');
      
      const data = await response.json();
      
      // Mark current session
      const currentSessionId = localStorage.getItem('ali_current_session_id');
      setSessions(data.sessions.map((s: DeviceSession) => ({
        ...s,
        isCurrent: s.id === currentSessionId
      })));
      setDeviceLimit(data.deviceLimit);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Error al cargar las sesiones');
    } finally {
      setIsLoading(false);
    }
  };

  const removeSession = async (sessionId: string) => {
    try {
      setIsRemoving(sessionId);
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Error removing session');
      
      toast.success('Sesión cerrada exitosamente');
      await fetchSessions();
    } catch (error) {
      console.error('Error removing session:', error);
      toast.error('Error al cerrar la sesión');
    } finally {
      setIsRemoving(null);
    }
  };

  const logoutAll = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sessions?all=true', {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Error logging out all sessions');
      
      toast.success('Sesiones cerradas en todos los dispositivos');
      
      // Clear local storage
      localStorage.removeItem('ali_session_token');
      localStorage.removeItem('ali_current_session_id');
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out all:', error);
      toast.error('Error al cerrar todas las sesiones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Dispositivos conectados
            </CardTitle>
            <CardDescription>
              Gestiona tus sesiones activas en diferentes dispositivos
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={fetchSessions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device Limit Info */}
        {deviceLimit && (
          <div className={`p-3 rounded-lg border ${
            deviceLimit.current >= deviceLimit.max 
              ? 'bg-amber-500/10 border-amber-500/20' 
              : 'bg-green-500/10 border-green-500/20'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              {deviceLimit.current >= deviceLimit.max && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span>
                Dispositivos activos: <strong>{deviceLimit.current}</strong> de <strong>{deviceLimit.max}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Sessions List */}
        {isLoading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay sesiones activas
          </div>
        ) : (
          <div className="space-y-3">
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {session.deviceName}
                      </p>
                      {session.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Este dispositivo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.browser} • {formatLastActivity(session.lastActivity)}
                    </p>
                  </div>
                </div>
                
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSession(session.id)}
                    disabled={isRemoving === session.id}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    {isRemoving === session.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-1" />
                        Cerrar
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Logout All Button */}
        {sessions.length > 1 && (
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={logoutAll}
              disabled={isLoading}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión en todos los dispositivos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

