// db/user-sessions.ts
// Database operations for user session management (device limit enforcement)

import { createClient } from '@supabase/supabase-js';

// Create admin client for session management
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_fingerprint?: string;
  device_name?: string;
  device_type?: string;
  browser?: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
  expires_at?: string;
}

export interface CreateSessionParams {
  userId: string;
  sessionToken: string;
  deviceFingerprint?: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  ipAddress?: string;
  userAgent?: string;
  forceCreate?: boolean;
}

export interface CreateSessionResult {
  sessionId: string | null;
  created: boolean;
  removedSessionId: string | null;
  errorMessage: string | null;
}

export interface DeviceLimitResult {
  canCreateSession: boolean;
  activeSessionsCount: number;
  oldestSessionId: string | null;
}

const MAX_DEVICES = 2;

/**
 * Check if user can create a new session (device limit check)
 */
export async function checkDeviceLimit(userId: string): Promise<DeviceLimitResult> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .rpc('check_device_limit', { p_user_id: userId });
  
  if (error) {
    console.error('Error checking device limit:', error);
    // If function doesn't exist, fallback to direct query
    return await checkDeviceLimitDirect(userId);
  }
  
  return {
    canCreateSession: data?.[0]?.can_create_session ?? true,
    activeSessionsCount: data?.[0]?.active_sessions_count ?? 0,
    oldestSessionId: data?.[0]?.oldest_session_id ?? null
  };
}

/**
 * Direct database query for device limit (fallback)
 */
async function checkDeviceLimitDirect(userId: string): Promise<DeviceLimitResult> {
  const supabase = getAdminClient();
  
  const { data: sessions, error } = await supabase
    .from('user_sessions')
    .select('id, last_activity_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_activity_at', { ascending: true });
  
  if (error) {
    console.error('Error checking device limit directly:', error);
    return {
      canCreateSession: true,
      activeSessionsCount: 0,
      oldestSessionId: null
    };
  }
  
  const count = sessions?.length ?? 0;
  
  return {
    canCreateSession: count < MAX_DEVICES,
    activeSessionsCount: count,
    oldestSessionId: count > 0 ? sessions![0].id : null
  };
}

/**
 * Create a new user session
 */
export async function createUserSession(params: CreateSessionParams): Promise<CreateSessionResult> {
  const supabase = getAdminClient();
  
  // First, try using the stored function
  const { data, error } = await supabase.rpc('create_user_session', {
    p_user_id: params.userId,
    p_session_token: params.sessionToken,
    p_device_fingerprint: params.deviceFingerprint || null,
    p_device_name: params.deviceName || null,
    p_device_type: params.deviceType || null,
    p_browser: params.browser || null,
    p_ip_address: params.ipAddress || null,
    p_user_agent: params.userAgent || null,
    p_force_create: params.forceCreate || false
  });
  
  if (error) {
    console.error('Error creating session via RPC:', error);
    // Fallback to direct insertion
    return await createSessionDirect(params);
  }
  
  const result = data?.[0];
  return {
    sessionId: result?.session_id || null,
    created: result?.created || false,
    removedSessionId: result?.removed_session_id || null,
    errorMessage: result?.error_message || null
  };
}

/**
 * Direct session creation (fallback)
 */
