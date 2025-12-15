import { env } from "lua-cli";

export type EngagementType = "calls" | "emails" | "notes" | "tasks" | "meetings";

export type EngagementSummary = {
  type: EngagementType;
  count: number;
  items: Array<{
    id: string;
    createdAt?: string;
    subject?: string;
    body?: string;
    status?: string;
    direction?: string;
  }>;
};

export type ContactActivitySummaryResult = {
  ok: boolean;
  contactId?: string;
  contactName?: string;
  email?: string;
  summary?: {
    calls: EngagementSummary;
    emails: EngagementSummary;
    notes: EngagementSummary;
    tasks: EngagementSummary;
    meetings: EngagementSummary;
    totalEngagements: number;
    recentActivity: string;
  };
  error?: string;
};

async function getContactAssociations(
  contactId: string,
  engagementType: EngagementType,
  token: string,
  baseUrl: string
): Promise<string[]> {
  const url = `${baseUrl}/crm/v4/objects/contacts/${contactId}/associations/${engagementType}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) return [];

    const body = await res.json() as { results?: Array<{ toObjectId?: string }> };
    return (body.results ?? []).map((r) => r.toObjectId ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

async function getEngagementDetails(
  engagementType: EngagementType,
  engagementId: string,
  token: string,
  baseUrl: string
): Promise<Record<string, unknown> | null> {
  const properties = getPropertiesForType(engagementType);
  const url = `${baseUrl}/crm/v3/objects/${engagementType}/${engagementId}?properties=${properties.join(",")}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;

    return await res.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getPropertiesForType(type: EngagementType): string[] {
  switch (type) {
    case "calls":
      return ["hs_call_title", "hs_call_body", "hs_call_status", "hs_call_direction", "hs_createdate"];
    case "emails":
      return ["hs_email_subject", "hs_email_text", "hs_email_status", "hs_email_direction", "hs_createdate"];
    case "notes":
      return ["hs_note_body", "hs_createdate"];
    case "tasks":
      return ["hs_task_subject", "hs_task_body", "hs_task_status", "hs_createdate"];
    case "meetings":
      return ["hs_meeting_title", "hs_meeting_body", "hs_meeting_outcome", "hs_createdate"];
    default:
      return ["hs_createdate"];
  }
}

function extractEngagementInfo(
  type: EngagementType,
  data: Record<string, unknown>
): {
  id: string;
  createdAt?: string;
  subject?: string;
  body?: string;
  status?: string;
  direction?: string;
} {
  const props = (data.properties ?? {}) as Record<string, string>;
  const id = (data.id as string) ?? "";

  switch (type) {
    case "calls":
      return {
        id,
        createdAt: props.hs_createdate,
        subject: props.hs_call_title,
        body: props.hs_call_body,
        status: props.hs_call_status,
        direction: props.hs_call_direction,
      };
    case "emails":
      return {
        id,
        createdAt: props.hs_createdate,
        subject: props.hs_email_subject,
        body: props.hs_email_text,
        status: props.hs_email_status,
        direction: props.hs_email_direction,
      };
    case "notes":
      return {
        id,
        createdAt: props.hs_createdate,
        body: props.hs_note_body,
      };
    case "tasks":
      return {
        id,
        createdAt: props.hs_createdate,
        subject: props.hs_task_subject,
        body: props.hs_task_body,
        status: props.hs_task_status,
      };
    case "meetings":
      return {
        id,
        createdAt: props.hs_createdate,
        subject: props.hs_meeting_title,
        body: props.hs_meeting_body,
        status: props.hs_meeting_outcome,
      };
    default:
      return { id, createdAt: props.hs_createdate };
  }
}

export async function getContactActivitySummary(
  contactId: string
): Promise<ContactActivitySummaryResult> {
  const TOKEN = env("HUBSPOT_PRIVATE_APP_TOKEN");
  const HUBSPOT_BASE = (
    env("HUBSPOT_API_BASE_URL") || "https://api.hubapi.com"
  ).replace(/\/+$/, "");

  if (!TOKEN) {
    return {
      ok: false,
      error: "Missing HUBSPOT_PRIVATE_APP_TOKEN in environment.",
    };
  }

  if (!contactId) {
    return { ok: false, error: "Contact ID is required." };
  }

  try {
    const contactUrl = `${HUBSPOT_BASE}/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname`;
    const contactRes = await fetch(contactUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
    });

    if (!contactRes.ok) {
      const errorBody = await contactRes.json() as { message?: string };
      return {
        ok: false,
        error: errorBody?.message ?? "Contact not found",
      };
    }

    const contactData = await contactRes.json() as {
      id?: string;
      properties?: { email?: string; firstname?: string; lastname?: string };
    };

    const engagementTypes: EngagementType[] = ["calls", "emails", "notes", "tasks", "meetings"];
    const summaries: Record<EngagementType, EngagementSummary> = {
      calls: { type: "calls", count: 0, items: [] },
      emails: { type: "emails", count: 0, items: [] },
      notes: { type: "notes", count: 0, items: [] },
      tasks: { type: "tasks", count: 0, items: [] },
      meetings: { type: "meetings", count: 0, items: [] },
    };

    const allItems: Array<{ type: EngagementType; createdAt?: string }> = [];

    for (const engType of engagementTypes) {
      const associationIds = await getContactAssociations(
        contactId,
        engType,
        TOKEN,
        HUBSPOT_BASE
      );

      const recentIds = associationIds.slice(0, 5);

      for (const engId of recentIds) {
        const details = await getEngagementDetails(engType, engId, TOKEN, HUBSPOT_BASE);
        if (details) {
          const info = extractEngagementInfo(engType, details);
          summaries[engType].items.push(info);
          allItems.push({ type: engType, createdAt: info.createdAt });
        }
      }

      summaries[engType].count = associationIds.length;
    }

    allItems.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const totalEngagements =
      summaries.calls.count +
      summaries.emails.count +
      summaries.notes.count +
      summaries.tasks.count +
      summaries.meetings.count;

    const recentActivity = allItems[0]
      ? `Most recent: ${allItems[0].type} on ${allItems[0].createdAt ?? "unknown date"}`
      : "No recent activity found";

    const contactName = [
      contactData.properties?.firstname,
      contactData.properties?.lastname,
    ]
      .filter(Boolean)
      .join(" ") || "Unknown";

    return {
      ok: true,
      contactId: contactData.id,
      contactName,
      email: contactData.properties?.email,
      summary: {
        calls: summaries.calls,
        emails: summaries.emails,
        notes: summaries.notes,
        tasks: summaries.tasks,
        meetings: summaries.meetings,
        totalEngagements,
        recentActivity,
      },
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { ok: false, error: errorMessage };
  }
}

export async function searchContactByEmail(email: string): Promise<{
  ok: boolean;
  contactId?: string;
  contact?: Record<string, unknown>;
  error?: string;
}> {
  const TOKEN = env("HUBSPOT_PRIVATE_APP_TOKEN");
  const HUBSPOT_BASE = (
    env("HUBSPOT_API_BASE_URL") || "https://api.hubapi.com"
  ).replace(/\/+$/, "");

  if (!TOKEN) {
    return {
      ok: false,
      error: "Missing HUBSPOT_PRIVATE_APP_TOKEN in environment.",
    };
  }

  const url = `${HUBSPOT_BASE}/crm/v3/objects/contacts/search`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: email,
              },
            ],
          },
        ],
        properties: ["email", "firstname", "lastname", "phone", "company"],
      }),
    });

    const body = await res.json() as {
      results?: Array<{ id?: string; properties?: Record<string, string> }>;
      message?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        error: body?.message ?? JSON.stringify(body),
      };
    }

    if (body.results && body.results.length > 0) {
      return {
        ok: true,
        contactId: body.results[0].id,
        contact: body.results[0] as Record<string, unknown>,
      };
    }

    return {
      ok: true,
      contactId: undefined,
      contact: undefined,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { ok: false, error: errorMessage };
  }
}
