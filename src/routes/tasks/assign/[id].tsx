import {
  createSignal,
  createEffect,
  createResource,
  createMemo,
  For,
  Show,
  onMount,
} from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { tasksApi, usersApi, leadsApi } from "~/lib/user-api";
import { TaskStatus } from "~/lib/schemas/ui/task.schema";
import { UserRole } from "~/lib/schemas/ui/user.schema";

/**
 * Assign Participants/Leads Page - Step 2
 *
 * Features:
 * - Top Section: Task Summary (title, assigned teachers/volunteers, due date, status)
 * - Two Tabs: Leads & Participants (Members)
 * - Selectable list with checkboxes
 * - Bulk "Assign Selected" button
 * - Confirmation message
 * - Options to "Go to Task List" or "Assign More"
 */

export default function AssignParticipantsPage() {
  const params = useParams();
  const navigate = useNavigate();

  // ============================================================================
  // STATE
  // ============================================================================

  // Fetch data with createResource
  const [task, { refetch: refetchTask }] = createResource(async () => {
    const taskId = params.id;
    if (!taskId) {
      alert("Task ID not found");
      navigate("/tasks");
      return null;
    }
    const taskData = await tasksApi.getById(taskId);
    if (!taskData) {
      alert("Task not found");
      navigate("/tasks");
      return null;
    }
    return taskData;
  });

  const [users] = createResource(() => usersApi.getAll());
  const [leads] = createResource(() => leadsApi.getAll());

  const [saving, setSaving] = createSignal(false);
  const [showSuccess, setShowSuccess] = createSignal(false);

  // Tab state
  const [activeTab, setActiveTab] = createSignal<"leads" | "members">("leads");

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = createSignal<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = createSignal<string[]>([]);

  // Search state
  const [leadSearchQuery, setLeadSearchQuery] = createSignal("");
  const [memberSearchQuery, setMemberSearchQuery] = createSignal("");

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================

  const assignedUsers = createMemo(() => {
    const taskData = task();
    const usersData = users();
    if (!taskData || !usersData) return [];
    return usersData.filter((u) => taskData.assignedTo.includes(u.id));
  });

  const allMembers = createMemo(() => {
    const usersData = users();
    if (!usersData) return [];
    return usersData.filter((u) => u.role === UserRole.MEMBER);
  });

  // Pre-populate selections when task loads
  createEffect(() => {
    const taskData = task();
    if (taskData) {
      setSelectedLeadIds(taskData.assignedLeads || []);
      setSelectedMemberIds(taskData.assignedParticipants || []);
    }
  });

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredLeads = createMemo(() => {
    const query = leadSearchQuery().toLowerCase();
    const leadsData = leads() || [];
    if (!query) return leadsData;

    return leadsData.filter(
      (l) =>
        l.fullName.toLowerCase().includes(query) ||
        l.phone.includes(query) ||
        (l.email && l.email.toLowerCase().includes(query)),
    );
  });

  const filteredMembers = createMemo(() => {
    const query = memberSearchQuery().toLowerCase();
    const membersData = allMembers();
    if (!query) return membersData;

    return membersData.filter(
      (m) =>
        m.fullName.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        m.phone.includes(query),
    );
  });

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================

  const toggleLead = (leadId: string) => {
    const current = selectedLeadIds();
    if (current.includes(leadId)) {
      setSelectedLeadIds(current.filter((id) => id !== leadId));
    } else {
      setSelectedLeadIds([...current, leadId]);
    }
  };

  const toggleMember = (memberId: string) => {
    const current = selectedMemberIds();
    if (current.includes(memberId)) {
      setSelectedMemberIds(current.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...current, memberId]);
    }
  };

  const isLeadSelected = (leadId: string) => selectedLeadIds().includes(leadId);
  const isMemberSelected = (memberId: string) =>
    selectedMemberIds().includes(memberId);

  const selectAllLeads = () => {
    setSelectedLeadIds(filteredLeads().map((l) => l.id));
  };

  const deselectAllLeads = () => {
    setSelectedLeadIds([]);
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(filteredMembers().map((m) => m.id));
  };

  const deselectAllMembers = () => {
    setSelectedMemberIds([]);
  };

  // ============================================================================
  // ASSIGN SELECTED
  // ============================================================================

  const handleAssignSelected = async () => {
    const currentTask = task();
    if (!currentTask) return;

    setSaving(true);
    try {
      // Get the newly selected IDs (not already assigned)
      const newLeads = selectedLeadIds().filter(
        (id) => !currentTask.assignedLeads.includes(id),
      );
      const newMembers = selectedMemberIds().filter(
        (id) => !currentTask.assignedParticipants.includes(id),
      );

      if (newLeads.length === 0 && newMembers.length === 0) {
        alert("No new participants to assign");
        return;
      }

      await tasksApi.assignParticipants(currentTask.id, newLeads, newMembers);
      setShowSuccess(true);

      // Reload task data
      refetchTask();
    } catch (error) {
      console.error("Failed to assign participants:", error);
      alert("Failed to assign participants. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // FORMAT HELPERS
  // ============================================================================

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLeadSourceColor = (source: string): string => {
    switch (source) {
      case "Walk-in":
        return "bg-blue-100 text-blue-800";
      case "Referral":
        return "bg-green-100 text-green-800";
      case "Campaign":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalNewAssignments = () => {
    const currentTask = task();
    if (!currentTask) return 0;

    const newLeads = selectedLeadIds().filter(
      (id) => !currentTask.assignedLeads.includes(id),
    ).length;
    const newMembers = selectedMemberIds().filter(
      (id) => !currentTask.assignedParticipants.includes(id),
    ).length;

    return newLeads + newMembers;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                Assign Participants
              </h1>
              <p class="text-sm text-gray-600 mt-1">
                Step 2 of 2: Select leads and members to assign to this task
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/tasks")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Show
          when={!task.loading}
          fallback={
            <div class="text-center py-12">
              <p class="text-gray-500">Loading task...</p>
            </div>
          }
        >
          <Show when={task()}>
            {(currentTask) => (
              <div class="space-y-6">
                {/* Success Message */}
                <Show when={showSuccess()}>
                  <Card class="border-green-500 bg-green-50">
                    <CardContent class="pt-6">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                            <svg
                              class="w-6 h-6 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 class="font-semibold text-green-900">
                              Participants Assigned Successfully!
                            </h3>
                            <p class="text-sm text-green-700">
                              The selected participants have been added to the
                              task.
                            </p>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowSuccess(false);
                              setSelectedLeadIds([]);
                              setSelectedMemberIds([]);
                            }}
                          >
                            Assign More
                          </Button>
                          <Button size="sm" onClick={() => navigate("/tasks")}>
                            Go to Task List
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Show>

                {/* Task Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Task Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Task Title */}
                      <div>
                        <p class="text-xs text-gray-600 mb-1">Task Title</p>
                        <p class="font-semibold text-gray-900">
                          {currentTask().title}
                        </p>
                      </div>

                      {/* Assigned To */}
                      <div>
                        <p class="text-xs text-gray-600 mb-1">Assigned To</p>
                        <div class="flex flex-wrap gap-1">
                          <For each={assignedUsers()}>
                            {(user) => (
                              <Badge variant="secondary" class="text-xs">
                                {user.fullName}
                              </Badge>
                            )}
                          </For>
                        </div>
                      </div>

                      {/* Due Date & Status */}
                      <div class="flex gap-6">
                        <div>
                          <p class="text-xs text-gray-600 mb-1">Due Date</p>
                          <p class="text-sm text-gray-900">
                            {formatDate(currentTask().dueDate)}
                          </p>
                        </div>
                        <div>
                          <p class="text-xs text-gray-600 mb-1">Status</p>
                          <Badge
                            class={cn(
                              currentTask().status === TaskStatus.DRAFT
                                ? "bg-gray-100 text-gray-800"
                                : "bg-blue-100 text-blue-800",
                            )}
                          >
                            {currentTask().status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Current Assignments */}
                    <div class="mt-4 pt-4 border-t border-gray-200">
                      <p class="text-xs text-gray-600 mb-2">
                        Current Assignments
                      </p>
                      <div class="flex items-center gap-4 text-sm text-gray-700">
                        <span class="flex items-center gap-1">
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <strong>{currentTask().assignedLeads.length}</strong>{" "}
                          Leads
                        </span>
                        <span class="flex items-center gap-1">
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          <strong>
                            {currentTask().assignedParticipants.length}
                          </strong>{" "}
                          Members
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs */}
                <div class="flex items-center gap-2 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab("leads")}
                    class={cn(
                      "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
                      activeTab() === "leads"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-900",
                    )}
                  >
                    Leads
                    <Show when={selectedLeadIds().length > 0}>
                      <Badge variant="secondary" class="ml-2">
                        {selectedLeadIds().length}
                      </Badge>
                    </Show>
                  </button>
                  <button
                    onClick={() => setActiveTab("members")}
                    class={cn(
                      "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
                      activeTab() === "members"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-900",
                    )}
                  >
                    Participants (Members)
                    <Show when={selectedMemberIds().length > 0}>
                      <Badge variant="secondary" class="ml-2">
                        {selectedMemberIds().length}
                      </Badge>
                    </Show>
                  </button>
                </div>

                {/* Leads Tab */}
                <Show when={activeTab() === "leads"}>
                  <Card>
                    <CardHeader>
                      <div class="flex items-center justify-between">
                        <div>
                          <CardTitle>Select Leads</CardTitle>
                          <CardDescription>
                            Choose leads to assign to this task
                          </CardDescription>
                        </div>
                        <div class="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={
                              selectedLeadIds().length ===
                              filteredLeads().length
                                ? deselectAllLeads
                                : selectAllLeads
                            }
                          >
                            {selectedLeadIds().length === filteredLeads().length
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Search */}
                      <div class="mb-4">
                        <Input
                          type="search"
                          placeholder="Search leads by name, phone, or email..."
                          value={leadSearchQuery()}
                          onInput={(
                            e: InputEvent & { currentTarget: HTMLInputElement },
                          ) => setLeadSearchQuery(e.currentTarget.value)}
                          class="w-full"
                        />
                      </div>

                      {/* Leads List */}
                      <div class="space-y-2 max-h-96 overflow-y-auto">
                        <For each={filteredLeads()}>
                          {(lead) => (
                            <button
                              onClick={() => toggleLead(lead.id)}
                              class={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-md border-2 transition-colors",
                                isLeadSelected(lead.id)
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 bg-white hover:border-gray-300",
                              )}
                            >
                              <div class="flex items-center gap-3">
                                <div
                                  class={cn(
                                    "w-5 h-5 rounded border-2 flex items-center justify-center",
                                    isLeadSelected(lead.id)
                                      ? "border-blue-500 bg-blue-500"
                                      : "border-gray-300 bg-white",
                                  )}
                                >
                                  <Show when={isLeadSelected(lead.id)}>
                                    <svg
                                      class="w-3 h-3 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="3"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </Show>
                                </div>
                                <div class="text-left">
                                  <p class="font-medium text-gray-900">
                                    {lead.fullName}
                                  </p>
                                  <p class="text-xs text-gray-600">
                                    {lead.phone}{" "}
                                    {lead.email && `• ${lead.email}`}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                class={getLeadSourceColor(lead.leadSource)}
                              >
                                {lead.leadSource}
                              </Badge>
                            </button>
                          )}
                        </For>
                        <Show when={filteredLeads().length === 0}>
                          <p class="text-sm text-gray-500 text-center py-8">
                            No leads found
                          </p>
                        </Show>
                      </div>
                    </CardContent>
                  </Card>
                </Show>

                {/* Members Tab */}
                <Show when={activeTab() === "members"}>
                  <Card>
                    <CardHeader>
                      <div class="flex items-center justify-between">
                        <div>
                          <CardTitle>Select Participants (Members)</CardTitle>
                          <CardDescription>
                            Choose members to assign to this task
                          </CardDescription>
                        </div>
                        <div class="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={
                              selectedMemberIds().length ===
                              filteredMembers().length
                                ? deselectAllMembers
                                : selectAllMembers
                            }
                          >
                            {selectedMemberIds().length ===
                            filteredMembers().length
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Search */}
                      <div class="mb-4">
                        <Input
                          type="search"
                          placeholder="Search members by name, email, or phone..."
                          value={memberSearchQuery()}
                          onInput={(
                            e: InputEvent & { currentTarget: HTMLInputElement },
                          ) => setMemberSearchQuery(e.currentTarget.value)}
                          class="w-full"
                        />
                      </div>

                      {/* Members List */}
                      <div class="space-y-2 max-h-96 overflow-y-auto">
                        <For each={filteredMembers()}>
                          {(member) => (
                            <button
                              onClick={() => toggleMember(member.id)}
                              class={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-md border-2 transition-colors",
                                isMemberSelected(member.id)
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 bg-white hover:border-gray-300",
                              )}
                            >
                              <div class="flex items-center gap-3">
                                <div
                                  class={cn(
                                    "w-5 h-5 rounded border-2 flex items-center justify-center",
                                    isMemberSelected(member.id)
                                      ? "border-blue-500 bg-blue-500"
                                      : "border-gray-300 bg-white",
                                  )}
                                >
                                  <Show when={isMemberSelected(member.id)}>
                                    <svg
                                      class="w-3 h-3 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="3"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </Show>
                                </div>
                                <div class="text-left">
                                  <p class="font-medium text-gray-900">
                                    {member.fullName}
                                  </p>
                                  <p class="text-xs text-gray-600">
                                    {member.email} • {member.phone}
                                  </p>
                                </div>
                              </div>
                              <div class="flex items-center gap-2">
                                <Show when={member.programsDone.length > 0}>
                                  <Badge variant="secondary" class="text-xs">
                                    {member.programsDone.length} completed
                                  </Badge>
                                </Show>
                              </div>
                            </button>
                          )}
                        </For>
                        <Show when={filteredMembers().length === 0}>
                          <p class="text-sm text-gray-500 text-center py-8">
                            No members found
                          </p>
                        </Show>
                      </div>
                    </CardContent>
                  </Card>
                </Show>

                {/* Action Buttons */}
                <div class="flex items-center justify-between pt-4">
                  <div class="text-sm text-gray-600">
                    <Show when={totalNewAssignments() > 0}>
                      {totalNewAssignments()} new assignment
                      {totalNewAssignments() !== 1 ? "s" : ""} ready
                    </Show>
                  </div>
                  <div class="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/tasks")}
                    >
                      Skip & Go to Tasks
                    </Button>
                    <Button
                      onClick={handleAssignSelected}
                      disabled={totalNewAssignments() === 0 || saving()}
                      class="flex items-center gap-2"
                    >
                      <Show
                        when={saving()}
                        fallback={
                          <>
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            Assign Selected ({totalNewAssignments()})
                          </>
                        }
                      >
                        <span>Assigning...</span>
                      </Show>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Show>
        </Show>
      </main>
    </div>
  );
}
