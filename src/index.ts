#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { N8nClient } from "./n8n-client.js";

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_BASE_URL || !N8N_API_KEY) {
  console.error("Error: N8N_BASE_URL and N8N_API_KEY environment variables are required.");
  console.error("Example: N8N_BASE_URL=https://your-instance.app.n8n.cloud N8N_API_KEY=...");
  process.exit(1);
}

const client = new N8nClient({ baseUrl: N8N_BASE_URL, apiKey: N8N_API_KEY });

const server = new McpServer({
  name: "n8n-workflow-manager",
  version: "1.0.0",
});

// --- Tools ---

server.tool(
  "list_workflows",
  "List all workflows in n8n (summary: id, name, active status, tags)",
  {},
  async () => {
    const result = await client.listWorkflows();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_workflow",
  "Get full details of a workflow including all nodes and connections",
  { workflowId: z.string().describe("The workflow ID") },
  async ({ workflowId }) => {
    const result = await client.getWorkflow(workflowId);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "create_workflow",
  "Create a new workflow (always created as INACTIVE - cannot be activated through this tool)",
  {
    name: z.string().describe("Name for the new workflow"),
    nodes: z
      .string()
      .describe("JSON string of the nodes array for the workflow"),
    connections: z
      .string()
      .describe("JSON string of the connections object for the workflow"),
    settings: z
      .string()
      .optional()
      .describe("Optional JSON string of workflow settings"),
  },
  async ({ name, nodes, connections, settings }) => {
    const result = await client.createWorkflow({
      name,
      nodes: JSON.parse(nodes),
      connections: JSON.parse(connections),
      settings: settings ? JSON.parse(settings) : undefined,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Workflow created (INACTIVE):\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "update_workflow",
  "Update an existing workflow's nodes, connections, name, or settings. Cannot change active/inactive status.",
  {
    workflowId: z.string().describe("The workflow ID to update"),
    name: z.string().optional().describe("New name for the workflow"),
    nodes: z
      .string()
      .optional()
      .describe("JSON string of the updated nodes array"),
    connections: z
      .string()
      .optional()
      .describe("JSON string of the updated connections object"),
    settings: z
      .string()
      .optional()
      .describe("Optional JSON string of updated workflow settings"),
  },
  async ({ workflowId, name, nodes, connections, settings }) => {
    const payload: Record<string, unknown> = {};
    if (name) payload.name = name;
    if (nodes) payload.nodes = JSON.parse(nodes);
    if (connections) payload.connections = JSON.parse(connections);
    if (settings) payload.settings = JSON.parse(settings);

    const result = await client.updateWorkflow(workflowId, payload);
    return {
      content: [
        {
          type: "text" as const,
          text: `Workflow updated:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "list_tags",
  "List all tags available in n8n",
  {},
  async () => {
    const result = await client.listTags();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "list_executions",
  "List recent executions, optionally filtered by workflow ID. Useful for debugging workflows.",
  {
    workflowId: z
      .string()
      .optional()
      .describe("Optional workflow ID to filter executions"),
  },
  async ({ workflowId }) => {
    const result = await client.listExecutions(workflowId);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_execution",
  "Get details of a specific execution including input/output data",
  { executionId: z.string().describe("The execution ID") },
  async ({ executionId }) => {
    const result = await client.getExecution(executionId);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("n8n MCP server running (stdio)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
