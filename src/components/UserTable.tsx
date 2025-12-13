import { For, Show, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import type { User } from "~/lib/schemas/ui/user.schema";
import { UserRole } from "~/lib/schemas/ui/user.schema";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

/**
 * UserTable Component (UM-5)
 * 
 * Displays a table of users with:
 * - Checkbox selection
 * - User details (Name, Email, Phone, Role)
 * - Programs (for Members): "Done: ... | Want: ..."
 * - Edit/Delete actions
 * 
 * Props:
 * - users: Array of users to display
 * - selectedIds: Currently selected user IDs
 * - onSelectionChange: Callback when selection changes
 * - onEdit: Callback when edit is clicked
 * - onDelete: Callback when delete is clicked
 */

type UserTableProps = {
  users: User[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (userId: string) => void;
  onDelete: (userId: string) => void;
};

export function UserTable(props: UserTableProps) {
  /**
   * Check if all users are selected
   */
  const isAllSelected = () => {
    return props.users.length > 0 && props.selectedIds.length === props.users.length;
  };

  /**
   * Check if some (but not all) users are selected
   */
  const isSomeSelected = () => {
    return props.selectedIds.length > 0 && props.selectedIds.length < props.users.length;
  };

  /**
   * Toggle all checkboxes
   */
  const handleSelectAll = () => {
    if (isAllSelected()) {
      props.onSelectionChange([]);
    } else {
      props.onSelectionChange(props.users.map(u => u.id));
    }
  };

  /**
   * Toggle individual checkbox
   */
  const handleSelect = (userId: string) => {
    const isSelected = props.selectedIds.includes(userId);
    if (isSelected) {
      props.onSelectionChange(props.selectedIds.filter(id => id !== userId));
    } else {
      props.onSelectionChange([...props.selectedIds, userId]);
    }
  };

  /**
   * Format programs for display
   * For Members: "Done: HP, MY | Want: UY"
   * For others: show Want programs only
   */
  const formatPrograms = (user: User) => {
    if (user.role === UserRole.MEMBER) {
      const done = user.programsDone.length > 0 ? user.programsDone.join(", ") : "None";
      const want = user.programsWant.length > 0 ? user.programsWant.join(", ") : "None";
      return `Done: ${done} | Want: ${want}`;
    }
    
    if (user.programsWant.length > 0) {
      return user.programsWant.join(", ");
    }
    
    return "-";
  };

  return (
    <div class="rounded-md border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-12">
              <Checkbox
                checked={isAllSelected()}
                indeterminate={isSomeSelected()}
                onChange={handleSelectAll}
                aria-label="Select all users"
              />
            </TableHead>
            <TableHead class="min-w-[150px]">Name</TableHead>
            <TableHead class="min-w-[200px]">Email</TableHead>
            <TableHead class="min-w-[120px]">Phone</TableHead>
            <TableHead class="min-w-[100px]">Role</TableHead>
            <TableHead class="min-w-[200px]">Programs</TableHead>
            <TableHead class="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <Show
            when={props.users.length > 0}
            fallback={
              <TableRow>
                <TableCell colSpan={7} class="h-24 text-center text-gray-500">
                  No users found.
                </TableCell>
              </TableRow>
            }
          >
            <For each={props.users}>
              {(user) => (
                <TableRow class={cn(props.selectedIds.includes(user.id) && "bg-sky-50")}>
                  <TableCell>
                    <Checkbox
                      checked={props.selectedIds.includes(user.id)}
                      onChange={() => handleSelect(user.id)}
                      aria-label={`Select ${user.fullName}`}
                    />
                  </TableCell>
                  <TableCell class="font-medium text-gray-900">{user.fullName}</TableCell>
                  <TableCell class="text-gray-600">{user.email}</TableCell>
                  <TableCell class="text-gray-600">{user.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === UserRole.ADMIN ? "default" : "secondary"}
                      class="text-xs"
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-sm text-gray-600">{formatPrograms(user)}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => props.onEdit(user.id)}
                        class="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => props.onDelete(user.id)}
                        class="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </For>
          </Show>
        </TableBody>
      </Table>
    </div>
  );
}
