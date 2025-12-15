import { LuaTool, env } from "lua-cli";
import { z } from "zod";

const inputSchema = z.object({
  contactId: z.string().describe("HubSpot Contact ID to update"),
  email: z.string().email().optional().describe("New email address"),
  firstname: z.string().optional().describe("New first name"),
  lastname: z.string().optional().describe("New last name"),
  phone: z.string().optional().describe("New phone number"),
  company: z.string().optional().describe("New company name"),
});

export default class UpdateContactTool implements LuaTool {
  name = "updateContact";
  description = "Updates an existing contact's properties in HubSpot CRM";
  inputSchema = inputSchema;

  async execute(input: z.infer<typeof inputSchema>) {
    const parsed = inputSchema.parse(input);

    const TOKEN = env("HUBSPOT_PRIVATE_APP_TOKEN");
    const HUBSPOT_BASE = (env("HUBSPOT_API_BASE_URL") || "https://api.hubapi.com").replace(/\/+$/, "");

    if (!TOKEN) {
      return { ok: false, error: "Missing HUBSPOT_PRIVATE_APP_TOKEN in environment." };
    }

    if (!parsed.contactId) {
      return { ok: false, error: "Contact ID is required." };
    }

    const properties: Record<string, string> = {};
    if (parsed.email) properties.email = parsed.email;
    if (parsed.firstname) properties.firstname = parsed.firstname;
    if (parsed.lastname) properties.lastname = parsed.lastname;
    if (parsed.phone) properties.phone = parsed.phone;
    if (parsed.company) properties.company = parsed.company;

    if (Object.keys(properties).length === 0) {
      return { ok: false, error: "No properties to update provided." };
    }

    const url = `${HUBSPOT_BASE}/crm/v3/objects/contacts/${parsed.contactId}`;

    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ properties }),
      });

      const body = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: (body as { message?: string })?.message ?? JSON.stringify(body),
        };
      }

      const responseBody = body as { id?: string; properties?: Record<string, string> };
      return {
        ok: true,
        id: responseBody?.id,
        properties: responseBody?.properties ?? {},
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { ok: false, error: errorMessage };
    }
  }
}
