# Examples

Esta pasta guarda **material de referência ilustrativo** — coisas que
ajudam a entender ou aplicar uma convenção, mas que não são lidas
automaticamente pelos subagents durante a execução (diferente de
`.claude/skills/`, que É lida automaticamente).

## Por que separado de `.claude/skills/`
- `.claude/skills/` = conhecimento operacional, carregado pelos subagents
  no meio de uma tarefa real (ex: "como implementar um adapter em Go").
- `examples/` = material de consulta/aprendizado, que você (ou eu, quando
  pedido) consulta para criar uma skill nova ou para verificar uma
  convenção — não é invocado automaticamente.

## O que tem aqui
- **`naming-conventions/`** — convenções de nomenclatura e padrões de implementação:
  - `database.md` — banco de dados
  - `backend-go.md` — Go (PascalCase/camelCase, sem prefixo `I`)
  - `frontend-nextjs-typescript.md` — Next.js/TypeScript/React
  - `value-objects-go.md` — Value Objects em Go: padrão base, exemplos de Email, Dinheiro, Status com transições
- **`folder-structures/`** — exemplos concretos de árvore de pastas para
  as combinações de stack já usadas neste template.
- **`tech-stacks/`** — exemplos de como `project.config.md` ficaria
  preenchido para combinações de stack AINDA NÃO implementadas como
  skill — serve de modelo para quando você quiser adicionar uma nova
  combinação ao template.
- **`mermaid/`** — exemplos prontos de diagramas Mermaid por tipo:
  `erDiagram` (schema do banco), `sequenceDiagram` (fluxo de requisição),
  `stateDiagram-v2` (ciclo de vida de entidade/ABAC), `flowchart`
  (decisão e arquitetura hexagonal). Referência para `arquiteto`, `dba`
  e `tech-writer`.
  organizados por quem é responsável por eles:
  - `backend/` → `dev-backend` (Dockerfile prod/dev + .air.toml)
  - `frontend/` → `dev-frontend` (Dockerfile prod/dev)
  - `compose/` → `devops` (docker-compose.yaml, docker-compose.dev.yml, .env.example)

## Quando usar isso
- Ao criar uma skill nova para uma tecnologia diferente, comece lendo o
  exemplo de `tech-stacks/` mais parecido e a convenção de nomenclatura
  correspondente, se existir.
- Ao revisar código gerado, se a nomenclatura parecer estranha, confira
  aqui antes de assumir que está certo.