async function createSessionDirect(params: CreateSessionParams): Promise<CreateSessionResult> {
  const supabase = getAdminClient();
  
  // Check device limit first
  const limitCheck = await checkDeviceLimitDirect(params.userId);
  
  if (!limitCheck.canCreateSession && !params.forceCreate) {
    return {
      sessionId: null,
      created: false,
      removedSessionId: null,
      errorMessage: 'Has alcanzado el límite de 2 dispositivos. Por favor cierra sesión en otro dispositivo.'
    };
  }
  
  let removedSessionId: string | null = null;
  
  // If force create and at limit, remove oldest session
  if (limitCheck.activeSessionsCount >= MAX_DEVICES && params.forceCreate && limitCheck.oldestSessionId) {
    const { error: deactivateError } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', limitCheck.oldestSessionId);
    
    if (!deactivateError) {
      removedSessionId = limitCheck.oldestSessionId;
    }
  }
  
  // Create new session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
  
  const { data: newSession, error: insertError } = await supabase
    .from('user_sessions')
    .insert({
      user_id: params.userId,
      session_token: params.sessionToken,
      device_fingerprint: params.deviceFingerprint,
      device_name: params.deviceName,
      device_type: params.deviceType,
      browser: params.browser,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      expires_at: expiresAt.toISOString()
    })
    .select('id')
    .single();
  
  if (insertError) {
    console.error('Error inserting session:', insertError);
    return {
      sessionId: null,
      created: false,
      removedSessionId: null,
      errorMessage: 'Error al crear la sesión'
    };
  }
  
  return {
    sessionId: newSession?.id || null,
    created: true,
    removedSessionId,
    errorMessage: null
  };
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_activity_at', { ascending: false });
  
  if (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(sessionToken: string): Promise<boolean> {
  const supabase = getAdminClient();
  
  const { error } = await supabase
    .from('user_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('session_token', sessionToken)
    .eq('is_active', true);
  
  return !error;
}

/**
 * Deactivate a specific session
 */
export async function deactivateSession(sessionToken: string): Promise<boolean> {
  const supabase = getAdminClient();
  
  const { error } = await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('session_token', sessionToken);
  
  return !error;
}

/**
 * Deactivate a session by ID
 */
export async function deactivateSessionById(sessionId: string, userId: string): Promise<boolean> {
  const supabase = getAdminClient();
  
  const { error } = await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('id', sessionId)
    .eq('user_id', userId);
  
  return !error;
}

/**
 * Deactivate all sessions for a user (logout everywhere)
 */
export async function deactivateAllSessions(userId: string): Promise<boolean> {
  const supabase = getAdminClient();
  
  const { error } = await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('user_id', userId);
  
  return !error;
}

/**
 * Validate if a session is still active
 */
export async function validateSession(sessionToken: string): Promise<boolean> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('user_sessions')
    .select('id, expires_at')
    .eq('session_token', sessionToken)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    await deactivateSession(sessionToken);
    return false;
  }
  
  return true;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const supabase = getAdminClient();
  
  // Mark expired sessions as inactive
  const { error: updateError } = await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('is_active', true)
    .or(`expires_at.lt.${new Date().toISOString()},last_activity_at.lt.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`);
  
  if (updateError) {
    console.error('Error deactivating expired sessions:', updateError);
  }
  
  // Delete old sessions (older than 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { error: deleteError, count } = await supabase
    .from('user_sessions')
    .delete()
    .lt('created_at', thirtyDaysAgo.toISOString())
    .select('id', { count: 'exact' });
  
  if (deleteError) {
    console.error('Error deleting old sessions:', deleteError);
    return 0;
  }
  
  return count || 0;
}

/**
 * Parse device info from user agent string
 */
export function parseDeviceInfo(userAgent: string): { 
  deviceType: string; 
  browser: string; 
  deviceName: string 
} {
  const ua = userAgent.toLowerCase();
  
  // Detect device type
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  }
  
  // Detect browser
  let browser = 'Unknown';
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';
  
  // Detect device name
  let deviceName = 'Unknown Device';
  if (/iphone/i.test(ua)) deviceName = 'iPhone';
  else if (/ipad/i.test(ua)) deviceName = 'iPad';
  else if (/android/i.test(ua)) {
    const match = ua.match(/android[^;]*;[^;]*([^)]+)/i);
    deviceName = match ? match[1].trim() : 'Android Device';
  } else if (/macintosh|mac os x/i.test(ua)) deviceName = 'Mac';
  else if (/windows/i.test(ua)) deviceName = 'Windows PC';
  else if (/linux/i.test(ua)) deviceName = 'Linux PC';
  
  return { deviceType, browser, deviceName };
}

