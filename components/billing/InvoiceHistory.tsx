// components/billing/InvoiceHistory.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Loader2, 
  AlertCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '@/lib/wompi/utils';

interface Invoice {
  id: string;
  amount_in_cents: number;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  period_start: string;
  period_end: string;
  paid_at?: string;
  created_at: string;
  subscriptions?: {
    plans?: {
      name: string;
    };
  };
}

interface InvoiceHistoryProps {
  workspaceId: string;
}

export function InvoiceHistory({ workspaceId }: InvoiceHistoryProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, [workspaceId]);

  const fetchInvoices = async (loadMore = false) => {
    try {
      const currentOffset = loadMore ? offset : 0;
      const response = await fetch(
        `/api/billing/invoices?workspace_id=${workspaceId}&limit=10&offset=${currentOffset}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error fetching invoices');
      }

      if (loadMore) {
        setInvoices(prev => [...prev, ...result.data]);
      } else {
        setInvoices(result.data);
      }
      
      setHasMore(result.pagination.has_more);
      setOffset(currentOffset + result.data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Pagada</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Fallida</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    // TODO: Implement invoice download functionality
    console.log('Download invoice:', invoiceId);
  };

  if (isLoading && invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span>Cargando facturas...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => fetchInvoices()} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Historial de Facturas
        </CardTitle>
        <CardDescription>
          Revisa el historial de tus facturas y pagos
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay facturas
            </h3>
            <p className="text-gray-600">
              Las facturas aparecerán aquí una vez que tengas una suscripción activa
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {invoice.subscriptions?.plans?.name || 'Factura'}
                      </span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Período: {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                        </span>
                      </div>
                      
                      {invoice.paid_at && (
                        <div className="text-green-600">
                          Pagada el {formatDate(invoice.paid_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {formatCurrency(invoice.amount_in_cents)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(invoice.created_at)}
                    </div>
                  </div>
                  
                  {invoice.status === 'paid' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice.id)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchInvoices(true)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Cargando...
                    </>
                  ) : (
                    'Cargar más'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}





