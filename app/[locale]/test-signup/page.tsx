// app/[locale]/test-signup/page.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function TestSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult('');

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/verify-email`
        }
      });

      if (error) {
        setResult(`Error: ${error.message}`);
      } else {
        setResult(`Éxito! Usuario creado: ${data.user?.email}. Email confirmado: ${data.user?.email_confirmed_at ? 'Sí' : 'No'}`);
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push('/auth/verify-email');
        }, 2000);
      }
    } catch (error) {
      setResult(`Error de red: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Test de Registro Directo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
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
                {isLoading ? 'Registrando...' : 'Registrar'}
              </Button>
            </form>

            {result && (
              <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
                <strong>Resultado:</strong><br />
                {result}
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500">
              <strong>URL de redirección:</strong><br />
              {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/auth/verify-email` : 'Cargando...'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





