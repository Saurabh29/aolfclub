import { createResource, createSignal, For, Show, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { tasksApi, usersApi } from "~/lib/user-api";
import {
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
} from "~/lib/schemas/ui/task.schema";
import type { Task, Attachment } from "~/lib/schemas/ui/task.schema";
import { UserRole } from "~/lib/schemas/ui/user.schema";

/**
 * Create Task Page - Step 1
 *
 * Features:
 * - Task Title & Description
 * - Multi-select Assign To (Teachers/Volunteers only)
 * - Due Date picker
 * - Priority selection (Low/Medium/High)
 * - File upload for attachments
 * - Recurrence selection
 * - Save & Continue button (redirects to Step 2)
 */

export default function CreateTaskPage() {
  const navigate = useNavigate();

  // ============================================================================
  // STATE
  // ============================================================================

  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [selectedUsers, setSelectedUsers] = createSignal<string[]>([]); // User IDs
  const [dueDate, setDueDate] = createSignal("");
  const [priority, setPriority] = createSignal<string>(TaskPriority.MEDIUM);
  const [recurrence, setRecurrence] = createSignal<string>(TaskRecurrence.NONE);
  const [attachments, setAttachments] = createSignal<Attachment[]>([]);
  const [uploading, setUploading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  // Load teachers and volunteers using createResource
  const [users] = createResource(() => usersApi.getAll());

  const availableUsers = createMemo(() => {
    const userList = users() || [];
    return userList.filter(
      (u) => u.role === UserRole.TEACHER || u.role === UserRole.VOLUNTEER,
    );
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const isValid = () => {
    return (
      title().trim().length >= 3 &&
      description().trim().length >= 10 &&
      selectedUsers().length > 0 &&
      dueDate().length > 0 &&
      priority().length > 0
    );
  };

  // ============================================================================
  // FILE UPLOAD
  // ============================================================================

  const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      // Simulate file upload (in production, upload to cloud storage)
      const newAttachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const attachment: Attachment = {
          id: `attach-${Date.now()}-${i}`,
          fileName: file.name,
          fileUrl: URL.createObjectURL(file), // Mock URL
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        };
        newAttachments.push(attachment);
      }

      setAttachments([...attachments(), ...newAttachments]);
      target.value = ""; // Reset input
    } catch (error) {
      console.error("Failed to upload files:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(attachments().filter((a) => a.id !== attachmentId));
  };

  // ============================================================================
  // USER SELECTION
  // ============================================================================

  const toggleUser = (userId: string) => {
    const current = selectedUsers();
    if (current.includes(userId)) {
      setSelectedUsers(current.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...current, userId]);
    }
  };

  const isUserSelected = (userId: string) => selectedUsers().includes(userId);

  // ============================================================================
  // SAVE & CONTINUE
  // ============================================================================

  const handleSaveAndContinue = async () => {
    if (!isValid()) {
      alert("Please fill in all required fields.");
      return;
    }

    setSaving(true);

    try {
      const taskData: Omit<Task, "id" | "createdAt" | "updatedAt"> = {
        title: title(),
        description: description(),
        assignedTo: selectedUsers(),
        dueDate: new Date(dueDate()).toISOString(),
        priority:
          priority() as (typeof TaskPriority)[keyof typeof TaskPriority],
        recurrence:
          recurrence() as (typeof TaskRecurrence)[keyof typeof TaskRecurrence],
        attachments: attachments(),
        assignedLeads: [],
        assignedParticipants: [],
        status: TaskStatus.DRAFT, // Use proper enum value
        createdBy: "user-1", // Mock current user
      };

      console.log("Creating task with data:", taskData);
      const newTask = await tasksApi.create(taskData);
      console.log("Task created successfully:", newTask);

      // Redirect to Step 2 with task ID
      navigate(`/tasks/assign/${newTask.id}`);
    } catch (error) {
      console.error("Failed to create task:", error);
      if (error instanceof Error) {
        alert(`Failed to create task: ${error.message}`);
      } else {
        alert("Failed to create task. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // FORMAT HELPERS
  // ============================================================================

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUserName = (userId: string): string => {
    const user = availableUsers().find((u) => u.id === userId);
    return user?.fullName || "Unknown";
  };

  const getUserRole = (userId: string): string => {
    const user = availableUsers().find((u) => u.id === userId);
    return user?.role || "";
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Create Task</h1>
              <p class="text-sm text-gray-600 mt-1">
                Step 1 of 2: Task Details
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
      <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="space-y-6">
          {/* Task Title */}
          <Card>
            <CardHeader>
              <CardTitle>Task Title</CardTitle>
              <CardDescription>
                Give your task a clear, descriptive title
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="text"
                placeholder="e.g., Prepare HP Session Materials"
                value={title()}
                onInput={(
                  e: InputEvent & { currentTarget: HTMLInputElement },
                ) => setTitle(e.currentTarget.value)}
                class="w-full"
              />
              <Show when={title().length > 0 && title().length < 3}>
                <p class="text-xs text-red-600 mt-1">
                  Minimum 3 characters required
                </p>
              </Show>
            </CardContent>
          </Card>

          {/* Task Description */}
          <Card>
            <CardHeader>
              <CardTitle>Task Description</CardTitle>
              <CardDescription>
                Provide detailed information about the task
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Describe the task, expected outcomes, and any important details..."
                value={description()}
                onInput={(
                  e: InputEvent & { currentTarget: HTMLTextAreaElement },
                ) => setDescription(e.currentTarget.value)}
                class="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y bg-white"
              />
              <Show
                when={description().length > 0 && description().length < 10}
              >
                <p class="text-xs text-red-600 mt-1">
                  Minimum 10 characters required
                </p>
              </Show>
            </CardContent>
          </Card>

          {/* Assign To */}
          <Card>
            <CardHeader>
              <CardTitle>Assign To</CardTitle>
              <CardDescription>
                Select teachers and volunteers to assign this task
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                <For each={availableUsers()}>
                  {(user) => (
                    <button
                      onClick={() => toggleUser(user.id)}
                      class={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md border-2 transition-colors",
                        isUserSelected(user.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300",
                      )}
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center",
                            isUserSelected(user.id)
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300 bg-white",
                          )}
                        >
                          <Show when={isUserSelected(user.id)}>
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
                            {user.fullName}
                          </p>
                          <p class="text-xs text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          user.role === UserRole.TEACHER
                            ? "default"
                            : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </button>
                  )}
                </For>
                <Show when={availableUsers().length === 0}>
                  <p class="text-sm text-gray-500">
                    No teachers or volunteers available
                  </p>
                </Show>
                <Show
                  when={
                    selectedUsers().length === 0 && availableUsers().length > 0
                  }
                >
                  <p class="text-xs text-red-600">
                    Please select at least one person
                  </p>
                </Show>
              </div>
            </CardContent>
          </Card>

          {/* Due Date & Priority */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Due Date */}
            <Card>
              <CardHeader>
                <CardTitle>Due Date</CardTitle>
                <CardDescription>
                  When should this task be completed?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="date"
                  value={dueDate()}
                  onInput={(
                    e: InputEvent & { currentTarget: HTMLInputElement },
                  ) => setDueDate(e.currentTarget.value)}
                  class="w-full bg-white"
                  min={new Date().toISOString().split("T")[0]} // Today or later
                />
              </CardContent>
            </Card>

            {/* Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Priority</CardTitle>
                <CardDescription>How urgent is this task?</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={priority()}
                  onChange={(value) => value && setPriority(value)}
                  options={[
                    TaskPriority.LOW,
                    TaskPriority.MEDIUM,
                    TaskPriority.HIGH,
                  ]}
                  placeholder="Select priority"
                  itemComponent={(itemProps) => (
                    <SelectItem item={itemProps.item}>
                      <span class="flex items-center gap-2">
                        <span
                          class={cn(
                            "w-2 h-2 rounded-full",
                            itemProps.item.rawValue === TaskPriority.HIGH
                              ? "bg-red-500"
                              : itemProps.item.rawValue === TaskPriority.MEDIUM
                                ? "bg-yellow-500"
                                : "bg-green-500",
                          )}
                        ></span>
                        {itemProps.item.rawValue}
                      </span>
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-full bg-white">
                    <SelectValue<string>>
                      {(state) => state.selectedOption()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent class="bg-white border border-gray-200" />
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Recurrence */}
          <Card>
            <CardHeader>
              <CardTitle>Recurrence</CardTitle>
              <CardDescription>Does this task repeat?</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={recurrence()}
                onChange={(value) => value && setRecurrence(value)}
                options={[
                  TaskRecurrence.NONE,
                  TaskRecurrence.DAILY,
                  TaskRecurrence.WEEKLY,
                  TaskRecurrence.MONTHLY,
                ]}
                placeholder="Select recurrence"
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {itemProps.item.rawValue === TaskRecurrence.NONE
                      ? "None (One-time task)"
                      : itemProps.item.rawValue}
                  </SelectItem>
                )}
              >
                <SelectTrigger class="w-full bg-white">
                  <SelectValue<string>>
                    {(state) => {
                      const val = state.selectedOption();
                      return val === TaskRecurrence.NONE
                        ? "None (One-time task)"
                        : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent class="bg-white border border-gray-200" />
              </Select>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>
                Upload any relevant files or documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                  disabled={uploading()}
                  class="flex items-center gap-2"
                >
                  <Show
                    when={!uploading()}
                    fallback={<span>Uploading...</span>}
                  >
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
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload Files
                  </Show>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  class="hidden"
                  onChange={handleFileUpload}
                />

                {/* Attachment List */}
                <Show when={attachments().length > 0}>
                  <div class="space-y-2">
                    <For each={attachments()}>
                      {(attachment) => (
                        <div class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                          <div class="flex items-center gap-2">
                            <svg
                              class="h-4 w-4 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                            <div>
                              <p class="text-sm font-medium text-gray-900">
                                {attachment.fileName}
                              </p>
                              <p class="text-xs text-gray-500">
                                {formatFileSize(attachment.fileSize)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeAttachment(attachment.id)}
                            class="text-red-600 hover:text-red-800"
                          >
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div class="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => navigate("/tasks")}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndContinue}
              disabled={!isValid() || saving()}
              class="flex items-center gap-2"
            >
              <Show
                when={saving()}
                fallback={
                  <>
                    Save & Continue
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
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                }
              >
                <span>Saving...</span>
              </Show>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
