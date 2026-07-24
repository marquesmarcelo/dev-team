---
name: mcp-server
description: Use ao implementar um servidor MCP integrado à API da aplicação. Cobre estrutura do projeto, mapeamento de endpoints OpenAPI para tools MCP, autenticação, transporte (STDIO para Claude Code, SSE para Claude web/desktop), Dockerfile e registro no docker-compose.
---

# MCP Server: integração com a API da aplicação

> Regras universais do projeto (UUID, stateless, etc.) estão em `CLAUDE.md`.
> Esta skill cobre apenas o que é específico da construção de um servidor MCP.

## O que é um MCP server neste contexto

Um servidor MCP expõe as funcionalidades da aplicação como **tools** para
modelos de linguagem (Claude Code, Claude Desktop, Claude Web). Ele não
reimplementa lógica de negócio — chama a API REST já existente da aplicação
e adapta o contrato para o protocolo MCP.

```
Claude (LLM)
    ↓ tool call
MCP Server  ──→  API REST da aplicação  ──→  Banco de dados
    ↑
openapi.yaml (fonte de verdade)
```

## Estrutura do projeto

```
mcp/
├── src/
│   ├── index.ts          # entry point — configura servidor e transporte
│   ├── tools/            # um arquivo por domínio de ferramenta
│   │   ├── processo.ts   # tools: criar_processo, listar_processos, etc.
│   │   └── usuario.ts
│   ├── client/
│   │   └── api.ts        # wrapper do fetch para a API — lida com auth e erros
│   └── types/            # tipos gerados ou manuais a partir do openapi.yaml
├── Dockerfile
├── Dockerfile.dev
├── package.json
└── tsconfig.json
```

## SDK e dependências (TypeScript — recomendado)

```bash
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node tsx
```

```json
// package.json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## Transporte: STDIO vs. SSE

| Transporte | Quando usar | Como configurar |
|---|---|---|
| **STDIO** | Claude Code (linha de comando) | `new StdioServerTransport()` — padrão para dev |
| **SSE** | Claude Desktop, Claude Web, K8s | `new SSEServerTransport('/sse', res)` — requer HTTP server |

Escolha baseada em `project.config.md` seção "MCP / transporte".
Para projetos com K8s, SSE é obrigatório (STDIO não funciona em container
acessado remotamente).

## Entry point com STDIO

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { processoTools, handleProcessoTool } from './tools/processo.js'

const server = new Server(
  { name: process.env.MCP_SERVER_NAME ?? 'mcp-aplicacao', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

// Registrar todas as tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [...processoTools]
}))

// Rotear chamadas para o handler correto por domínio
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  if (name.startsWith('processo_')) return handleProcessoTool(name, args)
  throw new Error(`Tool desconhecida: ${name}`)
})

const transport = new StdioServerTransport()
await server.connect(transport)
```

## Entry point com SSE (para Claude Desktop / Web / K8s)

```typescript
// src/index.ts
import express from 'express'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'

const app = express()
const sessions = new Map<string, SSEServerTransport>()

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res)
  const server = createServer()   // função que monta o Server com tools
  sessions.set(transport.sessionId, transport)
  await server.connect(transport)
})

app.post('/messages', express.json(), async (req, res) => {
  const transport = sessions.get(req.query.sessionId as string)
  if (!transport) return res.status(404).send('Sessão não encontrada')
  await transport.handlePostMessage(req, res)
})

app.listen(Number(process.env.PORT ?? 3002))
```

## Definição de tool (por domínio)

```typescript
// src/tools/processo.ts
import { z } from 'zod'
import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { apiClient } from '../client/api.js'

// Definição das tools — descrições são o que o LLM lê para decidir quando usar
export const processoTools: Tool[] = [
  {
    name: 'processo_criar',
    description: 'Cria um novo processo administrativo no sistema. Use quando o usuário quiser abrir, registrar ou criar um processo.',
    inputSchema: {
      type: 'object',
      properties: {
        descricao: { type: 'string', description: 'Descrição detalhada do processo' },
        responsavel_id: { type: 'string', format: 'uuid', description: 'UUID do usuário responsável' },
      },
      required: ['descricao', 'responsavel_id']
    }
  },
  {
    name: 'processo_listar',
    description: 'Lista processos com filtros opcionais. Use para buscar, consultar ou listar processos.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['aberto', 'em_analise', 'concluido'] },
        pagina: { type: 'number', default: 1 },
        limite: { type: 'number', default: 20, maximum: 50 }
      }
    }
  }
]

// Handler: chama a API e retorna o resultado no formato MCP
export async function handleProcessoTool(name: string, args: unknown) {
  const schema = z.record(z.unknown())
  const params = schema.parse(args)

  switch (name) {
    case 'processo_criar':
      const criado = await apiClient.post('/api/v1/processos', params)
      return { content: [{ type: 'text', text: JSON.stringify(criado, null, 2) }] }

    case 'processo_listar':
      const lista = await apiClient.get('/api/v1/processos', params)
      return { content: [{ type: 'text', text: JSON.stringify(lista, null, 2) }] }

    default:
      throw new Error(`Tool não implementada: ${name}`)
  }
}
```

