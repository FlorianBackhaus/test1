/**
 * n8n API client - restricted to safe operations only.
 * Deliberately excludes: activate/deactivate workflow, delete workflow, execute workflow.
 */

export interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags?: Array<{ id: string; name: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ id: string; name: string }>;
}

export interface N8nTag {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8nVariable {
  id: string;
  key: string;
  value: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8nCredential {
  id: string;
  name: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export class N8nClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: N8nConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const headers: Record<string, string> = {
      "X-N8N-API-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`n8n API ${method} ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  /** List all workflows (summary) */
  async listWorkflows(): Promise<{ data: WorkflowListItem[] }> {
    return this.request("GET", "/workflows");
  }

  /** Get a single workflow with full details (nodes, connections) */
  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request("GET", `/workflows/${encodeURIComponent(id)}`);
  }

  /** Create a new workflow (inactive by default) */
  async createWorkflow(workflow: {
    name: string;
    nodes: unknown[];
    connections: Record<string, unknown>;
    settings?: Record<string, unknown>;
  }): Promise<N8nWorkflow> {
    return this.request("POST", "/workflows", {
      ...workflow,
      active: false, // Always create as inactive
    });
  }

  /** Update an existing workflow. Cannot change active status. */
  async updateWorkflow(
    id: string,
    workflow: {
      name?: string;
      nodes?: unknown[];
      connections?: Record<string, unknown>;
      settings?: Record<string, unknown>;
    }
  ): Promise<N8nWorkflow> {
    // Strip out 'active' if someone tries to sneak it in
    const { ...safePayload } = workflow as Record<string, unknown>;
    delete safePayload.active;

    return this.request(
      "PUT",
      `/workflows/${encodeURIComponent(id)}`,
      safePayload
    );
  }

  /** List all tags */
  async listTags(): Promise<{ data: N8nTag[] }> {
    return this.request("GET", "/tags");
  }

  /** Get all available node types (useful for building workflows) */
  // Note: This endpoint may not be available in all n8n versions
  // In that case, we provide a static reference

  /** List executions for a workflow */
  async listExecutions(workflowId?: string): Promise<{ data: unknown[] }> {
    const query = workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : "";
    return this.request("GET", `/executions${query}`);
  }

  /** Get a single execution */
  async getExecution(id: string): Promise<unknown> {
    return this.request("GET", `/executions/${encodeURIComponent(id)}`);
  }

  /** Delete a single execution */
  async deleteExecution(id: string): Promise<void> {
    await this.request("DELETE", `/executions/${encodeURIComponent(id)}`);
  }

  /** List all credentials (sensitive data is redacted by n8n) */
  async listCredentials(): Promise<{ data: N8nCredential[] }> {
    return this.request("GET", "/credentials");
  }

  /** Get credential schema for a specific credential type */
  async getCredentialSchema(typeName: string): Promise<unknown> {
    return this.request("GET", `/credentials/schema/${encodeURIComponent(typeName)}`);
  }

  /** Create a new tag */
  async createTag(name: string): Promise<N8nTag> {
    return this.request("POST", "/tags", { name });
  }

  /** Update an existing tag */
  async updateTag(id: string, name: string): Promise<N8nTag> {
    return this.request("PUT", `/tags/${encodeURIComponent(id)}`, { name });
  }

  /** List all variables */
  async listVariables(): Promise<{ data: N8nVariable[] }> {
    return this.request("GET", "/variables");
  }

  /** Create a new variable */
  async createVariable(key: string, value: string): Promise<N8nVariable> {
    return this.request("POST", "/variables", { key, value });
  }

  /** Update an existing variable */
  async updateVariable(id: string, key: string, value: string): Promise<N8nVariable> {
    return this.request("PUT", `/variables/${encodeURIComponent(id)}`, { key, value });
  }

  // --- Templates ---

  /** Search workflow templates */
  async searchTemplates(query: string): Promise<unknown> {
    return this.request("GET", `/templates/search?search=${encodeURIComponent(query)}`);
  }

  /** Get a specific workflow template */
  async getTemplate(templateId: string): Promise<unknown> {
    return this.request("GET", `/templates/workflows/${encodeURIComponent(templateId)}`);
  }

  /** List template categories */
  async listTemplateCategories(): Promise<unknown> {
    return this.request("GET", "/templates/categories");
  }

  /** List template collections */
  async listTemplateCollections(): Promise<unknown> {
    return this.request("GET", "/templates/collections");
  }

  // --- Source Control ---

  /** Pull workflows from source control (git) */
  async sourceControlPull(force?: boolean): Promise<unknown> {
    return this.request("POST", "/source-control/pull", { force: force ?? false });
  }

  // --- Audit ---

  /** Run a security audit on the n8n instance */
  async runAudit(): Promise<unknown> {
    return this.request("POST", "/audit");
  }
}
