# Configuração do Projeto

> Preencha este arquivo uma única vez, no início do projeto. Todos os
> subagents leem este arquivo antes de agir — ele é a fonte única de
> verdade sobre qual tecnologia usar. Mudar de stack em um novo projeto
> significa editar apenas este arquivo, não os subagents.

## Backend
- **Linguagem:** <ex: Go | Python | Java>
- **Framework HTTP:** <ex: Gin | FastAPI | Spring Boot>
- **Biblioteca de acesso a dados:** <ex: sqlx | SQLAlchemy Core | Spring JDBC Template>
- **Skill correspondente:** `.claude/skills/backend-<nome>/SKILL.md`
  - Go + Gin → `backend-go`
  - Python + FastAPI → `backend-python-fastapi`
  - Java + Spring Boot → `backend-java-springboot`
  - PHP + Laravel → `backend-php-laravel`
- **Subagent correspondente:** `dev-backend` (genérico) ou especializado
  (`dev-backend-python` | `dev-backend-java` | `dev-backend-php`)

## Frontend
- **Framework:** <ex: Next.js | Angular>
- **Biblioteca de componentes:** <ex: shadcn/ui | Angular Material | DSGOV>
  - DSGOV (https://www.gov.br/ds/home): obrigatório se o sistema for público/governo federal
- **Skill correspondente:** `.claude/skills/frontend-<nome>/SKILL.md`
  - Next.js + shadcn/ui → `frontend-nextjs-shadcn`
  - Angular → `frontend-angular`
- **Subagent correspondente:** `dev-frontend` (genérico) ou `dev-frontend-angular`

## Geo (preencher se o projeto tiver dados geográficos)
- **Habilitar geo:** sim | não
- **PostGIS:** sempre que geo=sim
- **GeoServer:** sim | não (necessário para múltiplas camadas WMS/WFS ou integração com QGIS)
- **SRID padrão:** EPSG:4674 (SIRGAS 2000 — obrigatório Brasil)
- **Skill correspondente:** `.claude/skills/geo/SKILL.md`

## Banco de dados
- **Produção:** <ex: PostgreSQL>
- **Desenvolvimento local:** <ex: SQLite, com ressalva de validação contra Postgres real para query complexa>
- **Ferramenta de migration:** <ex: golang-migrate>
- **Motor de busca:** <padrão: busca nativa do Postgres (tsvector/GIN); Elasticsearch só sob gatilho — ver Roadmap em CLAUDE.md>

## Testes E2E
- **Ferramenta:** <ex: Playwright>
- **Skill correspondente:** `.claude/skills/e2e-<ferramenta>/SKILL.md`

## Cache
- **Tecnologia:** <ex: Redis>

## Infraestrutura
- **Containerização:** <ex: Docker>
- **Orquestração:** <ex: K3s/Rancher>

## Inteligência Artificial / LLM
- **Provedor:** <ex: Anthropic Claude API>
- **Modelo padrão:** <ex: claude-sonnet-4-6>
- **Skill correspondente:** `.claude/skills/ai-<provedor>/SKILL.md`

## Padrão de comunicação (universal, independente de stack)
- Formato de payload: **JSON**
- Convenção de erro: <definir formato padrão, ex: `{"error": {"code": "...", "message": "..."}}`>
- Versionamento de API: <ex: prefixo `/api/v1`>

## Variáveis de ambiente padrão (todo projeto)
- `APP_ENV` — bypass de autenticação e segurança, exclusivo de desenvolvimento local
- `CORS_ALLOWED_ORIGINS` — lista de origens permitidas, por ambiente

---

> Quando este arquivo mudar de projeto para projeto (ex: trocar Go por
> Node.js, ou Next.js por outro framework), nenhum subagent precisa ser
> editado — apenas este arquivo e a skill correspondente à nova tecnologia.
