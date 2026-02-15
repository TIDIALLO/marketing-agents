'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Building2, Plus } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Brand } from '@mktengine/shared';

export default function BrandsPage() {
  const t = useTranslations('brands');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: brands, isLoading, mutate } = useApi<Brand[]>('/api/brands');

  const handleCreate = async () => {
    if (!newBrandName.trim()) return;
    setIsSubmitting(true);
    try {
      await apiClient('/api/brands', {
        method: 'POST',
        body: { name: newBrandName.trim() },
      });
      toast({ title: 'Marque créée', variant: 'success' });
      setShowCreate(false);
      setNewBrandName('');
      await mutate();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {tCommon('create')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (brands ?? []).length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune marque"
          description="Créez votre première marque pour commencer."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une marque
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(brands ?? []).map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.id}`}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{brand.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Créé le {new Date(brand.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)}>
          <DialogHeader>
            <DialogTitle>Nouvelle marque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Nom de la marque</Label>
              <Input
                id="brandName"
                placeholder="Ex: Mon Entreprise"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !newBrandName.trim()}>
              {isSubmitting ? 'Création...' : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
