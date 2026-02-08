'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useLocale } from '@/providers/IntlProvider';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

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
  const [whatsappNotif, setWhatsappNotif] = useState(user?.notificationPreferences?.whatsapp ?? false);

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
      toast({ title: 'Profil mis à jour', variant: 'success' });
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
          whatsapp: whatsappNotif,
        },
      });
      toast({ title: 'Préférences mises à jour', variant: 'success' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="notifications">{t('notifications')}</TabsTrigger>
          <TabsTrigger value="appearance">Apparence</TabsTrigger>
          <TabsTrigger value="whitelabel">White-Label</TabsTrigger>
        </TabsList>

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
                    <Label htmlFor="firstName">Prénom</Label>
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
                  <Label>Rôle</Label>
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
              <CardDescription>Gérez vos préférences de notifications.</CardDescription>
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Recevez les notifications sur WhatsApp</p>
                </div>
                <Switch checked={whatsappNotif} onCheckedChange={setWhatsappNotif} />
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
                    <SelectItem value="system">Système</SelectItem>
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

        <TabsContent value="whitelabel">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">White-Label</CardTitle>
              <CardDescription>Personnalisez la plateforme pour vos clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Couleur principale</Label>
                <div className="flex items-center gap-3">
                  <input type="color" defaultValue="#6366f1" className="h-10 w-10 cursor-pointer rounded border" />
                  <Input placeholder="#6366f1" className="w-32" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Couleur secondaire</Label>
                <div className="flex items-center gap-3">
                  <input type="color" defaultValue="#f59e0b" className="h-10 w-10 cursor-pointer rounded border" />
                  <Input placeholder="#f59e0b" className="w-32" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Domaine personnalisé</Label>
                <Input placeholder="app.votredomaine.com" />
              </div>
              <Button disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : tCommon('save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
