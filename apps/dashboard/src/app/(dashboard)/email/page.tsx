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
import { Mail, Plus, Send, Sparkles, Eye, MousePointer } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  sentAt: string | null;
  brand: { id: string; name: string };
  template: { id: string; name: string } | null;
}

export default function EmailPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await apiClient<Campaign[]>('/api/email-marketing/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiClient('/api/email-marketing/campaigns', {
        method: 'POST',
        body: {
          brandId: campaigns[0]?.brand?.id ?? form.get('brandId'),
          name: form.get('name') as string,
          subject: form.get('subject') as string,
        },
      });
      setDialogOpen(false);
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to create campaign:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (campaignId: string) => {
    if (!confirm('Envoyer cette campagne ? Cette action est irréversible.')) return;
    setSending(campaignId);
    try {
      await apiClient(`/api/email-marketing/campaigns/${campaignId}/send`, { method: 'POST' });
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to send campaign:', err);
    } finally {
      setSending(null);
    }
  };

  const handleGenerate = async (campaignId: string) => {
    try {
      await apiClient(`/api/email-marketing/campaigns/${campaignId}/generate`, { method: 'POST' });
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to generate:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'sending': return 'secondary';
      case 'draft': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Marketing</h1>
          <p className="text-muted-foreground">Créez et envoyez des campagnes email</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouvelle Campagne</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une campagne</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" required placeholder="Lancement SOC Autopilot" />
              </div>
              <div>
                <Label htmlFor="subject">Sujet</Label>
                <Input id="subject" name="subject" required placeholder="Découvrez SOC Autopilot Hub" />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? 'Création...' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState icon={Mail} title="Aucune campagne" description="Créez votre première campagne email" />
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                  </div>
                  <Badge variant={getStatusColor(campaign.status)}>
                    {campaign.status === 'sent' ? 'Envoyé' : campaign.status === 'sending' ? 'Envoi...' : 'Brouillon'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {campaign.status === 'sent' && (
                  <div className="mb-4 grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{campaign.sentCount}</p>
                      <p className="text-xs text-muted-foreground">Envoyés</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{campaign.openCount}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Eye className="h-3 w-3" />Ouvertures</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{campaign.clickCount}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><MousePointer className="h-3 w-3" />Clics</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {campaign.sentCount > 0 ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1) : '0'}%
                      </p>
                      <p className="text-xs text-muted-foreground">Taux d&apos;ouverture</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  {campaign.status === 'draft' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleGenerate(campaign.id)}>
                        <Sparkles className="mr-1 h-3 w-3" />Générer contenu
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSend(campaign.id)}
                        disabled={sending === campaign.id}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        {sending === campaign.id ? 'Envoi...' : 'Envoyer'}
                      </Button>
                    </>
                  )}
                </div>
                {campaign.template && (
                  <p className="mt-2 text-xs text-muted-foreground">Template: {campaign.template.name}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
