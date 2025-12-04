// lib/hooks/use-device-session.ts
// Hook for managing device sessions and enforcing device limit

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

interface SessionState {
  sessions: DeviceSession[];
  deviceLimit: DeviceLimit | null;
  isLoading: boolean;
  error: string | null;
  showDeviceLimitModal: boolean;
  currentSessionToken: string | null;
}

// Generate a unique session token
function generateSessionToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${random}`;
}

// Get or create session token from localStorage
function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  
  let token = localStorage.getItem('ali_session_token');
  if (!token) {
    token = generateSessionToken();
    localStorage.setItem('ali_session_token', token);
  }
  return token;
}

// Generate a simple device fingerprint
function generateFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset()
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function useDeviceSession() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    sessions: [],
    deviceLimit: null,
    isLoading: true,
    error: null,
    showDeviceLimitModal: false,
    currentSessionToken: null
  });

  // Fetch current sessions
  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        if (response.status === 401) {
          return; // Not authenticated, ignore
        }
        throw new Error('Error fetching sessions');
      }
      
      const data = await response.json();
      const currentToken = getSessionToken();
      
      setState(prev => ({
        ...prev,
        sessions: data.sessions.map((s: DeviceSession) => ({
          ...s,
          isCurrent: s.id === localStorage.getItem('ali_current_session_id')
        })),
        deviceLimit: data.deviceLimit,
        isLoading: false,
        currentSessionToken: currentToken
      }));
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  }, []);

  // Create a new session (on login)
  const createSession = useCallback(async (forceCreate = false): Promise<boolean> => {
    try {
      const sessionToken = getSessionToken();
      const fingerprint = generateFingerprint();
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionToken,
          fingerprint,
          forceCreate
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'device_limit_reached') {
          setState(prev => ({
            ...prev,
            showDeviceLimitModal: true,
            error: data.message
          }));
          return false;
        }
        throw new Error(data.message || 'Error creating session');
      }
      
      if (data.sessionId) {
        localStorage.setItem('ali_current_session_id', data.sessionId);
      }
      
      await fetchSessions();
      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
      return false;
    }
  }, [fetchSessions]);

  // Remove a session (logout from specific device)
  const removeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Error removing session');
      }
      
      await fetchSessions();
      return true;
    } catch (error) {
      console.error('Error removing session:', error);
      return false;
    }
  }, [fetchSessions]);

  // Logout from all devices
  const logoutAll = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/sessions?all=true', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Error logging out all sessions');
      }
      
      localStorage.removeItem('ali_session_token');
      localStorage.removeItem('ali_current_session_id');
      
      return true;
    } catch (error) {
      console.error('Error logging out all:', error);
      return false;
    }
  }, []);

  // Update activity heartbeat
  const heartbeat = useCallback(async () => {
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;
      
      const response = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionToken })
      });
      
      const data = await response.json();
      
      if (!data.valid) {
        // Session is invalid, might have been logged out from another device
        console.warn('Session invalid, may have been logged out from another device');
        // Optionally redirect to login
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }, []);

  // Close device limit modal
  const closeDeviceLimitModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showDeviceLimitModal: false
    }));
  }, []);

  // Force create session (removing oldest)
  const forceCreateSession = useCallback(async (): Promise<boolean> => {
    const success = await createSession(true);
    if (success) {
      closeDeviceLimitModal();
    }
    return success;
  }, [createSession, closeDeviceLimitModal]);

  // Initialize on mount
  useEffect(() => {
    fetchSessions();
    
    // Set up heartbeat interval (every 5 minutes)
    const heartbeatInterval = setInterval(heartbeat, 5 * 60 * 1000);
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [fetchSessions, heartbeat]);

  return {
    ...state,
    fetchSessions,
    createSession,
    removeSession,
    logoutAll,
    heartbeat,
    closeDeviceLimitModal,
    forceCreateSession
  };
}

export type { DeviceSession, DeviceLimit };

