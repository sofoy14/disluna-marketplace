// app/[locale]/auth/verify-email/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Mail, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already verified
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await fetch('/api/auth/verification-status');
      const data = await response.json();
      
      if (!response.ok) {
        // No user session, redirect to login
        router.push('/login');
        return;
      }
      
      if (data.data.is_verified) {
        // User is already verified, redirect to onboarding
        router.push('/onboarding');
        return;
      }
      
      // User exists but email not confirmed, show verification page
      setEmail(data.data.email || '');
    } catch (error) {
      console.error('Error checking verification status:', error);
      router.push('/login');
    }
  };

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Email de verificación enviado. Revisa tu bandeja de entrada.'
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Error enviando email de verificación'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error de conexión. Intenta nuevamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setIsVerifying(true);
    
    try {
      const response = await fetch('/api/auth/verification-status');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('No user session');
      }

      if (data.data.is_verified) {
        // Update profile to mark email as verified
        const supabase = createClient();
        await supabase
          .from('profiles')
          .update({
            email_verified: true,
            onboarding_step: 'profile_setup'
          })
          .eq('user_id', data.data.user_id);

        setMessage({
          type: 'success',
          text: 'Email verificado exitosamente. Redirigiendo...'
        });

        // Redirect to onboarding after a short delay
        setTimeout(() => {
          router.push('/onboarding');
        }, 2000);
      } else {
        setMessage({
          type: 'info',
          text: 'Email aún no verificado. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error verificando email. Intenta nuevamente.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getMessageIcon = () => {
    switch (message?.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'info':
        return <Mail className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getMessageColor = () => {
    switch (message?.type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Verifica tu Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Necesitamos verificar tu dirección de email para continuar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Confirmación de Email</CardTitle>
            <CardDescription>
              Ingresa tu email para enviar un enlace de verificación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSendVerification} className="space-y-4">
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@ejemplo.com"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Email de Verificación
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  O
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleVerifyEmail}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Ya verifiqué mi email
                </>
              )}
            </Button>

            {message && (
              <Alert className={getMessageColor()}>
                <div className="flex items-center">
                  {getMessageIcon()}
                  <AlertDescription className="ml-2">
                    {message.text}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600">
                ¿No recibiste el email? Revisa tu carpeta de spam o{' '}
                <button
                  onClick={() => setMessage(null)}
                  className="text-blue-600 hover:text-blue-500 underline"
                >
                  intenta nuevamente
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/login')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Volver al inicio de sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
