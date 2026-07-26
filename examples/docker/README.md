# Exemplos Docker

## Separação de responsabilidades

Esta pasta segue uma divisão deliberada — cada subagent é responsável
pelos arquivos que ele melhor conhece:

| Arquivo | Responsável | Por quê |
|---|---|---|
| `backend/Dockerfile` | `dev-backend` | Conhece a linguagem, dependências, binário e porta do backend |
| `backend/Dockerfile.dev` | `dev-backend` | Conhece o toolchain de hot-reload da linguagem (ex: `air` para Go) |
| `backend/.air.toml` | `dev-backend` | Configuração específica do watcher Go |
| `frontend/Dockerfile` | `dev-frontend` | Conhece o framework, o output do build (`standalone`, `static`) e porta |
| `frontend/Dockerfile.dev` | `dev-frontend` | Conhece o servidor de dev do framework (ex: `next dev`) |
| `compose/docker-compose.yaml` | `devops` | Orquestração de serviços, healthchecks, networking, volumes nomeados |
| `compose/docker-compose.dev.yml` | `devops` | Overlay de volumes e variáveis de dev sobre o compose base |
| `compose/.env.example` | `devops` | Documentação de variáveis necessárias por ambiente |

## Como usar estes exemplos

Quando o `dev-backend`, `dev-frontend` ou `devops` for criar ou
atualizar os arquivos correspondentes no projeto real, **eles devem ler o
exemplo desta pasta antes** — exatamente como funciona com as outras
skills. A diferença é que esses são arquivos de configuração inteiros, não
só padrões de código.

Para carregar um exemplo, o subagent lê:
- `examples/docker/backend/Dockerfile` → antes de criar/atualizar o
  `backend/Dockerfile` do projeto real.
- `examples/docker/frontend/Dockerfile` → antes de criar/atualizar o
  `frontend/Dockerfile` do projeto real.
- `examples/docker/compose/docker-compose.yaml` → referência de estrutura
  antes de criar/atualizar o `docker-compose.yaml` do projeto real.

## Padrão do overlay de desenvolvimento

O projeto usa dois arquivos Docker Compose combinados, não dois arquivos
separados e independentes:

```bash
# Desenvolvimento (hot-reload, sem rebuild de imagem pra mudança de código)
docker compose -f docker-compose.yaml -f docker-compose.dev.yml up

# Primeiro build ou rebuild de dependência (go.mod / package.json mudou)
docker compose -f docker-compose.yaml -f docker-compose.dev.yml build <serviço>

# Produção (build completo, sem overlay)
docker compose -f docker-compose.yaml up --build
```

Isso significa que `docker-compose.dev.yml` só sobrescreve o que muda em
desenvolvimento (Dockerfile, volumes, variáveis de env) — não duplica
toda a configuração de postgres, portas, healthchecks, etc.

## Variáveis sensíveis a ambiente

| Variável | Dev (`docker-compose.dev.yml`) | Produção |
|---|---|---|
| `GIN_MODE` | `debug` | `release` |

| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | domínios reais |
| `APP_ENV` | `development` | `production` |
