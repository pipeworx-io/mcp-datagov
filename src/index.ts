interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Data.gov MCP — wraps Data.gov CKAN API (catalog.data.gov/api/3)
 *
 * Free, no authentication required. Search and browse U.S. government open datasets.
 *
 * Tools:
 * - search_datasets: search for datasets by keyword, organization, or tags
 * - get_dataset: get full metadata for a specific dataset by ID
 * - list_organizations: list all organizations publishing on Data.gov
 */


const BASE_URL = 'https://catalog.data.gov/api/3';

async function ckanGet(action: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}/action/${action}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Data.gov API error: ${res.status}`);

  const data = (await res.json()) as { success: boolean; result: unknown; error?: { message: string } };
  if (!data.success) {
    throw new Error(`Data.gov API error: ${(data.error as { message: string })?.message ?? 'Unknown error'}`);
  }
  return data.result;
}

const tools: McpToolExport['tools'] = [
  {
    name: 'search_datasets',
    description:
      'Search U.S. government open datasets on Data.gov by keyword. Returns titles, descriptions, organizations, formats, and download URLs. Example: search_datasets("climate change", organization: "noaa-gov").',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keywords (e.g., "climate change", "census population")',
        },
        organization: {
          type: 'string',
          description: 'Filter by organization slug (e.g., "noaa-gov", "epa-gov", "nasa-gov")',
        },
        tags: {
          type: 'string',
          description: 'Filter by tag (e.g., "health", "environment")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_dataset',
    description:
      'Get full metadata for a specific Data.gov dataset by its ID or name. Returns title, description, resources (download links), organization, tags, and update frequency.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Dataset ID or name slug from Data.gov',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_organizations',
    description:
      'List all organizations publishing datasets on Data.gov. Returns organization names and dataset counts. Useful for discovering data publishers.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_datasets':
      return searchDatasets(
        args.query as string,
        args.organization as string | undefined,
        args.tags as string | undefined,
      );
    case 'get_dataset':
      return getDataset(args.id as string);
    case 'list_organizations':
      return listOrganizations();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function searchDatasets(query: string, organization?: string, tags?: string) {
  const params: Record<string, string> = {
    q: query,
    rows: '20',
  };

  const fq: string[] = [];
  if (organization) fq.push(`organization:${organization}`);
  if (tags) fq.push(`tags:${tags}`);
  if (fq.length > 0) params['fq'] = fq.join(' AND ');

  const result = (await ckanGet('package_search', params)) as {
    count: number;
    results: Array<{
      id: string;
      name: string;
      title: string;
      notes: string;
      organization?: { title: string; name: string };
      resources?: Array<{ format: string; url: string; name: string }>;
      metadata_modified: string;
    }>;
  };

  return {
    total_count: result.count,
    datasets: result.results.map((d) => ({
      id: d.id,
      name: d.name,
      title: d.title,
      description: (d.notes ?? '').slice(0, 300),
      organization: d.organization?.title ?? null,
      formats: [...new Set((d.resources ?? []).map((r) => r.format).filter(Boolean))],
      modified: d.metadata_modified,
    })),
  };
}

async function getDataset(id: string) {
  const result = (await ckanGet('package_show', { id })) as {
    id: string;
    name: string;
    title: string;
    notes: string;
    organization?: { title: string; name: string };
    tags?: Array<{ name: string }>;
    resources?: Array<{
      id: string;
      name: string;
      format: string;
      url: string;
      description: string;
    }>;
    metadata_modified: string;
    metadata_created: string;
  };

  return {
    id: result.id,
    name: result.name,
    title: result.title,
    description: result.notes ?? null,
    organization: result.organization?.title ?? null,
    tags: (result.tags ?? []).map((t) => t.name),
    resources: (result.resources ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      format: r.format,
      url: r.url,
      description: (r.description ?? '').slice(0, 200),
    })),
    created: result.metadata_created,
    modified: result.metadata_modified,
  };
}

async function listOrganizations() {
  const result = (await ckanGet('organization_list', {
    all_fields: 'true',
    include_dataset_count: 'true',
    sort: 'package_count desc',
    limit: '50',
  })) as Array<{
    name: string;
    title: string;
    package_count: number;
  }>;

  return {
    count: result.length,
    organizations: result.map((org) => ({
      slug: org.name,
      name: org.title,
      dataset_count: org.package_count,
    })),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
