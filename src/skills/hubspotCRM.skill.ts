import { LuaTool, LuaSkill } from "lua-cli";
import { z } from "zod";
import createContact, { updateContact } from "./createContact";
import { updateDealStage, getDealPipelines, getDealById } from "./deals";
import { getContactActivitySummary, searchContactByEmail } from "./engagements";

export const createContactInputSchema = z.object({
  email: z.string().email().optional().describe("Contact's email address (recommended for unique identification)"),
  firstname: z.string().optional().describe("Contact's first name"),
  lastname: z.string().optional().describe("Contact's last name"),
  phone: z.string().optional().describe("Contact's phone number"),
  company: z.string().optional().describe("Company name the contact is associated with"),
});

export const createContactFromChatInputSchema = z.object({
  email: z.string().email().describe("Email address extracted from chat conversation"),
  firstname: z.string().optional().describe("First name mentioned in chat"),
  lastname: z.string().optional().describe("Last name mentioned in chat"),
  phone: z.string().optional().describe("Phone number if provided in chat"),
  company: z.string().optional().describe("Company name if mentioned in chat"),
  chatSummary: z.string().optional().describe("Brief summary of the chat conversation for context"),
});

export const updateDealStageInputSchema = z.object({
  dealId: z.string().describe("The HubSpot Deal ID to update"),
  dealstage: z.string().describe("The new deal stage ID (e.g., 'qualifiedtobuy', 'closedwon', or numeric ID like '139921')"),
  notes: z.string().optional().describe("Optional notes about why the stage was updated"),
});

export const getDealPipelinesInputSchema = z.object({});

export const getContactActivitySummaryInputSchema = z.object({
  contactId: z.string().optional().describe("HubSpot Contact ID to get activity for"),
  email: z.string().email().optional().describe("Email address to search for contact (alternative to contactId)"),
});

export const updateContactInputSchema = z.object({
  contactId: z.string().describe("HubSpot Contact ID to update"),
  email: z.string().email().optional().describe("New email address"),
  firstname: z.string().optional().describe("New first name"),
  lastname: z.string().optional().describe("New last name"),
  phone: z.string().optional().describe("New phone number"),
  company: z.string().optional().describe("New company name"),
});

class CreateContactTool implements LuaTool {
  name = "createContact";
  description = "Creates a new contact in HubSpot CRM with the provided properties";

  inputSchema = createContactInputSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    return await createContact(parsed);
  }
}

class CreateContactFromChatTool implements LuaTool {
  name = "createContactFromChat";
  description = "Creates a HubSpot contact from information gathered during an inbound chat conversation";

  inputSchema = createContactFromChatInputSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    
    const existingContact = await searchContactByEmail(parsed.email);
    if (existingContact.ok && existingContact.contactId) {
      return {
        ok: true,
        alreadyExists: true,
        contactId: existingContact.contactId,
        message: `Contact with email ${parsed.email} already exists in HubSpot`,
        contact: existingContact.contact,
      };
    }

    const result = await createContact({
      email: parsed.email,
      firstname: parsed.firstname,
      lastname: parsed.lastname,
      phone: parsed.phone,
      company: parsed.company,
    });

    if (result.ok) {
      return {
        ...result,
        alreadyExists: false,
        message: `Successfully created new contact from chat: ${parsed.email}`,
        chatSummary: parsed.chatSummary,
      };
    }

    return result;
  }
}

class UpdateContactTool implements LuaTool {
  name = "updateContact";
  description = "Updates an existing contact's properties in HubSpot CRM";

  inputSchema = updateContactInputSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    return await updateContact(parsed);
  }
}

class UpdateDealStageTool implements LuaTool {
  name = "updateDealStage";
  description = "Updates the stage of an existing deal in HubSpot CRM, typically after a sales call or meeting";

  inputSchema = updateDealStageInputSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    
    const currentDeal = await getDealById(parsed.dealId);
    if (!currentDeal.ok) {
      return {
        ok: false,
        error: `Could not find deal with ID ${parsed.dealId}: ${currentDeal.error}`,
      };
    }

    const result = await updateDealStage({
      dealId: parsed.dealId,
      dealstage: parsed.dealstage,
      notes: parsed.notes,
    });

    if (result.ok) {
      return {
        ...result,
        message: `Successfully updated deal stage to '${parsed.dealstage}'`,
        previousDeal: currentDeal.deal,
      };
    }

