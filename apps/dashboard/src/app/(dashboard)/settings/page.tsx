'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useLocale } from '@/providers/IntlProvider';
import { apiClient } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername: string | null;
  status: string;
}

interface Brand {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [slackNotif, setSlackNotif] = useState(user?.notificationPreferences?.slack ?? true);
  const [emailNotif, setEmailNotif] = useState(user?.notificationPreferences?.email ?? true);

  const { data: brands } = useApi<Brand[]>('/api/brands');
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);

  // Check for connected parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      toast({ title: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connecte !`, variant: 'success' });
      window.history.replaceState({}, '', '/settings');
    }
    if (error) {
      toast({ title: `Erreur de connexion: ${error}`, variant: 'destructive' });
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  // Load social accounts (requires brandId)
  useEffect(() => {
    if (!brands || brands.length === 0) return;
    const brandId = brands[0].id;
    apiClient<SocialAccount[]>(`/api/social-accounts?brandId=${brandId}`)
      .then((res) => {
        if (res.data) setSocialAccounts(res.data);
      })
      .catch(() => {});
  }, [brands]);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await apiClient('/api/settings/profile', {
        method: 'PUT',
        body: {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
        },
      });
      toast({ title: 'Profil mis a jour', variant: 'success' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSubmitting(true);
    try {
      await apiClient('/api/settings/notifications', {
        method: 'PUT',
        body: {
          slack: slackNotif,
          email: emailNotif,
        },
      });
      toast({ title: 'Preferences mises a jour', variant: 'success' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkedinConnected = socialAccounts.some((a) => a.platform === 'linkedin' && a.status === 'active');
  const twitterConnected = socialAccounts.some((a) => a.platform === 'twitter' && a.status === 'active');
  const linkedinAccount = socialAccounts.find((a) => a.platform === 'linkedin');
  const twitterAccount = socialAccounts.find((a) => a.platform === 'twitter');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      <Tabs defaultValue="social">
        <TabsList>
          <TabsTrigger value="social">Comptes sociaux</TabsTrigger>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="notifications">{t('notifications')}</TabsTrigger>
          <TabsTrigger value="appearance">Apparence</TabsTrigger>
        </TabsList>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comptes sociaux connectes</CardTitle>
              <CardDescription>Connectez vos comptes LinkedIn et Twitter pour publier du contenu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* LinkedIn */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
                    in
                  </div>
                  <div>
                    <p className="font-medium text-sm">LinkedIn</p>
                    {linkedinConnected ? (
                      <p className="text-xs text-muted-foreground">
                        Connecte : {linkedinAccount?.platformUsername ?? 'Compte LinkedIn'}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Non connecte</p>
                    )}
                  </div>
                </div>
                {linkedinConnected ? (
                  <Badge variant="success">Actif</Badge>
                ) : (
                  <a href={`${API_BASE}/api/oauth/linkedin/authorize`}>
                    <Button variant="outline" size="sm">
                      Connecter LinkedIn
                    </Button>
                  </a>
                )}
              </div>

              {/* Twitter */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white font-bold text-sm">
                    X
                  </div>
                  <div>
                    <p className="font-medium text-sm">Twitter / X</p>
                    {twitterConnected ? (
                      <p className="text-xs text-muted-foreground">
                        Connecte : @{twitterAccount?.platformUsername ?? 'Compte Twitter'}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Non connecte</p>
                    )}
                  </div>
                </div>
                {twitterConnected ? (
                  <Badge variant="success">Actif</Badge>
                ) : (
                  <a href={`${API_BASE}/api/oauth/twitter/authorize`}>
                    <Button variant="outline" size="sm">
                      Connecter Twitter
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations personnelles</CardTitle>
              <CardDescription>Modifiez vos informations de profil.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenom</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={user?.firstName ?? ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={user?.lastName ?? ''}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={user?.role ?? ''} disabled />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : tCommon('save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('notifications')}</CardTitle>
              <CardDescription>Gerez vos preferences de notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Slack</p>
                  <p className="text-xs text-muted-foreground">Recevez les notifications sur Slack</p>
                </div>
                <Switch checked={slackNotif} onCheckedChange={setSlackNotif} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Email</p>
                  <p className="text-xs text-muted-foreground">Recevez les notifications par email</p>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <Button onClick={handleSaveNotifications} disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : tCommon('save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apparence</CardTitle>
              <CardDescription>Personnalisez l&apos;interface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t('theme')}</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="system">Systeme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('language')}</Label>
                <p className="text-xs text-muted-foreground">{t('languageDesc')}</p>
                <Select value={locale} onValueChange={(v) => setLocale(v as 'fr' | 'en')}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">{t('french')}</SelectItem>
                    <SelectItem value="en">{t('english')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
