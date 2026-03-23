import { createSignal, createMemo, createResource, Show, For } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { LeadCard } from "~/components/volunteer/LeadCard";
import { CallLogSheet, type CallLogData } from "~/components/volunteer/CallLogSheet";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { queryLeadsQuery, queryTasksQuery } from "~/server/api";
import type { LeadField, TaskField, Lead, Task } from "~/lib/schemas/domain";
import type { QuerySpec } from "~/lib/schemas/query";
import {
  getLeadStatus,
  isLeadOverdue,
  isLeadDueToday,
  calculateCompletionRate,
  getProgressColor,
} from "~/lib/utils/lead-status";

/**
 * Volunteer My Leads Dashboard
 * Shows assigned leads with campaign filtering and progress tracking
 */
export default function MyLeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = createSignal<string | null>(
    (typeof searchParams.task === "string" ? searchParams.task : null)
  );
  const [callLogLead, setCallLogLead] = createSignal<Lead | null>(null);
  const [callLogTask, setCallLogTask] = createSignal<Task | null>(null);

  // TODO: Get actual volunteer ID from session
  const volunteerId = "01JBQM7NQJQP5K8V9X2W3Y4Z51"; // Placeholder

  // Fetch all tasks for this volunteer
  const [tasksData] = createResource(async () => {
    const spec: QuerySpec<TaskField> = {
      filters: [
        // In real app: filter by tasks where volunteerId is in selectedAgentIds
      ],
      sorting: [{ field: "createdAt", direction: "desc" }],
      pagination: { pageSize: 50, pageIndex: 0 },
    };
    return await queryTasksQuery(spec);
  });

  // Fetch all assigned leads for this volunteer
  const [leadsData] = createResource(async () => {
    const spec: QuerySpec<LeadField> = {
      filters: [
        // In real app: filter by leads assigned to this volunteer's tasks
      ],
      sorting: [{ field: "displayName", direction: "asc" }],
      pagination: { pageSize: 100, pageIndex: 0 },
    };
    return await queryLeadsQuery(spec);
  });

  const tasks = createMemo(() => tasksData()?.items || []);
  const allLeads = createMemo(() => leadsData()?.items || []);

  // Filter leads by selected task
  const filteredLeads = createMemo(() => {
    const taskId = selectedTaskId();
    if (!taskId) return allLeads();
    
    // In real app: filter by task assignment
    // For now, return first 20 leads as demo
    return allLeads().slice(0, 20);
  });

  // Group leads by status
  const overdueLeads = createMemo(() =>
    filteredLeads().filter((lead) => isLeadOverdue(lead))
  );

  const todayLeads = createMemo(() =>
    filteredLeads().filter((lead) => !isLeadOverdue(lead) && isLeadDueToday(lead))
  );

  const activeLeads = createMemo(() =>
    filteredLeads().filter((lead) => {
      const status = getLeadStatus(lead);
      return (
        status !== "completed" &&
        !isLeadOverdue(lead) &&
        !isLeadDueToday(lead)
      );
    })
  );

  // Calculate overall progress
  const overallProgress = createMemo(() => calculateCompletionRate(Array.from(filteredLeads())));

  // Get selected task
  const selectedTask = createMemo(() => {
    const taskId = selectedTaskId();
    if (!taskId) return null;
    return tasks().find((t) => t.id === taskId) || null;
  });

  // Handle task filter change
  const handleTaskFilterChange = (taskId: string | null) => {
    setSelectedTaskId(taskId);
    if (taskId) {
      setSearchParams({ task: taskId });
    } else {
      setSearchParams({});
    }
  };

  // Handle call button
  const handleCall = (lead: Lead) => {
    // Find task for this lead
    const task = tasks().find((t) => t.matchedContactIds?.includes(lead.id));
    
    // Launch native dialer
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    }
    
    // Show call log sheet
    setCallLogLead(lead);
    setCallLogTask(task || null);
  };

  // Handle WhatsApp button
  const handleWhatsApp = (lead: Lead) => {
    if (!lead.phone) return;
    
    const message = `Hi ${lead.displayName}, this is from [NGO Name]. `;
    const url = `https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Handle call log save
  const handleCallLogSave = async (data: CallLogData) => {
    console.log("Saving call log:", data);
    // TODO: Call API to update lead
    // await updateLeadMutation({
    //   id: callLogLead()!.id,
    //   lastCallDate: new Date().toISOString(),
    //   lastInterestLevel: data.interestLevel,
    //   lastNotes: data.notes,
    //   nextFollowUpDate: data.followUpDate,
    //   totalCallCount: (callLogLead()!.totalCallCount || 0) + 1,
    // });
    
    setCallLogLead(null);
    setCallLogTask(null);
  };

  // Handle notes update
  const handleUpdateNotes = async (lead: Lead, notes: string) => {
    console.log("Updating notes for", lead.displayName, ":", notes);
    // TODO: Call API to update lead notes
    // await updateLeadMutation({
    //   id: lead.id,
    //   lastNotes: notes,
    // });
  };

  // Handle reschedule
  const handleReschedule = async (lead: Lead, date: string) => {
    console.log("Rescheduling", lead.displayName, "to:", date);
    // TODO: Call API to update follow-up date
    // await updateLeadMutation({
    //   id: lead.id,
    //   nextFollowUpDate: new Date(date).toISOString(),
    // });
  };

  return (
    <main class="container mx-auto p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div class="mb-6">
        <h1 class="text-2xl sm:text-3xl font-bold mb-2">🏠 My Leads</h1>
        
        {/* Overall Progress */}
        <Show when={filteredLeads().length > 0}>
          <Card class="p-4 bg-primary/5 border-primary/20 mt-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">
                  {selectedTask() ? selectedTask()!.name : "Overall Progress"}
                </span>
                <Badge variant="default">
                  {overallProgress().completed}/{overallProgress().total}
                </Badge>
              </div>
              <div class="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  class={`h-full transition-all ${getProgressColor(overallProgress().percentage)}`}
                  style={{ width: `${overallProgress().percentage}%` }}
                />
              </div>
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>{overallProgress().percentage}% completed</span>
                <span>
                  {overallProgress().overdue > 0 && `${overallProgress().overdue} overdue`}
                </span>
              </div>
            </div>
          </Card>
        </Show>

        {/* Campaign Filter */}
        <div class="mt-4">
          <label class="text-sm font-medium mb-2 block">📋 Campaign:</label>
          <select
            value={selectedTaskId() || ""}
            onChange={(e) => handleTaskFilterChange(e.target.value || null)}
            class="w-full p-2 border rounded-md bg-background"
          >
            <option value="">All Tasks</option>
            <For each={tasks()}>
              {(task) => {
                const taskLeads = allLeads().filter((l) =>
                  task.matchedContactIds?.includes(l.id)
                );
                const progress = calculateCompletionRate(taskLeads);
                return (
                  <option value={task.id}>
                    {task.name} ({taskLeads.length}) - {progress.percentage}% completed
                  </option>
                );
              }}
            </For>
          </select>
        </div>
      </div>

      {/* Urgent - Overdue Follow-ups */}
      <Show when={overdueLeads().length > 0}>
        <section class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-lg font-semibold text-red-600">
              🔴 URGENT - Overdue Follow-ups
            </h2>
            <Badge variant="error">{overdueLeads().length}</Badge>
          </div>
          <div class="space-y-3">
            <For each={overdueLeads()}>
              {(lead) => (
                <LeadCard
                  lead={lead}
                  task={selectedTask() || undefined}
                  showTaskBadge={!selectedTaskId()}
                  onCall={handleCall}
                  onWhatsApp={handleWhatsApp}
                  onUpdateNotes={handleUpdateNotes}
                  onReschedule={handleReschedule}
                />
              )}
            </For>
          </div>
        </section>
      </Show>

      {/* Today - Follow-ups Due */}
      <Show when={todayLeads().length > 0}>
        <section class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-lg font-semibold text-amber-600">
              📅 TODAY - Follow-ups Due
            </h2>
            <Badge variant="default">{todayLeads().length}</Badge>
          </div>
          <div class="space-y-3">
            <For each={todayLeads()}>
              {(lead) => (
                <LeadCard
                  lead={lead}
                  task={selectedTask() || undefined}
                  showTaskBadge={!selectedTaskId()}
                  onCall={handleCall}
                  onWhatsApp={handleWhatsApp}
                  onUpdateNotes={handleUpdateNotes}
                  onReschedule={handleReschedule}
                />
              )}
            </For>
          </div>
        </section>
      </Show>

      {/* Active Leads */}
      <Show when={activeLeads().length > 0}>
        <section class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-lg font-semibold">✅ MY ACTIVE LEADS</h2>
            <Badge variant="secondary">{activeLeads().length}</Badge>
          </div>
          <div class="space-y-3">
            <For each={activeLeads()}>
              {(lead) => (
                <LeadCard
                  lead={lead}
                  task={selectedTask() || undefined}
                  showTaskBadge={!selectedTaskId()}
                  onCall={handleCall}
                  onWhatsApp={handleWhatsApp}
                  onUpdateNotes={handleUpdateNotes}
                  onReschedule={handleReschedule}
                />
              )}
            </For>
          </div>
        </section>
      </Show>

      {/* Empty State */}
      <Show when={filteredLeads().length === 0 && !leadsData.loading}>
        <Card class="p-12 text-center">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-xl font-semibold mb-2">All caught up!</h3>
          <p class="text-muted-foreground mb-4">
            You have no pending follow-ups.
          </p>
          <p class="text-sm text-muted-foreground mb-4">
            Want to help more? Check the Lead Pool for available leads.
          </p>
          <Button>Browse Lead Pool →</Button>
        </Card>
      </Show>

      {/* Call Log Sheet */}
      <CallLogSheet
        lead={callLogLead()!}
        task={callLogTask() || undefined}
        isOpen={callLogLead() !== null}
        onClose={() => setCallLogLead(null)}
        onSave={handleCallLogSave}
      />
    </main>
  );
}
