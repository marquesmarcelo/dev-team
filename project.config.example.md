# Configuração do Projeto (exemplo preenchido)

> Este é um EXEMPLO de como project.config.md fica preenchido, usando a
> stack que decidimos na nossa conversa. Copie o conteúdo para
> `project.config.md` na raiz ao iniciar um projeto real com esta stack,
> ou ajuste os campos se mudar de tecnologia.

## Backend
- **Linguagem:** Go
- **Framework HTTP:** Gin
- **Biblioteca de acesso a dados:** sqlx — SQL customizado, sem ORM pesado
- **Skill correspondente:** `.claude/skills/backend-go/SKILL.md`

## Frontend
- **Framework:** Next.js (App Router)
- **Biblioteca de componentes:** shadcn/ui (Tailwind + Radix)
- **Skill correspondente:** `.claude/skills/frontend-nextjs-shadcn/SKILL.md`

## Banco de dados
- **Produção:** PostgreSQL
- **Desenvolvimento local:** SQLite, com ressalva: queries com sintaxe
  específica de Postgres (JSONB, ON CONFLICT, window functions) exigem
  teste de integração contra Postgres real
- **Ferramenta de migration:** golang-migrate (pares up.sql/down.sql)
- **Motor de busca:** busca nativa do Postgres (tsvector/GIN) — Elasticsearch
  fica no Roadmap de Maturidade, só sob gatilho real de volume/relevância

## Testes E2E
- **Ferramenta:** Playwright
- **Skill correspondente:** `.claude/skills/e2e-playwright/SKILL.md`

## Cache
- **Tecnologia:** Redis (cache-aside, TTL obrigatório)

## Infraestrutura
- **Containerização:** Docker (multi-stage)
- **Orquestração:** K3s/Rancher

## Inteligência Artificial / LLM
- **Provedor:** Anthropic Claude API
- **Modelo padrão:** claude-sonnet-4-6 (avaliar modelo mais leve para
  tarefas simples de classificação)
- **Skill correspondente:** `.claude/skills/ai-anthropic/SKILL.md`

## Padrão de comunicação (universal, independente de stack)
- Formato de payload: **JSON**
- Convenção de erro: `{"error": {"code": "ALGUM_CODIGO", "message": "Mensagem legível"}}`
- Versionamento de API: prefixo `/api/v1`

## Variáveis de ambiente padrão (todo projeto)
- `APP_ENV` — bypass de autenticação e segurança, exclusivo de desenvolvimento local
- `CORS_ALLOWED_ORIGINS` — lista de origens permitidas, por ambiente
