'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Globe, Eye, Sparkles } from 'lucide-react';

interface LandingPage {
  id: string;
  slug: string;
  title: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  isPublished: boolean;
  product: { id: string; name: string } | null;
  brand: { id: string; name: string };
}

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      const res = await apiClient<LandingPage[]>('/api/landing-pages');
      setPages(res.data);
    } catch (err) {
      console.error('Failed to fetch landing pages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const togglePublish = async (page: LandingPage) => {
    setToggling(page.id);
    try {
      const action = page.isPublished ? 'unpublish' : 'publish';
      await apiClient(`/api/landing-pages/${page.id}/${action}`, { method: 'POST' });
      fetchPages();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    } finally {
      setToggling(null);
    }
  };

  const handleGenerate = async (pageId: string) => {
    try {
      await apiClient(`/api/landing-pages/${pageId}/generate`, { method: 'POST' });
      fetchPages();
    } catch (err) {
      console.error('Failed to generate:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Landing Pages</h1>
        <p className="text-muted-foreground">Gérez et publiez vos landing pages</p>
      </div>

      {pages.length === 0 ? (
        <EmptyState icon={Globe} title="Aucune landing page" description="Les landing pages sont générées automatiquement à partir des produits" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{page.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">/{page.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                      {page.isPublished ? 'Publié' : 'Brouillon'}
                    </Badge>
                    <Switch
                      checked={page.isPublished}
                      onCheckedChange={() => togglePublish(page)}
                      disabled={toggling === page.id}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {page.heroTitle && <p className="mb-1 font-semibold">{page.heroTitle}</p>}
                {page.heroSubtitle && <p className="mb-4 text-sm text-muted-foreground">{page.heroSubtitle}</p>}
                <div className="flex gap-2">
                  {page.isPublished && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="mr-1 h-3 w-3" />Voir
                      </a>
                    </Button>
                  )}
                  {page.product && (
                    <Button size="sm" variant="outline" onClick={() => handleGenerate(page.id)}>
                      <Sparkles className="mr-1 h-3 w-3" />Régénérer
                    </Button>
                  )}
                </div>
                {page.product && (
                  <p className="mt-2 text-xs text-muted-foreground">Produit: {page.product.name}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