    return result;
  }
}

class GetDealPipelinesTool implements LuaTool {
  name = "getDealPipelines";
  description = "Retrieves all deal pipelines and their stages from HubSpot to help identify valid stage IDs";

  inputSchema = getDealPipelinesInputSchema;

  async execute() {
    return await getDealPipelines();
  }
}

class GetContactActivitySummaryTool implements LuaTool {
  name = "getContactActivitySummary";
  description = "Summarizes a contact's recent marketing and sales activity including calls, emails, notes, tasks, and meetings";

  inputSchema = getContactActivitySummaryInputSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    
    let contactId = parsed.contactId;

    if (!contactId && parsed.email) {
      const searchResult = await searchContactByEmail(parsed.email);
      if (!searchResult.ok) {
        return {
          ok: false,
          error: `Failed to search for contact: ${searchResult.error}`,
        };
      }
      if (!searchResult.contactId) {
        return {
          ok: false,
          error: `No contact found with email ${parsed.email}`,
        };
      }
      contactId = searchResult.contactId;
    }

    if (!contactId) {
      return {
        ok: false,
        error: "Either contactId or email must be provided",
      };
    }

    const result = await getContactActivitySummary(contactId);

    if (result.ok && result.summary) {
      const summaryText = generateActivitySummaryText(result);
      return {
        ...result,
        summaryText,
      };
    }

    return result;
  }
}

function generateActivitySummaryText(result: {
  contactName?: string;
  email?: string;
  summary?: {
    calls: { count: number; items: Array<{ subject?: string; createdAt?: string }> };
    emails: { count: number; items: Array<{ subject?: string; createdAt?: string }> };
    notes: { count: number; items: Array<{ body?: string; createdAt?: string }> };
    tasks: { count: number; items: Array<{ subject?: string; status?: string }> };
    meetings: { count: number; items: Array<{ subject?: string; createdAt?: string }> };
    totalEngagements: number;
    recentActivity: string;
  };
}): string {
  const { contactName, email, summary } = result;
  if (!summary) return "No activity summary available";

  const lines: string[] = [];
  lines.push(`## Activity Summary for ${contactName || "Unknown"} (${email || "no email"})`);
  lines.push("");
  lines.push(`**Total Engagements:** ${summary.totalEngagements}`);
  lines.push(`**${summary.recentActivity}**`);
  lines.push("");

  if (summary.calls.count > 0) {
    lines.push(`### Calls (${summary.calls.count} total)`);
    summary.calls.items.slice(0, 3).forEach((call) => {
      lines.push(`- ${call.subject || "Call"} (${call.createdAt || "unknown date"})`);
    });
    lines.push("");
  }

  if (summary.emails.count > 0) {
    lines.push(`### Emails (${summary.emails.count} total)`);
    summary.emails.items.slice(0, 3).forEach((email) => {
      lines.push(`- ${email.subject || "Email"} (${email.createdAt || "unknown date"})`);
    });
    lines.push("");
  }

  if (summary.meetings.count > 0) {
    lines.push(`### Meetings (${summary.meetings.count} total)`);
    summary.meetings.items.slice(0, 3).forEach((meeting) => {
      lines.push(`- ${meeting.subject || "Meeting"} (${meeting.createdAt || "unknown date"})`);
    });
    lines.push("");
  }

  if (summary.tasks.count > 0) {
    lines.push(`### Tasks (${summary.tasks.count} total)`);
    summary.tasks.items.slice(0, 3).forEach((task) => {
      lines.push(`- ${task.subject || "Task"} - ${task.status || "unknown status"}`);
    });
    lines.push("");
  }

  if (summary.notes.count > 0) {
    lines.push(`### Notes (${summary.notes.count} total)`);
    summary.notes.items.slice(0, 2).forEach((note) => {
      const preview = note.body?.substring(0, 100) || "No content";
      lines.push(`- ${preview}${note.body && note.body.length > 100 ? "..." : ""}`);
    });
  }

  return lines.join("\n");
}

