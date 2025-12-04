"use client"

// components/providers/device-session-provider.tsx
// Provider component for device session management

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useDeviceSession } from '@/lib/hooks/use-device-session';
import { DeviceLimitModal } from '@/components/modals/device-limit-modal';
import type { DeviceSession, DeviceLimit } from '@/lib/hooks/use-device-session';

interface DeviceSessionContextType {
  sessions: DeviceSession[];
  deviceLimit: DeviceLimit | null;
  isLoading: boolean;
  error: string | null;
  createSession: (forceCreate?: boolean) => Promise<boolean>;
  removeSession: (sessionId: string) => Promise<boolean>;
  logoutAll: () => Promise<boolean>;
}

const DeviceSessionContext = createContext<DeviceSessionContextType | null>(null);

export function useDeviceSessionContext() {
  const context = useContext(DeviceSessionContext);
  if (!context) {
    throw new Error('useDeviceSessionContext must be used within a DeviceSessionProvider');
  }
  return context;
}

interface DeviceSessionProviderProps {
  children: ReactNode;
}

export function DeviceSessionProvider({ children }: DeviceSessionProviderProps) {
  const {
    sessions,
    deviceLimit,
    isLoading,
    error,
    showDeviceLimitModal,
    createSession,
    removeSession,
    logoutAll,
    closeDeviceLimitModal,
    forceCreateSession,
    fetchSessions
  } = useDeviceSession();

  // Create session on mount (when user is authenticated)
  useEffect(() => {
    // Only create session if user is authenticated
    const initSession = async () => {
      // Check if we already have a session token
      const existingToken = localStorage.getItem('ali_session_token');
      const existingSessionId = localStorage.getItem('ali_current_session_id');
      
      // If we already have a session, don't create a new one
      if (existingToken && existingSessionId) {
        // Just fetch to update the list
        await fetchSessions();
        return;
      }
      
      // Create new session (will show modal if limit reached)
      await createSession(false);
    };

    initSession();
  }, []);

  const contextValue: DeviceSessionContextType = {
    sessions,
    deviceLimit,
    isLoading,
    error,
    createSession,
    removeSession,
    logoutAll
  };

  return (
    <DeviceSessionContext.Provider value={contextValue}>
      {children}
      
      {/* Device Limit Modal */}
      <DeviceLimitModal
        isOpen={showDeviceLimitModal}
        onClose={closeDeviceLimitModal}
        sessions={sessions}
        onRemoveSession={removeSession}
        onForceCreate={forceCreateSession}
      />
    </DeviceSessionContext.Provider>
  );
}

