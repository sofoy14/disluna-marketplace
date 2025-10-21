// components/billing/AcceptanceModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface AcceptanceModalProps {
  open: boolean;
  onAccept: (token: string) => void;
  onCancel: () => void;
}

interface AcceptanceData {
  acceptance_token: string;
  permalink: string;
  type: string;
}

export function AcceptanceModal({ open, onAccept, onCancel }: AcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptanceData, setAcceptanceData] = useState<AcceptanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !acceptanceData) {
      fetchAcceptanceToken();
    }
  }, [open]);

  const fetchAcceptanceToken = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/billing/acceptance-token');
      
      if (!response.ok) {
        throw new Error('Failed to get acceptance token');
      }
      
      const data = await response.json();
      setAcceptanceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (acceptanceData?.acceptance_token) {
      onAccept(acceptanceData.acceptance_token);
    }
  };

  const handleCancel = () => {
    setAccepted(false);
    setError(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aceptación de Términos y Política de Privacidad</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Cargando términos...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {acceptanceData && !loading && (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Al continuar con el proceso de pago, aceptas nuestros términos y condiciones, 
                  así como el tratamiento de tus datos personales según nuestra política de privacidad.
                </p>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="accept-terms" 
                    checked={accepted}
                    onCheckedChange={(checked) => setAccepted(checked as boolean)}
                  />
                  <label 
                    htmlFor="accept-terms" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Acepto los{' '}
                    <a 
                      href={acceptanceData.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      términos y condiciones
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {' '}y el tratamiento de datos personales
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAccept}
                  disabled={!accepted}
                >
                  Continuar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

