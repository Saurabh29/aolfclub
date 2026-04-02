import type { Lead } from "~/lib/schemas/domain";

/**
 * Lead status types for volunteer workflow
 */
export type LeadStatus = "not_started" | "scheduled" | "overdue" | "completed";

/**
 * Determine lead status based on call history and follow-up date
 */
export function getLeadStatus(lead: Lead): LeadStatus {
  // Marked as not interested = completed
  if (lead.lastInterestLevel === "Not_Interested") {
    return "completed";
  }

  // No follow-up and never called = not started
  if (!lead.nextFollowUpDate && !lead.lastCallDate) {
    return "not_started";
  }

  // No follow-up but has been called = completed
  if (!lead.nextFollowUpDate && lead.lastCallDate) {
    return "completed";
  }

  // Has follow-up date
  if (lead.nextFollowUpDate) {
    const followUpDate = new Date(lead.nextFollowUpDate);
    const now = new Date();
    
    if (followUpDate < now) {
      return "overdue";
    } else {
      return "scheduled";
    }
  }

  return "not_started";
}

/**
 * Check if lead is overdue
 */
export function isLeadOverdue(lead: Lead): boolean {
  if (!lead.nextFollowUpDate) return false;
  return new Date(lead.nextFollowUpDate) < new Date();
}

/**
 * Check if lead is due today
 */
export function isLeadDueToday(lead: Lead): boolean {
  if (!lead.nextFollowUpDate) return false;
  
  const followUp = new Date(lead.nextFollowUpDate);
  const today = new Date();
  
  return (
    followUp.getFullYear() === today.getFullYear() &&
    followUp.getMonth() === today.getMonth() &&
    followUp.getDate() === today.getDate()
  );
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format follow-up date/time
 */
export function formatFollowUpDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow, ${timeStr}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

/**
 * Calculate completion percentage for a set of leads
 */
export function calculateCompletionRate(leads: Lead[]): {
  total: number;
  completed: number;
  scheduled: number;
  overdue: number;
  notStarted: number;
  percentage: number;
} {
  const total = leads.length;
  let completed = 0;
  let scheduled = 0;
  let overdue = 0;
  let notStarted = 0;

  leads.forEach((lead) => {
    const status = getLeadStatus(lead);
    switch (status) {
      case "completed":
        completed++;
        break;
      case "scheduled":
        scheduled++;
        break;
      case "overdue":
        overdue++;
        break;
      case "not_started":
        notStarted++;
        break;
    }
  });

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    scheduled,
    overdue,
    notStarted,
    percentage,
  };
}

/**
 * Get progress bar color based on completion percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage === 100) return "bg-green-500";
  if (percentage >= 67) return "bg-blue-500";
  if (percentage >= 34) return "bg-amber-500";
  return "bg-red-500";
}
