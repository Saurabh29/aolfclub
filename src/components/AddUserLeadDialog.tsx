import { createSignal, Show, For } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { UserRole, LeadSource } from "~/lib/schemas/ui/user.schema";
import { usersApi, leadsApi } from "~/lib/user-api";
import type { User, Lead } from "~/lib/schemas/ui/user.schema";

const PROGRAMS = ["HP", "MY", "UY", "Sahaj", "VTP", "AMP"];

type AddUserLeadDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave?: () => void; // Optional callback after successful save
};

export default function AddUserLeadDialog(props: AddUserLeadDialogProps) {
  // Toggle between User and Lead modes
  const [mode, setMode] = createSignal<"user" | "lead">("user");

  // User form fields
  const [fullName, setFullName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [role, setRole] = createSignal<string>(UserRole.MEMBER);
  const [programsDone, setProgramsDone] = createSignal<string[]>([]);
  const [programsWant, setProgramsWant] = createSignal<string[]>([]);
  const [enableLogin, setEnableLogin] = createSignal(false);
  const [profilePhoto, setProfilePhoto] = createSignal("");

  // Lead form fields
  const [leadSource, setLeadSource] = createSignal<string>(LeadSource.WALK_IN);
  const [notes, setNotes] = createSignal("");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setRole(UserRole.MEMBER);
    setProgramsDone([]);
    setProgramsWant([]);
    setEnableLogin(false);
    setProfilePhoto("");
    setLeadSource(LeadSource.WALK_IN);
    setNotes("");
  };

  const handleSave = async () => {
    try {
      if (mode() === "user") {
        const userData: Omit<User, "id" | "createdAt" | "updatedAt"> = {
          fullName: fullName(),
          email: email(),
          phone: phone(),
          role: role() as "Admin" | "Teacher" | "Volunteer" | "Member",
          programsDone: (role() === UserRole.MEMBER ? programsDone() : []) as (
            | "HP"
            | "MY"
            | "UY"
            | "Sahaj"
            | "VTP"
            | "AMP"
          )[],
          programsWant: (role() === UserRole.MEMBER ? programsWant() : []) as (
            | "HP"
            | "MY"
            | "UY"
            | "Sahaj"
            | "VTP"
            | "AMP"
          )[],
          enableLogin: enableLogin(),
          profilePhoto: profilePhoto(),
        };
        await usersApi.create(userData);
      } else {
        const leadData: Omit<Lead, "id" | "createdAt" | "updatedAt"> = {
          fullName: fullName(),
          phone: phone(),
          email: email() || undefined,
          leadSource:
            leadSource() as (typeof LeadSource)[keyof typeof LeadSource],
          rating: 0, // Default rating
          lastContact: new Date().toISOString(), // Set to current time
          programsWant: programsWant() as (
            | "HP"
            | "MY"
            | "UY"
            | "Sahaj"
            | "VTP"
            | "AMP"
          )[],
          notes: notes(),
        };
        await leadsApi.create(leadData);
      }
      resetForm();
      props.onSave?.();
      props.onClose();
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save. Please try again.");
    }
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const toggleProgram = (program: string, list: "done" | "want") => {
    if (list === "done") {
      const current = programsDone();
      if (current.includes(program)) {
        setProgramsDone(current.filter((p) => p !== program));
      } else {
        setProgramsDone([...current, program]);
      }
    } else {
      const current = programsWant();
      if (current.includes(program)) {
        setProgramsWant(current.filter((p) => p !== program));
      } else {
        setProgramsWant([...current, program]);
      }
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle class="text-gray-900">
            {mode() === "user" ? "Add User" : "Add Lead"}
          </DialogTitle>
          <DialogDescription class="text-gray-600">
            Fill in the details below to add a new{" "}
            {mode() === "user" ? "user" : "lead"}.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div class="flex gap-2 p-1 bg-gray-100 rounded-lg mb-4">
          <button
            onClick={() => setMode("user")}
            class={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
              mode() === "user"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            Add User
          </button>
          <button
            onClick={() => setMode("lead")}
            class={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
              mode() === "lead"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            Add Lead
          </button>
        </div>

        <div class="space-y-4">
          {/* Full Name */}
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">
              Full Name <span class="text-red-600">*</span>
            </label>
            <Input
              value={fullName()}
              onInput={(e) => setFullName(e.currentTarget.value)}
              placeholder="Enter full name"
              class="bg-white"
            />
          </div>

          {/* Email - Optional for Leads */}
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">
              Email {mode() === "user" && <span class="text-red-600">*</span>}
              {mode() === "lead" && (
                <span class="text-gray-500">(Optional)</span>
              )}
            </label>
            <Input
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="Enter email address"
              class="bg-white"
            />
          </div>

          {/* Phone */}
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">
              Phone <span class="text-red-600">*</span>
            </label>
            <Input
              type="tel"
              value={phone()}
              onInput={(e) => setPhone(e.currentTarget.value)}
              placeholder="Enter phone number"
              class="bg-white"
            />
          </div>

          {/* Role Selection - User mode only */}
          <Show when={mode() === "user"}>
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-1">
                Role <span class="text-red-600">*</span>
              </label>
              <Select
                value={role()}
                onChange={(value) => value && setRole(value)}
                options={[
                  UserRole.ADMIN,
                  UserRole.TEACHER,
                  UserRole.VOLUNTEER,
                  UserRole.MEMBER,
                ]}
                placeholder="Select role"
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {itemProps.item.rawValue}
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
            </div>
          </Show>

          {/* Lead Source - Lead mode only */}
          <Show when={mode() === "lead"}>
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-1">
                Lead Source <span class="text-red-600">*</span>
              </label>
              <Select
                value={leadSource()}
                onChange={(value) => value && setLeadSource(value)}
                options={[
                  LeadSource.WALK_IN,
                  LeadSource.REFERRAL,
                  LeadSource.CAMPAIGN,
                  LeadSource.UNKNOWN,
                ]}
                placeholder="Select lead source"
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {itemProps.item.rawValue}
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
            </div>
          </Show>

          {/* Programs - For Members or Leads */}
          <Show
            when={
              (mode() === "user" && role() === UserRole.MEMBER) ||
              mode() === "lead"
            }
          >
            {/* Programs Done - Members only */}
            <Show when={mode() === "user" && role() === UserRole.MEMBER}>
              <div>
                <label class="block text-sm font-medium text-gray-900 mb-2">
                  Programs Done
                </label>
                <div class="flex flex-wrap gap-2">
                  <For each={PROGRAMS}>
                    {(program) => (
                      <button
                        type="button"
                        onClick={() => toggleProgram(program, "done")}
                        class={cn(
                          "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                          programsDone().includes(program)
                            ? "bg-sky-100 border-sky-300 text-sky-700"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        {program}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Programs Want To Do - Members and Leads */}
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                Programs Want To Do
              </label>
              <div class="flex flex-wrap gap-2">
                <For each={PROGRAMS}>
                  {(program) => (
                    <button
                      type="button"
                      onClick={() => toggleProgram(program, "want")}
                      class={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                        programsWant().includes(program)
                          ? "bg-green-100 border-green-300 text-green-700"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      {program}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Enable Login - User mode only */}
          <Show when={mode() === "user"}>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableLogin"
                checked={enableLogin()}
                onChange={(e) => setEnableLogin(e.currentTarget.checked)}
                class="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
              <label
                for="enableLogin"
                class="text-sm font-medium text-gray-900"
              >
                Enable Login
              </label>
            </div>
          </Show>

          {/* Notes - Lead mode only */}
          <Show when={mode() === "lead"}>
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-1">
                Notes
              </label>
              <textarea
                value={notes()}
                onInput={(e) => setNotes(e.currentTarget.value)}
                placeholder="Add any additional notes..."
                rows={3}
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </Show>

          {/* Profile Photo - User mode only */}
          <Show when={mode() === "user"}>
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-1">
                Profile Photo URL
              </label>
              <Input
                type="url"
                value={profilePhoto()}
                onInput={(e) => setProfilePhoto(e.currentTarget.value)}
                placeholder="https://example.com/photo.jpg"
                class="bg-white"
              />
            </div>
          </Show>
        </div>

        {/* Actions */}
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            class="bg-sky-600 hover:bg-sky-700 text-white"
          >
            Save {mode() === "user" ? "User" : "Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
