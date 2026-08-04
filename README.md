# mcp-datagov

Data.gov MCP — wraps Data.gov CKAN API (catalog.data.gov/api/3)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_datasets` | Search U.S. government open datasets on Data.gov by keyword. Returns titles, descriptions, organizations, formats, and download URLs. Example: search_datasets("climate change", organization: "noaa-gov"). |
| `get_dataset` | Get full metadata for a specific Data.gov dataset by its ID or name. Returns title, description, resources (download links), organization, tags, and update frequency. |
| `list_organizations` | List all organizations publishing datasets on Data.gov. Returns organization names and dataset counts. Useful for discovering data publishers. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "datagov": {
      "url": "https://gateway.pipeworx.io/datagov/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Datagov data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
