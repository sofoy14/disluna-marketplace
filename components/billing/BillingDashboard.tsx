// components/billing/BillingDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  TrendingUp, 
  Users, 
  Download,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface BillingMetrics {
  mrr_cents: number;
  mrr_formatted: string;
  total_subscriptions: number;
  active_subscriptions: number;
  churned_subscriptions: number;
  churn_rate: number;
  plan_metrics: Record<string, { count: number; revenue: number }>;
}

interface Invoice {
  id: string;
  amount_in_cents: number;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
  paid_at?: string;
  subscriptions: {
    plans: {
      name: string;
    };
    payment_sources: {
      type: string;
      brand?: string;
      last_four?: string;
    };
  };
  workspaces: {
    name: string;
  };
}

interface PaymentSource {
  id: string;
  type: string;
  status: string;
  brand?: string;
  last_four?: string;
  holder_name?: string;
  expires_at?: string;
  created_at: string;
}

export function BillingDashboard({ workspaceId }: { workspaceId?: string }) {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [workspaceId]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch metrics
      const metricsUrl = workspaceId 
        ? `/api/billing/metrics/mrr?workspace_id=${workspaceId}`
        : '/api/billing/metrics/mrr';
      
      const metricsRes = await fetch(metricsUrl, { headers });
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      // Fetch recent invoices
      const invoicesRes = await fetch('/api/billing/invoices', { headers });
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.invoices || []);
      }

      // Fetch payment sources
      const sourcesRes = await fetch('/api/billing/payment-sources', { headers });
      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        setPaymentSources(sourcesData.payment_sources || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // Implement based on your auth system
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const downloadInvoiceReport = async () => {
    try {
      const token = await getAuthToken();
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const url = workspaceId 
        ? `/api/billing/reports/invoices?month=${currentMonth}&workspace_id=${workspaceId}`
        : `/api/billing/reports/invoices?month=${currentMonth}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `invoices-${currentMonth}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading report:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'paid': 'default',
      'pending': 'secondary',
      'failed': 'destructive',
      'refunded': 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button onClick={fetchBillingData} className="mt-4">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.mrr_formatted || '$0'}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.active_subscriptions || 0} suscripciones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_subscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.churn_rate || 0}% tasa de churn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Métodos de Pago</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentSources.length}</div>
            <p className="text-xs text-muted-foreground">
              {paymentSources.filter(s => s.status === 'AVAILABLE').length} disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="invoices">Facturas</TabsTrigger>
            <TabsTrigger value="payment-sources">Métodos de Pago</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
          </TabsList>
          
          <Button onClick={downloadInvoiceReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay facturas disponibles
                  </p>
                ) : (
                  invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(invoice.status)}
                        <div>
                          <p className="font-medium">
                            {invoice.subscriptions?.plans?.name || 'Plan desconocido'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.workspaces?.name || 'Workspace desconocido'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0
                          }).format(invoice.amount_in_cents)}
                        </p>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(invoice.status)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentSources.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay métodos de pago configurados
                  </p>
                ) : (
                  paymentSources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {source.type === 'CARD' 
                              ? `${source.brand} •••• ${source.last_four}`
                              : `Nequi •••• ${source.last_four}`
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {source.holder_name || 'Titular no disponible'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(source.status)}
                        {source.expires_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expira: {new Date(source.expires_at).toLocaleDateString('es-CO')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas por Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.plan_metrics && Object.keys(metrics.plan_metrics).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay métricas disponibles
                  </p>
                ) : (
                  Object.entries(metrics?.plan_metrics || {}).map(([planName, data]) => (
                    <div key={planName} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{planName}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.count} suscripción{data.count !== 1 ? 'es' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0
                          }).format(data.revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">MRR</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


