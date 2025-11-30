import { createResource, createSignal, For, Show, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { UserTable } from "~/components/UserTable";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import AddUserLeadDialog from "~/components/AddUserLeadDialog";
import { usersApi, exportUsersCSV, downloadCSV } from "~/lib/user-api";
import type { User } from "~/schemas/user.schema";
import { cn } from "~/lib/utils";

/**
 * All Users Page (UM-1)
 * 
 * Features:
 * - Search bar for filtering users
 * - Add User button
 * - Import CSV / Export CSV buttons
 * - User table with checkboxes
 * - Bulk delete functionality
 * - Edit/Delete individual users
 * - Pagination (simplified - showing all for now)
 * 
 * This is the main user management dashboard.
 */

export default function UsersListPage() {
  const navigate = useNavigate();

  // ============================================================================
  // STATE
  // ============================================================================

  // Use createResource for proper async data handling
  const [users, { refetch, mutate }] = createResource(() => usersApi.getAll());
  
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [showImportDialog, setShowImportDialog] = createSignal(false);
  const [showAddDialog, setShowAddDialog] = createSignal(false);

  // ============================================================================
  // FILTERED USERS (SEARCH)
  // ============================================================================

  const filteredUsers = createMemo(() => {
    const query = searchQuery().toLowerCase();
    const userList = users() || [];
    if (!query) return userList;

    return userList.filter(
      (u) =>
        u.fullName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.phone.includes(query) ||
        u.role.toLowerCase().includes(query)
    );
  });

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleEdit = (userId: string) => {
    navigate(`/users/edit/${userId}`);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await usersApi.delete(userId);
      refetch();
      // Remove from selection if it was selected
      setSelectedIds(selectedIds().filter(id => id !== userId));
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds().length;
    if (count === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${count} user(s)?`)) return;

    try {
      await usersApi.bulkDelete(selectedIds());
      refetch();
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to delete users:", error);
      alert("Failed to delete users");
    }
  };

  const handleExport = () => {
    const csv = exportUsersCSV(users() || []);
    downloadCSV(csv, `users-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImport = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    // For now, just show success message
    // In production, you would parse the CSV and create users
    alert(`File "${file.name}" uploaded successfully! (Parsing not implemented in demo)`);
    target.value = ""; // Reset input
  };

  const handleUserSaved = () => {
    refetch();
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
              <h1 class="text-2xl font-bold text-gray-900">Users</h1>
              <p class="text-sm text-gray-600 mt-1">
                Manage your users, members, and leads
              </p>
            </div>
            <div class="flex items-center gap-3">
              <Show when={selectedIds().length > 0}>
                <Badge variant="secondary" class="text-sm">
                  {selectedIds().length} selected
                </Badge>
              </Show>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div class="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div class="w-full sm:w-96">
            <Input
              type="search"
              placeholder="Search by name, email, or phone..."
              value={searchQuery()}
              onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setSearchQuery(e.currentTarget.value)}
              class="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div class="flex flex-wrap gap-2">
            <Show when={selectedIds().length > 0}>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                class="flex items-center gap-2"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete ({selectedIds().length})
              </Button>
            </Show>

            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("import-file")?.click()}
              class="flex items-center gap-2"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import CSV
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".csv"
              class="hidden"
              onChange={handleImport}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              class="flex items-center gap-2"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Export CSV
            </Button>

            <Button 
              size="sm" 
              class="flex items-center gap-2"
              onClick={() => setShowAddDialog(true)}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent class="pt-6">
              <div class="text-2xl font-bold text-gray-900">{users()?.length || 0}</div>
              <p class="text-xs text-gray-600 mt-1">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-2xl font-bold text-gray-900">
                {users()?.filter(u => u.role === "Member").length || 0}
              </div>
              <p class="text-xs text-gray-600 mt-1">Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-2xl font-bold text-gray-900">
                {users()?.filter(u => u.role === "Teacher").length || 0}
              </div>
              <p class="text-xs text-gray-600 mt-1">Teachers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-2xl font-bold text-gray-900">
                {users()?.filter(u => u.role === "Volunteer").length || 0}
              </div>
              <p class="text-xs text-gray-600 mt-1">Volunteers</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Show
          when={!users.loading}
          fallback={
            <Card>
              <CardContent class="py-12">
                <div class="text-center text-gray-500">Loading users...</div>
              </CardContent>
            </Card>
          }
        >
          <UserTable
            users={filteredUsers()}
            selectedIds={selectedIds()}
            onSelectionChange={setSelectedIds}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Show>

        {/* Pagination placeholder */}
        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Showing {filteredUsers().length} of {users()?.length || 0} users
          </p>
          <div class="text-sm text-gray-500">
            {/* Pagination controls would go here */}
          </div>
        </div>
      </main>

      {/* Add User/Lead Dialog */}
      <AddUserLeadDialog
        open={showAddDialog()}
        onClose={() => setShowAddDialog(false)}
        onSave={handleUserSaved}
      />
    </div>
  );
}
