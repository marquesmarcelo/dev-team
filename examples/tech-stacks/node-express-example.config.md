# Exemplo ilustrativo: project.config.md para stack Node.js + Express

> Este é um exemplo de COMO o mesmo template funcionaria com uma stack
> diferente — não está pronto para uso, porque a skill
> `.claude/skills/backend-node-express/SKILL.md` ainda não existe neste
> template. Serve para você entender o padrão antes de criar a skill real
> quando (e se) precisar trocar de stack.

## Backend
- **Linguagem:** Node.js (TypeScript)
- **Framework HTTP:** Express
- **Biblioteca de acesso a dados:** Knex.js (query builder, sem ORM completo)
- **Skill correspondente:** `.claude/skills/backend-node-express/SKILL.md` (criar antes de usar)

## Frontend
- **Framework:** Next.js (App Router)
- **Biblioteca de componentes:** shadcn/ui
- **Skill correspondente:** `.claude/skills/frontend-nextjs-shadcn/SKILL.md` (já existe)

## Banco de dados
- **Produção:** PostgreSQL
- **Desenvolvimento local:** SQLite
- **Ferramenta de migration:** Knex migrations (pares up/down)

## Cache
- **Tecnologia:** Redis

## Infraestrutura
- **Containerização:** Docker
- **Orquestração:** K3s/Rancher

## Padrão de comunicação
- Formato de payload: JSON
- Convenção de erro: `{"error": {"code": "...", "message": "..."}}`
- Versionamento de API: prefixo `/api/v1`

---

> O que mudaria nos subagents: NADA. `dev-backend.md` continua igual —
> ele só leria "Node.js" em vez de "Go" neste arquivo e carregaria a skill
> `backend-node-express` em vez de `backend-go`. Essa é a prova de que a
> separação papel/tecnologia está funcionando como deveria.
