'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Plus, Trash2, Globe, Package } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { Brand, Product, SocialAccount } from '@synap6ia/shared';

export default function BrandDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: brand, isLoading, mutate } = useApi<Brand>(
    `/api/brands/${params.id}`,
  );
  const { data: products } = useApi<Product[]>(
    `/api/brands/${params.id}/products`,
  );
  const { data: socialAccounts } = useApi<SocialAccount[]>(
    `/api/brands/${params.id}/social-accounts`,
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await apiClient(`/api/brands/${params.id}`, {
        method: 'PUT',
        body: {
          name: formData.get('name'),
          brandVoice: formData.get('brandVoice'),
          targetAudience: formData.get('targetAudience'),
          contentGuidelines: formData.get('contentGuidelines'),
        },
      });
      toast({ title: 'Marque mise à jour', variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette marque ?')) return;
    try {
      await apiClient(`/api/brands/${params.id}`, { method: 'DELETE' });
      toast({ title: 'Marque supprimée', variant: 'success' });
      router.push('/brands');
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/brands')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon('back')}
        </Button>
        <p className="text-muted-foreground">Marque introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/brands')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{brand.name}</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          {tCommon('delete')}
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="social">Comptes sociaux</TabsTrigger>
          <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input id="name" name="name" defaultValue={brand.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandVoice">Voix de marque</Label>
                  <Textarea
                    id="brandVoice"
                    name="brandVoice"
                    rows={3}
                    defaultValue={typeof brand.brandVoice === 'string' ? brand.brandVoice : ''}
                    placeholder="Décrivez le ton et la voix de la marque..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Audience cible</Label>
                  <Textarea
                    id="targetAudience"
                    name="targetAudience"
                    rows={3}
                    defaultValue={typeof brand.targetAudience === 'string' ? brand.targetAudience : ''}
                    placeholder="Décrivez l'audience cible..."
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : tCommon('save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          {(products ?? []).length === 0 ? (
            <EmptyState
              icon={Package}
              title="Aucun produit"
              description="Ajoutez des produits à cette marque."
              action={<Button><Plus className="mr-2 h-4 w-4" />Ajouter un produit</Button>}
            />
          ) : (
            <div className="space-y-3">
              {(products ?? []).map((product) => (
                <Card key={product.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="social">
          {(socialAccounts ?? []).length === 0 ? (
            <EmptyState
              icon={Globe}
              title="Aucun compte social"
              description="Connectez vos comptes sociaux."
              action={<Button><Plus className="mr-2 h-4 w-4" />Connecter un compte</Button>}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(socialAccounts ?? []).map((account) => (
                <Card key={account.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium capitalize">{account.platform}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.platformUsername ?? 'Non connecté'}
                      </p>
                    </div>
                    <Badge variant={account.status === 'active' ? 'success' : 'secondary'}>
                      {account.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="guidelines">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contentGuidelines">Guidelines de contenu</Label>
                  <Textarea
                    id="contentGuidelines"
                    name="contentGuidelines"
                    rows={6}
                    defaultValue={typeof brand.contentGuidelines === 'string' ? brand.contentGuidelines : ''}
                    placeholder="Règles de création de contenu pour cette marque..."
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : tCommon('save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