const hubspotCRM = new LuaSkill({
  name: "hubspotCRM",
  description: "HubSpot CRM integration skill for managing contacts, deals, and activity tracking",
  context: `
## HubSpot CRM Skill

This skill provides comprehensive HubSpot CRM integration for managing contacts, deals, and tracking sales/marketing activity.

### Available Tools

---

#### 1. createContact
Creates a new contact in HubSpot CRM.

**When to use:**
- When a user explicitly asks to add a new contact to HubSpot
- When you need to save customer information to the CRM
- For manual contact creation with known details

**Input Requirements:**
- At least one property must be provided (email, firstname, lastname, phone, or company)
- Email is strongly recommended as it serves as a unique identifier

**Example prompts:**
- "Create a contact with email john@example.com and name John Doe"
- "Add a new lead: Jane Smith from Acme Corp"

---

#### 2. createContactFromChat
Converts inbound chat conversations into HubSpot contacts. Automatically checks for existing contacts before creating.

**When to use:**
- After collecting contact information during a chat conversation
- When a visitor provides their email and wants to be added to your CRM
- To capture leads from chat interactions

**Best Practice:**
- Gather at minimum the email address during chat
- Include a brief chat summary for context
- The tool will check if contact exists before creating a duplicate

**Example prompts:**
- "Add this chat visitor to HubSpot: their email is sarah@company.com"
- "Create a contact from our chat - they mentioned they work at TechCorp"

---

#### 3. updateContact
Updates an existing contact's properties in HubSpot CRM.

**When to use:**
- When contact information needs to be corrected or updated
- After learning new details about a contact (new phone, company change, etc.)
- To modify any contact field (email, name, phone, company)

**Input Requirements:**
- Contact ID is required (can be found via search or previous API calls)
- At least one property to update must be provided

**Example prompts:**
- "Update contact 12345 with new phone number 555-1234"
- "Change the company for contact ID 67890 to Acme Corp"
- "Update John's contact to reflect his new email john.new@company.com"

---

#### 4. updateDealStage
Updates the pipeline stage of an existing deal after sales activities like calls or meetings.

**When to use:**
- After a sales call to reflect deal progression
- When moving deals through the pipeline (e.g., "Qualified" → "Contract Sent")
- To update deal status based on meeting outcomes

**Prerequisites:**
- You need the Deal ID (can be found in HubSpot URL or via search)
- You need the target stage ID (use getDealPipelines to find valid stage IDs)

**Common Stage IDs (default pipeline):**
- "qualifiedtobuy" - Qualified to Buy
- "presentationscheduled" - Presentation Scheduled
- "decisionmakerboughtin" - Decision Maker Bought-In
- "contractsent" - Contract Sent
- "closedwon" - Closed Won
- "closedlost" - Closed Lost

**Example prompts:**
- "Update deal 12345 to closedwon after today's call"
- "Move deal 67890 to contract sent stage"
- "Mark the deal as qualified after the discovery call"

---

#### 5. getDealPipelines
Retrieves all deal pipelines and their stages to help identify valid stage IDs.

**When to use:**
- Before updating a deal stage to find the correct stage ID
- When user asks about available deal stages
- To understand the sales pipeline structure

**Example prompts:**
- "What deal stages are available?"
- "Show me the sales pipeline stages"

---

#### 6. getContactActivitySummary
Provides a comprehensive summary of a contact's recent marketing and sales engagements.

**When to use:**
- Before a sales call to prepare with contact history
- To understand a contact's engagement level
- When asked about a contact's activity or interaction history
- For account research and relationship context

**What it includes:**
- Recent calls, emails, notes, tasks, and meetings
- Total engagement count across all types
- Most recent activity timestamp
- Contact details (name, email)

**Example prompts:**
- "What's the activity history for john@company.com?"
- "Summarize recent interactions with contact ID 12345"
- "Show me the engagement summary before my call with Sarah"
- "How engaged is this lead?"

---

### Error Handling

**Common Errors:**
- "Missing HUBSPOT_PRIVATE_APP_TOKEN" - Ensure the API token is configured
- "Contact not found" - Verify the contact ID or email exists
- "Deal not found" - Check that the deal ID is correct
- "Invalid deal stage" - Use getDealPipelines to find valid stage IDs

### Required HubSpot Scopes
Ensure your HubSpot Private App has these scopes:
- crm.objects.contacts.read
- crm.objects.contacts.write
- crm.objects.deals.read
- crm.objects.deals.write
- crm.schemas.deals.read
`.trim(),
  tools: [
    new CreateContactTool(),
    new CreateContactFromChatTool(),
    new UpdateContactTool(),
    new UpdateDealStageTool(),
    new GetDealPipelinesTool(),
    new GetContactActivitySummaryTool(),
  ],
});

export default hubspotCRM;
