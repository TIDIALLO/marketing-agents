'use client';

import { useCallback } from 'react';
import { useSocketEvent } from './use-socket-event';
import { useToast } from '@/providers/ToastProvider';
import type {
  ContentPublishedEvent,
  LeadNewEvent,
  LeadConvertedEvent,
  CampaignLaunchedEvent,
  ApprovalNewEvent,
} from '@synap6ia/shared';

export function useNotificationEvents() {
  const { toast } = useToast();

  useSocketEvent(
    'content:published',
    useCallback(
      (data: ContentPublishedEvent) => {
        toast({
          title: 'Contenu publié',
          description: `Publié sur ${data.platform}`,
          variant: 'success',
        });
      },
      [toast],
    ),
  );

  useSocketEvent(
    'lead:new',
    useCallback(
      (data: LeadNewEvent) => {
        toast({
          title: 'Nouveau lead',
          description: `${data.name} via ${data.source}`,
          variant: 'default',
        });
      },
      [toast],
    ),
  );

  useSocketEvent(
    'lead:converted',
    useCallback(
      (data: LeadConvertedEvent) => {
        toast({
          title: 'Lead converti !',
          description: `Valeur: ${data.value.toLocaleString()} FCFA`,
          variant: 'success',
        });
      },
      [toast],
    ),
  );

  useSocketEvent(
    'campaign:launched',
    useCallback(
      (data: CampaignLaunchedEvent) => {
        toast({
          title: 'Campagne lancée',
          description: `Campagne ${data.campaignId} active`,
          variant: 'success',
        });
      },
      [toast],
    ),
  );

  useSocketEvent(
    'approval:new',
    useCallback(
      (data: ApprovalNewEvent) => {
        toast({
          title: 'Nouvelle approbation',
          description: `${data.entityType} — priorité ${data.priority}`,
          variant: 'warning',
        });
      },
      [toast],
    ),
  );
}
