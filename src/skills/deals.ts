import { env } from "lua-cli";

export type UpdateDealStageInput = {
  dealId: string;
  dealstage: string;
  notes?: string;
};

export type UpdateDealStageResult = {
  ok: boolean;
  id?: string;
  properties?: Record<string, string>;
  error?: string;
  status?: number;
};

export type GetPipelinesResult = {
  ok: boolean;
  pipelines?: Array<{
    id: string;
    label: string;
    stages: Array<{
      id: string;
      label: string;
      displayOrder: number;
    }>;
  }>;
  error?: string;
};

export async function updateDealStage(
  input: UpdateDealStageInput
): Promise<UpdateDealStageResult> {
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

  if (!input.dealId) {
    return { ok: false, error: "Deal ID is required." };
  }

  if (!input.dealstage) {
    return { ok: false, error: "Deal stage is required." };
  }

  const url = `${HUBSPOT_BASE}/crm/v3/objects/deals/${input.dealId}`;

  const properties: Record<string, string> = {
    dealstage: input.dealstage,
  };

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

export async function getDealPipelines(): Promise<GetPipelinesResult> {
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

  const url = `${HUBSPOT_BASE}/crm/v3/pipelines/deals`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
    });

    const body = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: (body as { message?: string })?.message ?? JSON.stringify(body),
      };
    }

    const responseBody = body as {
      results?: Array<{
        id: string;
        label: string;
        stages: Array<{
          id: string;
          label: string;
          displayOrder: number;
        }>;
      }>;
    };

    return {
      ok: true,
      pipelines: responseBody?.results ?? [],
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { ok: false, error: errorMessage };
  }
}

export async function getDealById(dealId: string): Promise<{
  ok: boolean;
  deal?: Record<string, unknown>;
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

  const url = `${HUBSPOT_BASE}/crm/v3/objects/deals/${dealId}?properties=dealname,dealstage,amount,closedate,pipeline`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
    });

    const body = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: (body as { message?: string })?.message ?? JSON.stringify(body),
      };
    }

    return {
      ok: true,
      deal: body as Record<string, unknown>,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { ok: false, error: errorMessage };
  }
}
