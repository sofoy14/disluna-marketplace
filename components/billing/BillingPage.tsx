// components/billing/BillingPage.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  FileText, 
  BarChart3, 
  Settings,
  Plus,
  AlertCircle
} from 'lucide-react';
import { BillingDashboard } from './BillingDashboard';
import { SubscriptionManager } from './SubscriptionManager';
import { PlanSelector } from './PlanSelector';
import { AddCardForm } from './AddCardForm';
import { AddNequiForm } from './AddNequiForm';
import { isBillingEnabled } from '@/lib/billing/feature-flags';

interface BillingPageProps {
  workspaceId: string;
}

export function BillingPage({ workspaceId }: BillingPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddNequi, setShowAddNequi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if billing is enabled
  if (!isBillingEnabled()) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              El sistema de facturación no está habilitado en este momento.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleAddPaymentMethod = (type: 'card' | 'nequi') => {
    if (type === 'card') {
      setShowAddCard(true);
    } else {
      setShowAddNequi(true);
    }
  };

  const handlePaymentMethodSuccess = () => {
    setShowAddCard(false);
    setShowAddNequi(false);
    setError(null);
    // Refresh data or show success message
  };

  const handlePaymentMethodCancel = () => {
    setShowAddCard(false);
    setShowAddNequi(false);
  };

  const handleSelectPlan = async (planId: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch('/api/billing/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: planId,
          workspace_id: workspaceId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      // Switch to overview tab to show the new subscription
      setActiveTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear suscripción');
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturación</h1>
          <p className="text-muted-foreground">
            Gestiona tu suscripción y métodos de pago
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Suscripción
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Métodos de Pago
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Planes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <BillingDashboard workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionManager 
            workspaceId={workspaceId}
            onUpdatePaymentMethod={() => setActiveTab('payment-methods')}
            onChangePlan={() => setActiveTab('plans')}
          />
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Métodos de Pago
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddPaymentMethod('card')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Tarjeta
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAddPaymentMethod('nequi')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Nequi
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Agrega métodos de pago para gestionar tu suscripción automáticamente.
              </p>
            </CardContent>
          </Card>

          {showAddCard && (
            <AddCardForm
              onSuccess={handlePaymentMethodSuccess}
              onCancel={handlePaymentMethodCancel}
              workspaceId={workspaceId}
            />
          )}

          {showAddNequi && (
            <AddNequiForm
              onSuccess={handlePaymentMethodSuccess}
              onCancel={handlePaymentMethodCancel}
              workspaceId={workspaceId}
            />
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <PlanSelector 
            onSelectPlan={handleSelectPlan}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}


