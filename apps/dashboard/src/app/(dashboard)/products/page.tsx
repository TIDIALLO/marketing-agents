'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Package, Sparkles, Plus, ExternalLink } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  isActive: boolean;
  ctaUrl: string | null;
  brand: { id: string; name: string };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await apiClient<Product[]>('/api/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiClient('/api/products', {
        method: 'POST',
        body: {
          brandId: form.get('brandId') as string,
          name: form.get('name') as string,
          description: form.get('description') as string,
        },
      });
      setDialogOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Failed to create product:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async (productId: string) => {
    setGenerating(productId);
    try {
      await apiClient(`/api/products/${productId}/generate-content`, { method: 'POST' });
      fetchProducts();
    } catch (err) {
      console.error('Failed to generate content:', err);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground">Gérez vos produits et générez du contenu marketing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouveau Produit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un produit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" required placeholder="SOC Autopilot Hub" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Plateforme de cybersécurité..." />
              </div>
              <input type="hidden" name="brandId" value={products[0]?.brand?.id ?? ''} />
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? 'Création...' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="Aucun produit" description="Créez votre premier produit pour commencer" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                {product.tagline && (
                  <p className="text-sm text-muted-foreground">{product.tagline}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm">{product.description ?? 'Aucune description'}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerate(product.id)}
                    disabled={generating === product.id}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {generating === product.id ? 'Génération...' : 'Générer contenu'}
                  </Button>
                  {product.ctaUrl && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={product.ctaUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