## Cliente HTTP para a API

```typescript
// src/client/api.ts
const BASE_URL = process.env.API_BASE_URL ?? 'http://backend:3001'
const API_TOKEN = process.env.API_TOKEN  // token de serviço, não do usuário final

export const apiClient = {
  async get(path: string, params?: Record<string, unknown>) {
    const url = new URL(path, BASE_URL)
    if (params) Object.entries(params).forEach(([k, v]) =>
      v != null && url.searchParams.set(k, String(v))
    )
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' }
    })
    if (!res.ok) throw new Error(`API ${path}: ${res.status} ${await res.text()}`)
    return res.json()
  },

  async post(path: string, body: unknown) {
    const res = await fetch(new URL(path, BASE_URL), {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`API ${path}: ${res.status} ${await res.text()}`)
    return res.json()
  }
}
```

## Variáveis de ambiente

```bash
# .env.example (na pasta mcp/)
API_BASE_URL=http://backend:3001      # URL da API — container no docker-compose
API_TOKEN=                             # token de serviço (nunca token de usuário)
MCP_SERVER_NAME=mcp-nome-do-sistema
PORT=3002                              # só para transporte SSE
```

`API_TOKEN` é um token de serviço com permissões específicas — nunca
usar token de usuário final, nunca usar `DEV_SEM_AUTH=true` no MCP em produção.

## Dockerfiles

```dockerfile
# Dockerfile.dev — STDIO (para usar com Claude Code local)
FROM node:20-alpine
WORKDIR /app
CMD ["sh", "-c", "npm install && npm run dev"]
```

```dockerfile
# Dockerfile — produção SSE (para K8s / Claude Desktop remoto)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

## Registro no docker-compose

```yaml
# docker-compose.dev.yml
services:
  mcp:
    build:
      context: ./mcp
      dockerfile: Dockerfile.dev
    volumes:
      - ./mcp:/app
      - /app/node_modules
    environment:
      API_BASE_URL: http://backend:3001
      API_TOKEN: ${MCP_API_TOKEN}
    depends_on:
      - backend
    # STDIO: não expõe porta
    # SSE: ports: ["3002:3002"]
    stdin_open: true   # necessário para transporte STDIO
    tty: true
```

## Configurar no Claude Code / Claude Desktop

Para STDIO (Claude Code):
```json
// .claude/mcp-config.json ou ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "nome-do-sistema": {
      "command": "docker",
      "args": ["compose", "-f", "docker-compose.yaml", "-f", "docker-compose.dev.yml",
               "run", "--rm", "mcp"],
      "env": { "MCP_API_TOKEN": "<token>" }
    }
  }
}
```

Para SSE (Claude Desktop / Web):
```json
{
  "mcpServers": {
    "nome-do-sistema": {
      "url": "http://localhost:3002/sse"
    }
  }
}
```

## SDK Python (alternativa)

Se `project.config.md` indicar Python como linguagem preferida para o MCP:

```bash
pip install mcp httpx
```

```python
# src/main.py
import os
import httpx
from mcp.server import FastMCP

mcp = FastMCP(os.getenv("MCP_SERVER_NAME", "mcp-aplicacao"))
BASE_URL = os.getenv("API_BASE_URL", "http://backend:3001")
TOKEN   = os.getenv("API_TOKEN", "")
headers = {"Authorization": f"Bearer {TOKEN}"}

@mcp.tool()
async def processo_criar(descricao: str, responsavel_id: str) -> dict:
    """Cria um novo processo administrativo."""
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{BASE_URL}/api/v1/processos",
                         json={"descricao": descricao, "responsavel_id": responsavel_id},
                         headers=headers)
        r.raise_for_status()
        return r.json()

@mcp.tool()
async def processo_listar(status: str | None = None, pagina: int = 1) -> dict:
    """Lista processos com filtros opcionais."""
    async with httpx.AsyncClient() as c:
        params = {k: v for k, v in {"status": status, "pagina": pagina}.items() if v}
        r = await c.get(f"{BASE_URL}/api/v1/processos", params=params, headers=headers)
        r.raise_for_status()
        return r.json()

if __name__ == "__main__":
    mcp.run()  # STDIO por padrão
```

## Checklist de entrega

- [ ] Tools mapeadas a partir de `docs/openapi.yaml` (não inferidas do código)
- [ ] Descrições das tools claras para o LLM (o LLM lê a descrição para decidir quando chamar)
- [ ] Autenticação via `API_TOKEN` de serviço, não token de usuário
- [ ] Transporte correto conforme `project.config.md` (STDIO ou SSE)
- [ ] Dockerfile e Dockerfile.dev criados
- [ ] Serviço `mcp` registrado no docker-compose
- [ ] `.env.example` atualizado com `API_BASE_URL`, `API_TOKEN`, `PORT`
- [ ] Configuração de cliente (`mcp-config.json`) documentada em `docs/mcp.md`
- [ ] Erros da API tratados e reportados de forma legível ao LLM
