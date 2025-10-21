// components/billing/AddCardForm.tsx
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
import { Loader2, CreditCard } from 'lucide-react';
import { AcceptanceModal } from './AcceptanceModal';

const cardSchema = z.object({
  number: z.string()
    .min(13, 'Número de tarjeta muy corto')
    .max(19, 'Número de tarjeta muy largo')
    .regex(/^\d+$/, 'Solo se permiten números'),
  cvc: z.string()
    .min(3, 'CVC debe tener al menos 3 dígitos')
    .max(4, 'CVC debe tener máximo 4 dígitos')
    .regex(/^\d+$/, 'Solo se permiten números'),
  exp_month: z.string()
    .min(1, 'Mes requerido')
    .max(2, 'Mes inválido')
    .regex(/^(0?[1-9]|1[0-2])$/, 'Mes inválido'),
  exp_year: z.string()
    .min(2, 'Año requerido')
    .max(2, 'Año inválido')
    .regex(/^\d{2}$/, 'Año inválido'),
  card_holder: z.string()
    .min(2, 'Nombre del titular requerido')
    .max(100, 'Nombre muy largo')
});

type CardFormData = z.infer<typeof cardSchema>;

interface AddCardFormProps {
  onSuccess: (paymentSource: any) => void;
  onCancel: () => void;
  workspaceId?: string;
}

export function AddCardForm({ onSuccess, onCancel, workspaceId }: AddCardFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [acceptanceToken, setAcceptanceToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<CardFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema)
  });

  const onSubmit = async (data: CardFormData) => {
    setFormData(data);
    setShowAcceptanceModal(true);
  };

  const handleAcceptance = async (token: string) => {
    if (!formData) return;

    setLoading(true);
    setError(null);
    setShowAcceptanceModal(false);

    try {
      // 1. Tokenize card in client
      const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_WOMPI_BASE_URL || 'https://sandbox.wompi.co'}/v1/tokens/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: formData.number.replace(/\s/g, ''),
          cvc: formData.cvc,
          exp_month: formData.exp_month,
          exp_year: formData.exp_year,
          card_holder: formData.card_holder.toUpperCase()
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || 'Error al tokenizar la tarjeta');
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
          type: 'CARD',
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
      onSuccess(result.payment_source);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Agregar Tarjeta de Crédito/Débito
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
              <Label htmlFor="number">Número de Tarjeta</Label>
              <Input
                id="number"
                placeholder="1234 5678 9012 3456"
                {...register('number')}
                className={errors.number ? 'border-red-500' : ''}
              />
              {errors.number && (
                <p className="text-sm text-red-500">{errors.number.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exp_month">Mes</Label>
                <Input
                  id="exp_month"
                  placeholder="12"
                  {...register('exp_month')}
                  className={errors.exp_month ? 'border-red-500' : ''}
                />
                {errors.exp_month && (
                  <p className="text-sm text-red-500">{errors.exp_month.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="exp_year">Año</Label>
                <Input
                  id="exp_year"
                  placeholder="28"
                  {...register('exp_year')}
                  className={errors.exp_year ? 'border-red-500' : ''}
                />
                {errors.exp_year && (
                  <p className="text-sm text-red-500">{errors.exp_year.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  {...register('cvc')}
                  className={errors.cvc ? 'border-red-500' : ''}
                />
                {errors.cvc && (
                  <p className="text-sm text-red-500">{errors.cvc.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="card_holder">Titular</Label>
                <Input
                  id="card_holder"
                  placeholder="JUAN PÉREZ"
                  {...register('card_holder')}
                  className={errors.card_holder ? 'border-red-500' : ''}
                />
                {errors.card_holder && (
                  <p className="text-sm text-red-500">{errors.card_holder.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar Tarjeta
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

