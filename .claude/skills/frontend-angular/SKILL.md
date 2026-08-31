---
name: frontend-angular
description: Use ao implementar frontend em Angular, quando project.config.md indicar esta stack. Cobre estrutura de projeto Angular 17+, standalone components, signals, biblioteca de componentes padrão (Angular Material ou PrimeNG), acessibilidade WCAG 2.2 AA, e padrão de UI assíncrona.
---

# Frontend: Angular (v17+) + Standalone Components

> Leia também `.claude/skills/accessibility/SKILL.md` antes de implementar
> qualquer tela nova. Se o projeto requer o Design System do Governo Federal
> (DS Gov), leia adicionalmente `.claude/skills/frontend-angular-dsgov/SKILL.md`.

## Como usar esta skill

Este arquivo tem as regras que valem para **todo** código Angular deste
projeto. O detalhe de cada área fica em `reference/`, carregado só quando
você for trabalhar naquela área — ler tudo de uma vez desperdiça contexto
que você vai precisar para o spec, o design e o código.

| Vou trabalhar em... | Leia |
|---|---|
| Layout base, header, sidebar, rodapé, toast, barra de progresso, `/version` | `reference/appshell.md` |
| Listagem, ordenação de coluna, loading por linha | `reference/grid-e-listagem.md` |
| Formulário, autocomplete, editor de texto rico, LoadingButton, dirty state | `reference/formularios.md` |
| Skeleton, lazy loading, animação, estados de carregamento | `reference/estados-e-animacao.md` |
| Standalone components, Signals, service com estado, `resource()`/`linkedSignal()` | `reference/signals-e-servicos.md` |
| Dockerfile, `APP_ENV`, autenticação, lazy loading de rota | `reference/ambiente-e-build.md` |

Sistema público com DSGOV: ler também `frontend-angular-dsgov/SKILL.md`.

As regras universais (hexagonal, deleção lógica, concorrência otimista,
LGPD, fuso horário) estão no `CLAUDE.md` e não se repetem aqui.

## Biblioteca de componentes padrão (escolher no project.config.md)

A pesquisa atual indica:
- **Angular Material** — melhor para: acessibilidade nativa (ARIA embutido no
  CDK), SSR, consistência visual, apps SaaS/produto. Escolha padrão quando
  acessibilidade é prioridade.
- **PrimeNG** — melhor para: dashboards com tabelas pesadas, charts, 80+
  componentes prontos, grids com virtual scrolling. Preferir quando o app
  é data-heavy (painéis administrativos).
- A decisão vai registrada em `project.config.md` — não inventar durante a
  implementação.

## ⚠️ Verificar versão antes de implementar

```bash
npm show @angular/core version   # versão atual do Angular
cat package.json | grep angular  # versão instalada no projeto
```

Consultar https://angular.dev para APIs atuais (signals, resource(),
linkedSignal()). Angular 17+ usa standalone por padrão e tem mudanças
frequentes no sistema de reatividade — verificar se resource() e
linkedSignal() estão disponíveis na versão instalada.

## Estrutura de pastas

```
src/
  app/
    core/                       # singleton services, guards, interceptors
      auth/
      http/                     # interceptors (loading, error, auth token)
    layout/                     # AppShell, Header, Sidebar, Footer
    shared/
      ui/                       # componentes visuais sem lógica de domínio
        status-badge/           #   StatusBadge
        skeleton-table/         #   SkeletonTable
        empty-state/            #   EmptyState
        error-state/            #   ErrorState
        confirm-delete/         #   ConfirmDelete
      forms/                    # componentes de formulário reutilizáveis
        autocomplete-create/    #   AutocompleteCreate (com criação inline)
        rich-text-editor/       #   RichTextEditor
      pipes/                    # pipes reutilizáveis
    features/                   # um diretório por funcionalidade
      processo/
        components/
          processo-list/        #   componentes específicos da feature
          processo-form/
        services/
          processo.service.ts   #   chama API, expõe signals ou Observables
        models/
          processo.model.ts     #   interfaces/types — nunca classes anêmicas
        processo.routes.ts      #   lazy loading
      usuario/
        components/
        services/
        models/
        usuario.routes.ts
    app.routes.ts
    app.config.ts
```

**Regra de decisão shared/ vs features/:**
- Pode ser usado em mais de uma feature → `shared/ui/`, `shared/forms/` ou `shared/pipes/`
- Específico de uma entidade → `features/<entidade>/`
- Componente `shared/` nunca importa de `features/`


## Regras que valem sempre (não estão em reference/)

- **Zero comentário** em `.ts`, `.html`, `.scss`. O bundle vai para o
  browser. Achado 🔴 Crítico de segurança na revisão.
- **Zero `HttpClient` dentro de componente.** Toda chamada de dados vive em
  service.
- **Standalone components sempre**, sem `NgModule` novo.
- **Signals antes de RxJS** para estado local e derivado. RxJS fica para
  fluxo de eventos de verdade.
- **Componente compartilhado antes de componente de feature.** Se você vai
  copiar algo de outra tela, extraia para `shared/components/`.
- **Nada de `localStorage`/`sessionStorage` para token.** JWT em cookie
  `HttpOnly`. Achado 🔴 Crítico.
- **Área de conteúdo alinhada à esquerda**, `flex: 1` + `width: 100%`, sem
  `margin: 0 auto` + `max-width` no wrapper de página.
- **Nenhuma busca automática em grid.** Filtro → botão "Pesquisar" → grid.
- **Todo botão assíncrono é `LoadingButton`**, com spinner e texto no
  gerúndio.
- **`prefers-reduced-motion`** desativa animação decorativa.

## Acessibilidade (WCAG 2.2 AA)

- Angular Material CDK já gerencia ARIA, foco e teclado — não sobrescrever.
- Adicionar `aria-live="polite"` em resultados dinâmicos de busca.
- Confirmar contraste de cor do tema Material customizado.
- Testes E2E (Playwright) verificar: botão desabilitado, estados de loading,
  navegação por teclado, `aria-sort` em colunas ordenáveis.
