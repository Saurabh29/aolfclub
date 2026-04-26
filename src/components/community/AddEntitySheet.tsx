/**
 * AddEntitySheet  -  dialog form for adding a single Lead, Member, or Team member.
 *
 * Each entity type shows its own minimal required fields.
 * On success the sheet closes and calls onSuccess so the parent can revalidate.
 */
import { createSignal, Show, type Component } from "solid-js";
import { useAction, revalidate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  createLeadAction,
  createMemberAction,
  createTeamMemberAction,
  queryLeadsQuery,
  queryMembersQuery,
  getCommunityTeamQuery,
} from "~/server/api";

export type AddEntityType = "leads" | "members" | "team";

interface AddEntitySheetProps {
  open: boolean;
  entityType: AddEntityType;
  onClose: () => void;
}

const ENTITY_LABELS: Record<AddEntityType, string> = {
  leads: "Lead",
  members: "Member",
  team: "Team Member",
};

export const AddEntitySheet: Component<AddEntitySheetProps> = (props) => {
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Form fields
  const [displayName, setDisplayName] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [memberSince, setMemberSince] = createSignal("");

  const doCreateLead = useAction(createLeadAction);
  const doCreateMember = useAction(createMemberAction);
  const doCreateTeamMember = useAction(createTeamMemberAction);

  const resetForm = () => {
    setDisplayName("");
    setPhone("");
    setEmail("");
    setMemberSince("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (props.entityType === "leads") {
        await doCreateLead({
          displayName: displayName(),
          phone: phone(),
          email: email() || undefined,
        });
        await revalidate(queryLeadsQuery.key);
      } else if (props.entityType === "members") {
        await doCreateMember({
          displayName: displayName(),
          phone: phone(),
          email: email() || undefined,
          memberSince: memberSince() || undefined,
        });
        await revalidate(queryMembersQuery.key);
      } else {
        await doCreateTeamMember({
          displayName: displayName(),
          email: email(),
          phone: phone() || undefined,
        });
        await revalidate(getCommunityTeamQuery.key);
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const label = () => ENTITY_LABELS[props.entityType];

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {label()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          {/* Display Name - all entity types */}
          <TextField>
            <TextFieldLabel class="text-sm font-medium">Name *</TextFieldLabel>
            <TextFieldInput
              type="text"
              placeholder="Full name"
              value={displayName()}
              onInput={(e) => setDisplayName((e.currentTarget as HTMLInputElement).value)}
              required
            />
          </TextField>

          {/* Phone - leads and members */}
          <Show when={props.entityType !== "team"}>
            <TextField>
              <TextFieldLabel class="text-sm font-medium">Phone *</TextFieldLabel>
              <TextFieldInput
                type="tel"
                placeholder="+91 98765 43210"
                value={phone()}
                onInput={(e) => setPhone((e.currentTarget as HTMLInputElement).value)}
                required
              />
            </TextField>
          </Show>

          {/* Phone - team (optional) */}
          <Show when={props.entityType === "team"}>
            <TextField>
              <TextFieldLabel class="text-sm font-medium">Phone</TextFieldLabel>
              <TextFieldInput
                type="tel"
                placeholder="+91 98765 43210"
                value={phone()}
                onInput={(e) => setPhone((e.currentTarget as HTMLInputElement).value)}
              />
            </TextField>
          </Show>

          {/* Email - leads/members optional, team required */}
          <TextField>
            <TextFieldLabel class="text-sm font-medium">
              Email {props.entityType === "team" ? "*" : "(optional)"}
            </TextFieldLabel>
            <TextFieldInput
              type="email"
              placeholder="name@example.com"
              value={email()}
              onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
              required={props.entityType === "team"}
            />
          </TextField>

          {/* Member Since - members only */}
          <Show when={props.entityType === "members"}>
            <TextField>
              <TextFieldLabel class="text-sm font-medium">Member Since (optional)</TextFieldLabel>
              <TextFieldInput
                type="date"
                value={memberSince()}
                onInput={(e) => setMemberSince((e.currentTarget as HTMLInputElement).value)}
              />
            </TextField>
          </Show>

          {/* Error */}
          <Show when={error()}>
            <p class="text-sm text-destructive">{error()}</p>
          </Show>

          <DialogFooter class="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving()}>
              {saving() ? "Saving…" : `Add ${label()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
