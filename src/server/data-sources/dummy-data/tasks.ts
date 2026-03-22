import { ulid } from "ulid";
import type { Task } from "~/lib/schemas/domain";

/**
 * Generate dummy tasks for testing
 */
export function generateDummyTasks(count: number = 10): Task[] {
  const tasks: Task[] = [];
  
  const taskNames = [
    "February Follow-ups - Delhi Region",
    "New Member Enrollment Drive",
    "Teacher Training Prospects",
    "Overdue Follow-up Campaign",
    "High Interest Lead Conversion",
    "Member Retention Check-ins",
    "Advanced Yoga Program Promotion",
    "Wellness Workshop Invitations",
  ];
  
  const objectives = [
    "Call leads interested in Advanced Yoga and schedule demos",
    "Follow up with members who haven't attended in 30 days",
    "Convert high-interest leads to Teacher Training program",
    "Re-engage leads with overdue follow-ups",
    "Promote new Holistic Wellness program",
  ];
  
  for (let i = 0; i < count; i++) {
    const createdDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
    const deadline = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    // Random number of matched leads and agents
    const matchedLeadCount = Math.floor(Math.random() * 200) + 50;
    const agentCount = Math.floor(matchedLeadCount / 40); // ~40 leads per agent
    
    // matchedContactIds built below after targetUserType is set
    const selectedAgentIds = Array.from({ length: agentCount }, () => ulid());
    
    const assignmentModes: Task["assignmentMode"][] = ["PreAssigned", "LeadPool", "Hybrid"];
    const assignmentMode = assignmentModes[i % assignmentModes.length];
    
    const statuses: Task["status"][] = ["Draft", "Active", "Active", "Active", "Completed", "Paused"];
    const status = statuses[i % statuses.length];
    
    // Alternate between LEAD and MEMBER tasks
    const targetUserType: Task["targetUserType"] = i % 2 === 0 ? "LEAD" : "MEMBER";

    // Simple example filter (JSON stringified QuerySpec)
    const filterSpec = JSON.stringify({
      filters: [
        { field: "userType", op: "eq", value: targetUserType },
        { field: "lastInterestLevel", op: "eq", value: "High" },
      ],
      sorting: [{ field: "nextFollowUpDate", direction: "asc" }],
      pagination: { pageSize: 1000, pageIndex: 0 },
    });

    const matchedContactIds = Array.from({ length: matchedLeadCount }, () => ulid());

    // Generate assignments based on mode
    const assignments =
      assignmentMode === "PreAssigned"
        ? selectedAgentIds.map((agentId, idx) => ({
            agentId,
            contactIds: matchedContactIds.slice(
              idx * Math.floor(matchedLeadCount / agentCount),
              (idx + 1) * Math.floor(matchedLeadCount / agentCount)
            ),
            assignedAt: createdDate.toISOString(),
          }))
        : [];

    const contactPoolIds =
      assignmentMode === "LeadPool"
        ? matchedContactIds
        : assignmentMode === "Hybrid"
        ? matchedContactIds.slice(Math.floor(matchedLeadCount / 2))
        : [];

    tasks.push({
      id: ulid(),
      name: taskNames[i % taskNames.length],
      objective: objectives[i % objectives.length],
      deadline: deadline.toISOString(),
      targetCallsPerAgent: 40,
      targetUserType,
      contactFilterSpec: filterSpec,
      matchedContactIds,
      selectedAgentIds,
      assignmentMode,
      assignments,
      maxLeadsPerAgent: assignmentMode !== "PreAssigned" ? 50 : undefined,
      contactPoolIds,
      status,
      createdBy: ulid(), // Admin user
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
    });
  }
  
  return tasks;
}
