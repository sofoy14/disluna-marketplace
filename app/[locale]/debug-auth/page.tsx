// app/[locale]/debug-auth/page.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function DebugAuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/debug/auth');
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const testSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Debug de Autenticación
          </h1>
          <p className="mt-2 text-gray-600">
            Herramienta para debuggear el flujo de registro y verificación de email
          </p>
        </div>

        {/* Estado actual de autenticación */}
        <Card>
          <CardHeader>
            <CardTitle>Estado Actual de Autenticación</CardTitle>
            <CardDescription>
              Verifica el estado actual del usuario autenticado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={checkAuthStatus} className="mb-4">
              Verificar Estado
            </Button>
            
            {authStatus && (
              <Alert className={authStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center">
                  {getStatusIcon(authStatus.success)}
                  <AlertDescription className="ml-2">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(authStatus.data, null, 2)}
                    </pre>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test de registro */}
        <Card>
          <CardHeader>
            <CardTitle>Test de Registro</CardTitle>
            <CardDescription>
              Prueba el proceso de registro con un email de prueba
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={testSignup} className="space-y-4">
              <div>
                <Label htmlFor="email">Email de Prueba</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@ejemplo.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando Registro...
                  </>
                ) : (
                  'Probar Registro'
                )}
              </Button>
            </form>

            {result && (
              <Alert className={`mt-4 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center">
                  {getStatusIcon(result.success)}
                  <AlertDescription className="ml-2">
                    <div className="text-sm">
                      <strong>Resultado:</strong> {result.success ? 'Éxito' : 'Error'}
                    </div>
                    {result.error && (
                      <div className="text-sm text-red-600 mt-1">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                    <pre className="text-xs mt-2 overflow-auto bg-gray-100 p-2 rounded">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Información de configuración */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Configuración</CardTitle>
            <CardDescription>
              Variables de entorno y configuración actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>NEXT_PUBLIC_SITE_URL:</strong> {process.env.NEXT_PUBLIC_SITE_URL || 'No definida'}
              </div>
              <div>
                <strong>URL de Redirección:</strong> {`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/auth/verify-email`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





