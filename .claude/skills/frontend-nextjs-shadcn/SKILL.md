---
name: frontend-nextjs-shadcn
description: Use ao implementar frontend em Next.js com shadcn/ui, quando project.config.md indicar esta stack. Cobre estrutura de pastas, convenção de hooks, uso de componentes shadcn/ui, e padrões específicos do App Router.
---

# Frontend: Next.js (App Router) + shadcn/ui

> Convenção de nomenclatura completa em
> `examples/naming-conventions/frontend-nextjs-typescript.md` — leia antes
> de nomear arquivos, componentes ou hooks. Exemplo de árvore de pastas
> completa em `examples/folder-structures/frontend-nextjs-shadcn.md`.

## Como usar esta skill

Este arquivo tem as regras que valem para **todo** código de frontend deste
projeto. O detalhe de cada área fica em `reference/`, carregado só quando
você for trabalhar naquela área — ler tudo de uma vez desperdiça contexto
que você vai precisar para o spec, o design e o código.

| Vou trabalhar em... | Leia |
|---|---|
| Layout base, header, sidebar, rodapé, toast, barra de progresso, `/version` | `reference/appshell.md` |
| Listagem, paginação, ordenação, filtros, loading por linha | `reference/grid-e-listagem.md` |
| Formulário, autocomplete, editor de texto rico, LoadingButton, dirty state | `reference/formularios.md` |
| Skeleton, lazy loading, animação, estados de carregamento | `reference/estados-e-animacao.md` |
| Dockerfile, Biome, knip, dependency-cruiser, CSP, `APP_ENV`, autenticação | `reference/ambiente-e-build.md` |
| Acessibilidade WCAG e anti-padrões visuais | `reference/acessibilidade-e-design.md` |

As regras universais (hexagonal, deleção lógica, concorrência otimista,
LGPD, fuso horário) estão no `CLAUDE.md` e não se repetem aqui.

## ⚠️ Verificar versão antes de implementar

```bash
npm show next version           # versão atual do Next.js
npm show @shadcn/ui version     # versão atual do shadcn
cat package.json | grep next    # versão instalada no projeto
```

Consultar https://ui.shadcn.com/docs para componentes atualizados.
Se a versão instalada diferir da atual, verificar breaking changes
(especialmente App Router vs Pages Router e mudanças de API).

## Estrutura de pastas
```
src/
  app/                          # rotas Next.js (App Router)
    (shell)/                    # layout autenticado
      layout.tsx
      processos/page.tsx        # cada feature tem sua rota
      usuarios/page.tsx
    page.tsx                    # rota raiz = login
  components/
    layout/                     # AppShell, Header, Sidebar, Footer
    shared/
      ui/                       # componentes visuais sem lógica de domínio
        status-badge.tsx        #   StatusBadge, Skeleton, EmptyState, ErrorState
        skeleton-table.tsx
        empty-state.tsx
        error-state.tsx
        modal.tsx               #   Modal/Dialog genérico
        confirm-delete.tsx      #   Confirmação de exclusão
      forms/                    # componentes de formulário reutilizáveis
        autocomplete-create.tsx #   AutocompleteCreate (já implementado)
        rich-text-editor.tsx    #   RichTextEditor (já implementado)
      hooks/                    # hooks sem vínculo com domínio
        use-local-storage.ts    #   useLocalStorage
        use-pagination.ts       #   usePagination
        use-debounce.ts         #   useDebounce
    features/                   # componentes e hooks por domínio
      processo/
        components/             #   componentes específicos da feature
        hooks/                  #   useProcessos, useProcesso, etc.
        types.ts                #   interfaces e types da feature
      usuario/
        components/
        hooks/
        types.ts
  lib/                          # utilitários puros (sem JSX, sem hooks)
```

**Regra de decisão shared/ vs features/:**
- Pode ser usado em mais de uma feature → `shared/ui/`, `shared/forms/` ou `shared/hooks/`
- Específico de uma entidade → `features/<entidade>/`
- Componente `shared/` nunca importa de `features/`

## Convenções específicas
- Instalar componente via `npx shadcn add <componente>` antes de
  implementar algo do zero — verificar primeiro se já existe equivalente
  em `/components/ui`.
- Componentes de UI consomem hooks (`useProcesso()`, etc.), nunca fazem
  fetch direto via `useEffect` + `fetch` solto no componente.
- Tratamento de erro e loading: todo hook expõe `{ data, isLoading, error }`
  ou equivalente — componente sempre trata os três estados visivelmente.
- Formato de erro de API: ler `project.config.md` (seção "Padrão de
  comunicação") para o formato JSON de erro e tratar de forma consistente
  em todos os hooks (ex: um `apiClient` central que já normaliza o erro).
- Server Components por padrão (App Router); usar `"use client"` apenas
  quando houver interatividade real (estado, evento, hook de navegador).
- Acessibilidade: shadcn/ui já usa Radix por baixo (ARIA correto) — não
  sobrescrever atributos ARIA gerados pelos primitivos sem motivo forte.


## Regras que valem sempre (não estão em reference/)

Vale a pena ter estas na cabeça antes de abrir qualquer arquivo de
referência, porque elas decidem o formato do código desde a primeira linha:

- **Zero comentário** em `.ts`, `.tsx`, `.js`, `.html`, `.css`. O bundle vai
  para o browser. Achado 🔴 Crítico de segurança na revisão.
- **Zero `fetch` dentro de componente.** Toda chamada de dados vive em hook
  ou service.
- **Componente compartilhado antes de componente de feature.** Se você vai
  copiar algo de outra tela, pare e extraia para `components/shared/`.
- **Nada de `localStorage`/`sessionStorage` para token.** JWT em cookie
  `HttpOnly`. Achado 🔴 Crítico.
- **Área de conteúdo alinhada à esquerda**, `w-full`, sem `mx-auto` +
  `max-w-*` no wrapper de página. Ver `CLAUDE.md`, "Área de conteúdo".
- **Nenhuma busca automática em grid.** Filtro → botão "Pesquisar" → grid.
- **Todo botão assíncrono é `LoadingButton`**, com spinner e texto no
  gerúndio.
- **`prefers-reduced-motion`** desativa animação decorativa.

## Relação com o UX Designer
- Antes de implementar uma tela nova, leia `specs/<feature>/ux.md` (gerado
  pelo subagent `ux-designer`) para fluxo, estados de tela (vazio, erro,
  carregando) e hierarquia visual — não improvise layout sem esse
  documento quando ele existir.
