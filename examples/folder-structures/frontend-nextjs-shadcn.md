# Exemplo de estrutura de pastas: Frontend Next.js + shadcn/ui

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── processos/
│       ├── page.tsx
│       └── [id]/
│           └── page.tsx
├── components/
│   ├── ui/                           # gerado por `npx shadcn add`, não editar à mão
│   │   ├── button.tsx
│   │   └── card.tsx
│   └── processo/
│       ├── processo-card.tsx
│       └── processo-form.tsx
├── hooks/
│   └── use-processo.ts
├── lib/
│   ├── api-client.ts                 # normaliza erro conforme project.config.md
│   └── utils.ts
├── types/
│   └── processo.ts
├── package.json
└── Dockerfile
```

Arquivos em `kebab-case`, componentes em `PascalCase` dentro do arquivo,
hooks com prefixo `use` — ver
`examples/naming-conventions/frontend-nextjs-typescript.md`.
