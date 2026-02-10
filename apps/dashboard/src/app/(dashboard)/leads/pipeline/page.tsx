'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GripVertical, Building2, Flame, ThermometerSun, Snowflake } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Lead, LeadStatus } from '@synap6ia/shared';

// Pipeline columns definition (order matters for the Kanban)
const PIPELINE_STAGES: { status: LeadStatus; label: string; color: string; bgColor: string }[] = [
  { status: 'new', label: 'Nouveaux', color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  { status: 'nurturing', label: 'Nurturing', color: 'bg-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30' },
  { status: 'qualified', label: 'Qualifiés', color: 'bg-green-500', bgColor: 'bg-green-50 dark:bg-green-950/30' },
  { status: 'opportunity', label: 'Opportunités', color: 'bg-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/30' },
  { status: 'converted', label: 'Convertis', color: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
];

const TEMP_ICON: Record<string, React.ReactNode> = {
  hot: <Flame className="h-3 w-3 text-red-500" />,
  warm: <ThermometerSun className="h-3 w-3 text-orange-400" />,
  cold: <Snowflake className="h-3 w-3 text-blue-400" />,
};

export default function LeadPipelinePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  const { data: leads, mutate } = useApi<Lead[]>('/api/leads');

  // Group leads by status
  const leadsByStatus: Record<LeadStatus, Lead[]> = {
    new: [],
    qualified: [],
    nurturing: [],
    opportunity: [],
    converted: [],
    lost: [],
  };

  for (const lead of leads ?? []) {
    if (leadsByStatus[lead.status]) {
      leadsByStatus[lead.status].push(lead);
    }
  }

  // Sort within each column by score (desc)
  for (const status of Object.keys(leadsByStatus) as LeadStatus[]) {
    leadsByStatus[status].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  const handleDragStart = useCallback((e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedLead || draggedLead.status === targetStatus) {
      setDraggedLead(null);
      return;
    }

    try {
      await apiClient(`/api/leads/${draggedLead.id}`, {
        method: 'PUT',
        body: { status: targetStatus },
      });
      toast({ title: 'Lead déplacé', description: `${draggedLead.firstName} ${draggedLead.lastName} → ${targetStatus}`, variant: 'success' });
      await mutate();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de déplacer le lead', variant: 'destructive' });
    }

    setDraggedLead(null);
  }, [draggedLead, mutate, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline Leads</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{(leads ?? []).length} leads au total</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const columnLeads = leadsByStatus[stage.status] ?? [];
          const isDragOver = dragOverColumn === stage.status;

          return (
            <div
              key={stage.status}
              className={`flex min-w-[280px] flex-1 flex-col rounded-lg border transition-colors ${
                isDragOver ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              }`}
              onDragOver={(e) => handleDragOver(e, stage.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.status)}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between rounded-t-lg px-4 py-3 ${stage.bgColor}`}>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                  <span className="text-sm font-semibold">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnLeads.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 p-2 min-h-[200px]">
                {columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    className={`group cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
                      draggedLead?.id === lead.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-sm font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.firstName} {lead.lastName}
                        </Link>
                        {lead.company && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              {lead.company}
                            </span>
                          </div>
                        )}
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {lead.temperature && TEMP_ICON[lead.temperature]}
                        <span className="text-xs capitalize text-muted-foreground">
                          {lead.source}
                        </span>
                      </div>
                      {lead.score !== null && (
                        <span className={`text-xs font-bold tabular-nums ${
                          lead.score >= 70 ? 'text-green-500' :
                          lead.score >= 40 ? 'text-yellow-500' : 'text-muted-foreground'
                        }`}>
                          {lead.score}/100
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {columnLeads.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                    Aucun lead
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
