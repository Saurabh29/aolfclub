import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { usersApi } from "~/lib/user-api";
import { PROGRAMS, type UserRole } from "~/schemas/user.schema";

/**
 * Add User Page (UM-2)
 * 
 * Form for creating new users with conditional fields:
 * - Basic fields: fullName, email, phone, role
 * - Conditional: If role = "Member", show programsDone[] + programsWant[]
 * - Conditional: If role = "Teacher" or "Volunteer", show programsWant[] only
 * - Enable Login toggle
 * - Profile Photo (placeholder for now)
 */

export default function AddUserPage() {
  const navigate = useNavigate();

  // ============================================================================
  // FORM STATE
  // ============================================================================

  const [fullName, setFullName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [role, setRole] = createSignal<UserRole>("Member");
  const [programsDone, setProgramsDone] = createSignal<string[]>([]);
  const [programsWant, setProgramsWant] = createSignal<string[]>([]);
  const [enableLogin, setEnableLogin] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);

  // ============================================================================
  // CONDITIONAL RENDERING HELPERS
  // ============================================================================

  const showProgramsDone = () => role() === "Member";
  const showProgramsWant = () => ["Member", "Teacher", "Volunteer"].includes(role());

  // ============================================================================
  // MULTI-SELECT HANDLERS
  // ============================================================================

  const toggleProgramDone = (program: string) => {
    const current = programsDone();
    if (current.includes(program)) {
      setProgramsDone(current.filter(p => p !== program));
    } else {
      setProgramsDone([...current, program]);
    }
  };

  const toggleProgramWant = (program: string) => {
    const current = programsWant();
    if (current.includes(program)) {
      setProgramsWant(current.filter(p => p !== program));
    } else {
      setProgramsWant([...current, program]);
    }
  };

  // ============================================================================
  // SUBMIT HANDLER
  // ============================================================================

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validation
      if (!fullName() || !email() || !phone()) {
        alert("Please fill in all required fields");
        setSubmitting(false);
        return;
      }

      // Create user
      const newUser = {
        fullName: fullName(),
        email: email(),
        phone: phone(),
        role: role() as Exclude<UserRole, "Lead">,
        programsDone: (role() === "Member" ? programsDone() : []) as typeof PROGRAMS[number][],
        programsWant: (showProgramsWant() ? programsWant() : []) as typeof PROGRAMS[number][],
        enableLogin: enableLogin(),
        profilePhoto: undefined,
      };

      await usersApi.create(newUser);
      
      // Success - navigate back
      navigate("/users");
    } catch (error) {
      console.error("Failed to create user:", error);
      alert("Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/users");
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 class="text-2xl font-bold text-gray-900">Add New User</h1>
          <p class="text-sm text-gray-600 mt-1">
            Create a new user, member, teacher, or volunteer
          </p>
        </div>
      </header>

      {/* Form */}
      <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Fill in the details below to create a new user account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} class="space-y-6">
              {/* Full Name */}
              <div class="space-y-2">
                <Label for="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName()}
                  onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setFullName(e.currentTarget.value)}
                  required
                />
              </div>

              {/* Email */}
              <div class="space-y-2">
                <Label for="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email()}
                  onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setEmail(e.currentTarget.value)}
                  required
                />
              </div>

              {/* Phone */}
              <div class="space-y-2">
                <Label for="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone()}
                  onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => setPhone(e.currentTarget.value)}
                  required
                />
              </div>

              {/* Role */}
              <div class="space-y-2">
                <Label for="role">Role *</Label>
                <Select
                  value={role()}
                  onChange={(value) => value && setRole(value as UserRole)}
                  options={["Admin", "Teacher", "Volunteer", "Member"]}
                  placeholder="Select a role"
                  itemComponent={(props) => (
                    <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                  )}
                >
                  <SelectTrigger>
                    <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>

              {/* Programs Done (Members only) */}
              <Show when={showProgramsDone()}>
                <div class="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Label class="text-sm font-semibold text-blue-900">
                    Programs Done
                  </Label>
                  <p class="text-xs text-blue-700">
                    Select all programs this member has completed
                  </p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PROGRAMS.map((program) => (
                      <div class="flex items-center space-x-2">
                        <Checkbox
                          id={`done-${program}`}
                          checked={programsDone().includes(program)}
                          onChange={() => toggleProgramDone(program)}
                        />
                        <label
                          for={`done-${program}`}
                          class="text-sm font-medium leading-none cursor-pointer"
                        >
                          {program}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </Show>

              {/* Programs Want To Do (Members, Teachers, Volunteers) */}
              <Show when={showProgramsWant()}>
                <div class="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Label class="text-sm font-semibold text-green-900">
                    Programs Want To Do
                  </Label>
                  <p class="text-xs text-green-700">
                    Select programs this person is interested in
                  </p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PROGRAMS.map((program) => (
                      <div class="flex items-center space-x-2">
                        <Checkbox
                          id={`want-${program}`}
                          checked={programsWant().includes(program)}
                          onChange={() => toggleProgramWant(program)}
                        />
                        <label
                          for={`want-${program}`}
                          class="text-sm font-medium leading-none cursor-pointer"
                        >
                          {program}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </Show>

              {/* Enable Login */}
              <div class="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="enableLogin"
                  checked={enableLogin()}
                  onChange={() => setEnableLogin(!enableLogin())}
                />
                <div class="space-y-1">
                  <label
                    for="enableLogin"
                    class="text-sm font-medium leading-none cursor-pointer"
                  >
                    Enable Login
                  </label>
                  <p class="text-xs text-gray-600">
                    Allow this user to access the system
                  </p>
                </div>
              </div>

              {/* Profile Photo (Placeholder) */}
              <div class="space-y-2">
                <Label for="photo">Profile Photo</Label>
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <Button type="button" variant="outline" size="sm">
                    Upload Photo
                  </Button>
                </div>
                <p class="text-xs text-gray-500">
                  Photo upload feature coming soon
                </p>
              </div>

              {/* Actions */}
              <div class="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={submitting()}
                  class="flex-1 sm:flex-none"
                >
                  {submitting() ? "Creating..." : "Create User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={submitting()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
