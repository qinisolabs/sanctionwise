// Single source of truth for sanctionwise's tools + a minimal, stateless JSON-RPC 2.0 handler.
import { screenName, getSanctionsEntry, datasetInfo, DISCLAIMER } from "./sanctions.js";

export type ArgType = "string" | "number";
export interface ToolArg {
  name: string;
  type: ArgType;
  description: string;
  optional?: boolean;
}
export interface ToolSpec {
  name: string;
  description: string;
  args: ToolArg[];
  run: (a: Record<string, unknown>) => unknown;
}

export const TOOLS: ToolSpec[] = [
  {
    name: "screen_name",
    description:
      "USE THIS to screen a person, company or vessel name against the UK Sanctions List before onboarding, paying, or transacting with them — never decide from memory whether someone is sanctioned. Returns ranked POSSIBLE matches with the official designation details (regime, type, sanctions imposed, statement-of-reasons snippet). CRITICAL: this is an INDICATIVE name-match only — a match MUST be verified by a human against the official entry and is NOT confirmation; a 'no match' is NOT a clearance (it covers the UK FCDO list only, screens the name string only, and reflects the dataset's report date). Not legal, compliance or KYC/AML advice.",
    args: [
      { name: "name", type: "string", description: "The person/company/vessel name to screen." },
      { name: "limit", type: "number", description: "Max matches to return (default 10).", optional: true },
    ],
    run: (a) => screenName(String(a.name ?? ""), a.limit === undefined ? 10 : Number(a.limit)),
  },
  {
    name: "get_sanctions_entry",
    description:
      "USE THIS to fetch the full official UK Sanctions List entry for a Unique ID (e.g. one returned by screen_name) — all names/aliases, regime, designation date, sanctions imposed, nationality/DOB, and the UK statement of reasons.",
    args: [{ name: "id", type: "string", description: "The UK Sanctions List Unique ID, e.g. 'RUS0001'." }],
    run: (a) => getSanctionsEntry(String(a.id ?? "")),
  },
];

export const SERVER_INFO = { name: "sanctionwise", version: "0.1.1" } as const;
export const PUBLIC_BASE = "https://qinisolabs.github.io/sanctionwise";
const DEFAULT_PROTOCOL = "2025-06-18";

function jsonType(t: ArgType) {
  return t === "number" ? { type: "number" } : { type: "string" };
}
function inputSchema(t: ToolSpec) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const a of t.args) {
    properties[a.name] = { ...jsonType(a.type), description: a.description };
    if (!a.optional) required.push(a.name);
  }
  return { type: "object", properties, required, additionalProperties: false };
}
export function listTools() {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: inputSchema(t) }));
}
export function callTool(name: string, args: Record<string, unknown> | undefined) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) {
    const e: any = new Error(`Unknown tool: ${name}`);
    e.code = -32602;
    throw e;
  }
  const a: Record<string, unknown> = {};
  for (const arg of t.args) {
    const v = args?.[arg.name];
    a[arg.name] = v === undefined || v === null ? undefined : arg.type === "number" ? Number(v) : String(v);
  }
  return { content: [{ type: "text", text: JSON.stringify(t.run(a), null, 2) }] };
}

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: string | number;
  method?: string;
  params?: any;
}

export function handleRpc(msg: JsonRpcMessage): object | null {
  const { id, method, params } = msg;
  if (id === undefined || method === "notifications/initialized") return null;
  try {
    let result: unknown;
    switch (method) {
      case "initialize": {
        const info = datasetInfo();
        result = {
          protocolVersion: params?.protocolVersion ?? DEFAULT_PROTOCOL,
          capabilities: { tools: {} },
          serverInfo: { ...SERVER_INFO, websiteUrl: PUBLIC_BASE },
          instructions:
            `sanctionwise screens names against the official FCDO UK Sanctions List (dataset '${info.kind}', report date ${info.version}, ${info.count} designated targets). Use screen_name to check a person/company/vessel name and get_sanctions_entry for a Unique ID's full record. ${DISCLAIMER}`,
        };
        break;
      }
      case "tools/list":
        result = { tools: listTools() };
        break;
      case "tools/call":
        result = callTool(params?.name, params?.arguments);
        break;
      case "ping":
        result = {};
        break;
      default:
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
    return { jsonrpc: "2.0", id, result };
  } catch (err: any) {
    return { jsonrpc: "2.0", id, error: { code: err?.code ?? -32603, message: err?.message ?? String(err) } };
  }
}
