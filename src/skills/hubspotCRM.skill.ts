import { LuaTool, LuaSkill } from "lua-cli";
import { z } from "zod";
import createContact from "./createContact";

const createContactInputSchema = z.object({
  email: z.string().email().optional().describe("Contact's email address (recommended for unique identification)"),
  firstname: z.string().optional().describe("Contact's first name"),
  lastname: z.string().optional().describe("Contact's last name"),
  phone: z.string().optional().describe("Contact's phone number"),
  company: z.string().optional().describe("Company name the contact is associated with"),
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

const hubspotCRM = new LuaSkill({
  name: "hubspotCRM",
  description: "HubSpot CRM integration skill for managing contacts",
  context: `
## HubSpot CRM Skill

This skill allows you to interact with HubSpot CRM to manage contacts.

### Available Tools

#### createContact
Creates a new contact in HubSpot CRM.

**When to use:**
- When a user asks to add a new contact to HubSpot
- When you need to save customer information to the CRM
- When onboarding new leads or customers

**Input Requirements:**
- At least one property must be provided (email, firstname, lastname, phone, or company)
- Email is strongly recommended as it serves as a unique identifier in HubSpot
- For best results, provide both firstname and lastname along with email

**Example prompts:**
- "Create a contact with email john@example.com and name John Doe"
- "Add a new lead: Jane Smith from Acme Corp, phone 555-1234"
- "Save this contact: bob@company.com, Bob Johnson"

**Response:**
- On success: Returns the new contact ID and saved properties
- On failure: Returns an error message explaining what went wrong

**Common Errors:**
- Missing API token: Ensure HUBSPOT_PRIVATE_APP_TOKEN is configured
- Duplicate email: HubSpot may reject contacts with existing email addresses
- Invalid email format: Email must be a valid email address format

### Best Practices
1. Always try to include an email address when creating contacts
2. Validate user input before creating contacts
3. Inform the user of the result (success with ID or failure with reason)
`.trim(),
  tools: [new CreateContactTool()],
});

export default hubspotCRM;
