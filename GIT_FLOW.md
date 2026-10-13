# Git Flow — Guia de trabalho

Este projeto adota um fluxo de branches estruturado em três ambientes permanentes e branches de trabalho de vida curta.

## Branches permanentes

| Branch | Ambiente | Deploy | Proteção |
|--------|----------|--------|----------|
| `develop` | dev | Automático (ArgoCD) | Push direto bloqueado |
| `staging` | homologação | Automático (ArgoCD) | Push direto bloqueado |
| `main` | produção | Manual (aprovação no ArgoCD) | Push direto bloqueado |

Nenhuma branch permanente aceita push direto. Toda mudança passa por Merge Request.

## Branches de trabalho

Toda branch de trabalho nasce de uma Issue. Sem Issue, sem branch.

| Prefixo | Quando usar | Base | Destino do MR |
|---------|-------------|------|----------------|
| `feature/<id>-<slug>` | Nova funcionalidade | `develop` | `develop` |
| `fix/<id>-<slug>` | Correção de bug em dev/staging | `develop` | `develop` |
| `hotfix/<id>-<slug>` | Correção urgente em produção | `main` | `main` + `develop` |
| `chore/<id>-<slug>` | Infraestrutura, dependências, CI | `develop` | `develop` |

Exemplos:
```
feature/42-cadastro-usuario
fix/87-paginacao-overflow
hotfix/99-csrf-token
chore/15-atualizar-dependencias
```

## Fluxo completo

```
feature/* ──MR──► develop ──MR de release──► staging ──MR──► main ──tag──► prod
fix/*     ──MR──►
hotfix/*  ──MR──────────────────────────────────────────────────────────────►
```

### Desenvolvimento (dev)
1. Crie uma Issue descrevendo a tarefa
2. Crie a branch a partir de `develop`: `git checkout -b feature/42-nome develop`
3. Desenvolva e faça commits seguindo Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
4. Abra um Merge Request de `feature/42-nome` → `develop`
5. O MR deve referenciar a Issue: `Closes #42` no corpo
6. Pelo menos um revisor deve aprovar antes do merge
7. Após merge, a pipeline faz deploy automático em dev

### Homologação (staging)
1. Quando `develop` estiver estável para uma release, abra MR de `develop` → `staging`
2. Descreva no MR quais features/fixes estão incluídos
3. Aprovação obrigatória do tech lead ou dono do produto
4. Após merge, deploy automático em staging
5. QA executa a suíte completa de testes no ambiente de homologação

### Produção (main)
1. Com homologação aprovada, abra MR de `staging` → `main`
2. Aprovação obrigatória do dono do produto
3. Após merge, crie a tag de release:
   ```bash
   git tag -a v1.2.0 -m "release: descrição resumida"
   git push origin v1.2.0
   ```
4. O deploy em produção é **manual** — aprovado no painel do ArgoCD
5. A tag marca o histórico imutável da release; o CLAUDE.md reflete apenas o estado vigente

### Hotfix
1. Crie a branch a partir de `main`: `git checkout -b hotfix/99-nome main`
2. Corrija, faça commit e abra **dois MRs**: um para `main` e outro para `develop`
3. Após merge em `main`, crie tag de patch: `v1.2.1`
4. Deploy manual em produção via ArgoCD

## Commits

Formato obrigatório — validado por `commitlint`:

```
<tipo>(<escopo>): <descrição curta>

[corpo opcional]

[rodapé opcional — ex: Closes #42]
```

Tipos aceitos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`

Exemplos:
```
feat(auth): adicionar autenticação JWT com refresh token
fix(paginacao): corrigir overflow em listas com mais de 100 itens
chore(deps): atualizar dependências de segurança
```

## Merge Requests

Todo MR deve ter:
- Título seguindo Conventional Commits
- Descrição com: o que muda, por que muda, como testar
- `Closes #<número-da-issue>` no corpo
- Pelo menos um aprovador
- Pipeline verde (lint + testes passando)
- Sem conflitos com a branch de destino

## Tags de release

Versionamento semântico: `vMAJOR.MINOR.PATCH`

- **MAJOR**: breaking change (mudança incompatível de API ou comportamento)
- **MINOR**: nova funcionalidade compatível
- **PATCH**: correção de bug

A tag nasce sempre em `main`, após deploy validado em staging.
