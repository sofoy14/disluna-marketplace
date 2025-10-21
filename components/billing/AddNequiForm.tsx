// components/billing/AddNequiForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone } from 'lucide-react';
import { AcceptanceModal } from './AcceptanceModal';

const nequiSchema = z.object({
  phone_number: z.string()
    .min(10, 'Número de teléfono muy corto')
    .max(10, 'Número de teléfono muy largo')
    .regex(/^3\d{9}$/, 'Debe ser un número de Nequi válido (empezar con 3)')
});

type NequiFormData = z.infer<typeof nequiSchema>;

interface AddNequiFormProps {
  onSuccess: (paymentSource: any) => void;
  onCancel: () => void;
  workspaceId?: string;
}

export function AddNequiForm({ onSuccess, onCancel, workspaceId }: AddNequiFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [acceptanceToken, setAcceptanceToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<NequiFormData | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<NequiFormData>({
    resolver: zodResolver(nequiSchema)
  });

  const onSubmit = async (data: NequiFormData) => {
    setFormData(data);
    setShowAcceptanceModal(true);
  };

  const handleAcceptance = async (token: string) => {
    if (!formData) return;

    setLoading(true);
    setError(null);
    setShowAcceptanceModal(false);

    try {
      // 1. Tokenize Nequi in client
      const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_BASE_URL || 'https://sandbox.wompi.co'}/v1/tokens/nequi`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: formData.phone_number
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || 'Error al tokenizar Nequi');
      }

      const tokenData = await tokenResponse.json();
      const wompiToken = tokenData.data.id;

      // 2. Send to backend to create payment source
      const response = await fetch('/api/billing/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          token: wompiToken,
          type: 'NEQUI',
          customer_email: await getCurrentUserEmail(),
          acceptance_token: token,
          accept_personal_auth: token,
          workspace_id: workspaceId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear método de pago');
      }

      const result = await response.json();
      
      // Check if Nequi payment source is PENDING (needs user approval)
      if (result.payment_source.status === 'PENDING') {
        setPendingApproval(true);
        // Start polling for approval
        pollForApproval(result.payment_source.id);
      } else {
        onSuccess(result.payment_source);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const pollForApproval = async (paymentSourceId: string) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/billing/payment-sources/${paymentSourceId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.payment_source.status === 'AVAILABLE') {
            onSuccess(data.payment_source);
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setError('Tiempo de espera agotado. Por favor, intenta nuevamente.');
          setPendingApproval(false);
        }
      } catch (err) {
        setError('Error al verificar el estado del pago');
        setPendingApproval(false);
      }
    };

    setTimeout(poll, 10000); // Start polling after 10 seconds
  };

  const handleCancelAcceptance = () => {
    setShowAcceptanceModal(false);
    setFormData(null);
  };

  // Helper functions (you'll need to implement these based on your auth system)
  const getAuthToken = async (): Promise<string> => {
    // Implement based on your auth system (Supabase, NextAuth, etc.)
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const getCurrentUserEmail = async (): Promise<string> => {
    // Implement based on your auth system
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email || '';
  };

  if (pendingApproval) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Aprobación Pendiente</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Revisa tu aplicación Nequi y aprueba el pago para continuar.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
            <p className="text-xs text-muted-foreground">
              Esperando aprobación...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Agregar Nequi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone_number">Número de Nequi</Label>
              <Input
                id="phone_number"
                placeholder="3001234567"
                {...register('phone_number')}
                className={errors.phone_number ? 'border-red-500' : ''}
              />
              {errors.phone_number && (
                <p className="text-sm text-red-500">{errors.phone_number.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Ingresa el número de teléfono asociado a tu cuenta Nequi
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Importante:</strong> Después de agregar tu número, deberás aprobar el pago 
                en tu aplicación Nequi para completar el proceso.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar Nequi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AcceptanceModal
        open={showAcceptanceModal}
        onAccept={handleAcceptance}
        onCancel={handleCancelAcceptance}
      />
    </>
  );
}

