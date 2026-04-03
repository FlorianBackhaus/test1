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

server.tool(
  "search_workflows",
  "Search workflows by name (case-insensitive substring match)",
  {
    query: z.string().describe("Search string to match against workflow names"),
  },
  async ({ query }) => {
    const result = await client.listWorkflows();
    const lower = query.toLowerCase();
    const matches = result.data.filter((w) =>
      w.name.toLowerCase().includes(lower)
    );
    return {
      content: [
        {
          type: "text" as const,
          text:
            matches.length === 0
              ? `No workflows found matching "${query}"`
              : JSON.stringify(matches, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "duplicate_workflow",
  "Duplicate an existing workflow with a new name (created as INACTIVE)",
  {
    workflowId: z.string().describe("The workflow ID to duplicate"),
    newName: z.string().describe("Name for the duplicated workflow"),
  },
  async ({ workflowId, newName }) => {
    const original = await client.getWorkflow(workflowId);
    const copy = await client.createWorkflow({
      name: newName,
      nodes: original.nodes,
      connections: original.connections as Record<string, unknown>,
      settings: original.settings,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Workflow "${original.name}" duplicated as "${newName}" (INACTIVE):\n${JSON.stringify(copy, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "list_credentials",
  "List all credentials available in n8n (sensitive data is redacted). Useful to find credential IDs for workflow nodes.",
  {},
  async () => {
    const result = await client.listCredentials();
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
  "get_credential_schema",
  "Get the schema/fields for a credential type (e.g. 'slackApi', 'httpBasicAuth'). Useful to understand what fields a credential type requires.",
  {
    typeName: z
      .string()
      .describe(
        "The credential type name (e.g. 'slackApi', 'gmailOAuth2Api', 'httpBasicAuth')"
      ),
  },
  async ({ typeName }) => {
    const result = await client.getCredentialSchema(typeName);
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
  "create_tag",
  "Create a new tag for organizing workflows",
  {
    name: z.string().describe("Name for the new tag"),
  },
  async ({ name }) => {
    const result = await client.createTag(name);
    return {
      content: [
        {
          type: "text" as const,
          text: `Tag created:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "update_tag",
  "Rename an existing tag",
  {
    tagId: z.string().describe("The tag ID to update"),
    name: z.string().describe("New name for the tag"),
  },
  async ({ tagId, name }) => {
    const result = await client.updateTag(tagId, name);
    return {
      content: [
        {
          type: "text" as const,
          text: `Tag updated:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "delete_execution",
  "Delete a finished execution from the history (useful for cleanup)",
  {
    executionId: z.string().describe("The execution ID to delete"),
  },
  async ({ executionId }) => {
    await client.deleteExecution(executionId);
    return {
      content: [
        {
          type: "text" as const,
          text: `Execution ${executionId} deleted.`,
        },
      ],
    };
  }
);

server.tool(
  "list_variables",
  "List all environment variables configured in n8n. Variables can be referenced in workflows using $vars.",
  {},
  async () => {
    const result = await client.listVariables();
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
  "create_variable",
  "Create a new environment variable in n8n (accessible in workflows via $vars.key)",
  {
    key: z.string().describe("Variable key/name"),
    value: z.string().describe("Variable value"),
  },
  async ({ key, value }) => {
    const result = await client.createVariable(key, value);
    return {
      content: [
        {
          type: "text" as const,
          text: `Variable created:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  "update_variable",
  "Update an existing environment variable in n8n",
  {
    variableId: z.string().describe("The variable ID to update"),
    key: z.string().describe("Variable key/name"),
    value: z.string().describe("New variable value"),
  },
  async ({ variableId, key, value }) => {
    const result = await client.updateVariable(variableId, key, value);
    return {
      content: [
        {
          type: "text" as const,
          text: `Variable updated:\n${JSON.stringify(result, null, 2)}`,
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
