// app/[locale]/billing/success/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  Home
} from 'lucide-react';
import { wompiClient } from '@/lib/wompi/client';
import { formatCurrency } from '@/lib/wompi/utils';
import Link from 'next/link';

export default function BillingSuccessPage() {
  const [transactionStatus, setTransactionStatus] = useState<'loading' | 'success' | 'error' | 'unknown'>('loading');
  const [transactionData, setTransactionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkTransactionStatus();
  }, []);

  const checkTransactionStatus = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const transactionId = urlParams.get('id');

      if (!transactionId) {
        setError('No se encontró ID de transacción');
        setTransactionStatus('error');
        return;
      }

      // Get transaction details from Wompi
      const transaction = await wompiClient.getTransaction(transactionId);
      setTransactionData(transaction);

      // Determine status
      if (transaction.status === 'APPROVED') {
        setTransactionStatus('success');
      } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(transaction.status)) {
        setTransactionStatus('error');
      } else {
        setTransactionStatus('unknown');
      }

    } catch (err) {
      console.error('Error checking transaction status:', err);
      setError(err instanceof Error ? err.message : 'Error verificando transacción');
      setTransactionStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (transactionStatus) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'loading':
        return <Loader2 className="w-16 h-16 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="w-16 h-16 text-yellow-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (transactionStatus) {
      case 'success':
        return '¡Pago Exitoso!';
      case 'error':
        return 'Pago No Procesado';
      case 'loading':
        return 'Verificando Pago...';
      default:
        return 'Estado Desconocido';
    }
  };

  const getStatusDescription = () => {
    switch (transactionStatus) {
      case 'success':
        return 'Tu suscripción ha sido activada exitosamente. Ya puedes disfrutar de todos los beneficios de tu plan.';
      case 'error':
        return 'No pudimos procesar tu pago. Por favor, verifica tu método de pago e intenta nuevamente.';
      case 'loading':
        return 'Estamos verificando el estado de tu transacción...';
      default:
        return 'El estado de tu transacción no pudo ser determinado. Por favor, contacta soporte.';
    }
  };

  const getStatusBadge = () => {
    if (!transactionData) return null;

    switch (transactionStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      default:
        return <Badge variant="secondary">{transactionData.status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-2xl font-bold">
              {getStatusTitle()}
            </CardTitle>
            <CardDescription className="text-lg">
              {getStatusDescription()}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {transactionData && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">ID de Transacción:</span>
                  <span className="font-mono text-sm">{transactionData.id}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Estado:</span>
                  {getStatusBadge()}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Monto:</span>
                  <span className="font-semibold">
                    {formatCurrency(transactionData.amount_in_cents)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Fecha:</span>
                  <span>
                    {new Date(transactionData.created_at).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                {transactionData.status_message && (
                  <div className="pt-3 border-t">
                    <span className="font-medium">Mensaje:</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {transactionData.status_message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              {transactionStatus === 'success' && (
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <Link href="/billing">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Ir a Mi Suscripción
                  </Link>
                </Button>
              )}
              
              {transactionStatus === 'error' && (
                <Button asChild variant="outline">
                  <Link href="/billing">
                    Intentar Nuevamente
                  </Link>
                </Button>
              )}
              
              <Button asChild variant="outline">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Ir al Inicio
                </Link>
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>
                Si tienes alguna pregunta sobre tu transacción, 
                <Link href="/support" className="text-blue-600 hover:underline ml-1">
                  contacta nuestro equipo de soporte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}