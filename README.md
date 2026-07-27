# Template SDD — Spec-Driven Development com Agentes de IA

Template de desenvolvimento de software baseado em agentes para Claude Code.
Um time completo de IA — analista, arquiteto, desenvolvedor, DBA, QA,
segurança e mais — orientado por documentos estruturados.

---

## Estrutura do projeto

```
.
├── CLAUDE.md                   # fonte única de verdade — regras universais
├── README.md                   # este arquivo — visão geral do projeto
├── GUIA_DE_USO_AGENTS.md       # como usar o time de agentes (leia antes de começar)
├── project.config.md           # stack tecnológica do seu projeto (preencha primeiro)
├── project.config.example.md   # exemplo de configuração
│
├── specs/                      # toda a documentação viva do projeto
│   ├── _status.md              # kanban das funcionalidades (atualizado pelos agentes)
│   ├── _templates/             # templates dos documentos gerados pelos agentes
│   │   ├── spec.md             # modelo de especificação de funcionalidade
│   │   ├── design.md           # modelo de design técnico (com diagrama Mermaid)
│   │   ├── tasks.md            # modelo de lista de tarefas
│   │   ├── evidence.md         # modelo de relatório de testes
│   │   └── visao-produto.md    # modelo de visão do produto
│   └── <feature>/              # criada pelo analista-requisitos para cada feature
│       ├── spec.md
│       ├── ux.md
│       ├── design.md
│       ├── tasks.md
│       ├── diagrama-banco.md
│       └── evidence.md
│
├── docs/                       # documentação gerada automaticamente
│   ├── openapi.yaml            # especificação de API (gerada pelo tech-writer)
│   └── diagrama-banco.md       # diagrama ER consolidado (gerado pelo dba)
│
├── examples/                   # referências e exemplos para os agentes
│   ├── docker/                 # Dockerfiles e docker-compose de referência
│   ├── mermaid/                # exemplos de diagramas Mermaid por tipo
│   ├── naming-conventions/     # convenções de nomenclatura por tecnologia
│   └── folder-structures/      # estruturas de pastas por stack
│
└── .claude/                    # time de agentes e skills (não editar durante o projeto)
    ├── agents/                 # 15 agentes de IA
    └── skills/                 # 11 skills de tecnologia
```

---

## Os três arquivos que você precisa conhecer

### `project.config.md`
Preenchido uma única vez no início do projeto pelo `analista-requisitos`.
Define a stack tecnológica — todos os agentes leem este arquivo antes de
agir. Mudar de stack em um novo projeto = editar só este arquivo.

### `specs/_status.md`
Kanban das funcionalidades do projeto. Atualizado automaticamente pelos
agentes conforme o trabalho avança. Ao iniciar qualquer sessão nova,
o `analista-requisitos` lê este arquivo e apresenta o estado atual.

### `CLAUDE.md`
Fonte única de verdade para todas as regras universais do projeto:
arquitetura hexagonal, padrões de UX, ABAC, auditoria, observabilidade,
hierarquia de autoridade dos agentes, e mais. Os agentes o consultam —
você raramente precisa lê-lo diretamente.

---

## Por onde começar

1. **Novo no ambiente?** Leia `GUIA_VM_DESENVOLVEDOR.md` — passo a passo
   para montar o ambiente de desenvolvimento (WSL2 + Ubuntu + Docker + VS Code + Claude Code).
2. Leia `GUIA_DE_USO_AGENTS.md` — explica o time de agentes e o fluxo
   completo de uso, da visão do produto à entrega em produção.
3. Abra o projeto no Claude Code: `claude`
4. Diga: `"Use o analista-requisitos"`
