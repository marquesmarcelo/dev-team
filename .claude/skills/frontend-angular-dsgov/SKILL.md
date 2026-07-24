---
name: frontend-angular-dsgov
description: Use quando o project.config.md ou o documento de visão indicar que o projeto deve seguir o Design System do Governo Federal (DS Gov / Padrão Digital de Governo). Complementa a skill frontend-angular com os padrões específicos do DS Gov.
---

# Frontend Angular + Design System Governo Federal (DS Gov)

> Esta skill complementa `.claude/skills/frontend-angular/SKILL.md`.
> Leia as duas antes de implementar qualquer tela quando o DS Gov for
> exigido pelo documento de visão.

## Sobre o DS Gov

O Padrão Digital de Governo (DS Gov) é o design system oficial do Governo
Brasileiro, desenvolvido e mantido pelo SERPRO em conjunto com a
Secretaria de Governo Digital. Referência oficial: https://www.gov.br/ds/home

Aplica-se quando o documento de visão (`specs/00-visao-produto.md`) indicar:
- Sistema de atendimento ao cidadão
- Portal público federal, estadual ou municipal
- Sistema interno de órgão público que segue o Padrão Digital de Governo
- Requisito explícito de conformidade com o Padrão Digital de Governo

## WAI-ARIA vs WCAG 2.2 — relação correta

**Não são concorrentes — são complementares e devem ser usados juntos:**
- **WCAG 2.2 AA** é o padrão de *conformidade* — define *o que* a aplicação
  precisa satisfazer. É o padrão de acessibilidade do projeto.
- **WAI-ARIA** é a especificação técnica de *implementação* — define
  *como* comunicar semântica a tecnologias assistivas via atributos HTML
  (`role`, `aria-label`, `aria-live`, etc.).
- O DS Gov usa WAI-ARIA como técnica de implementação para atingir
  conformidade com o **eMAG** (Modelo de Acessibilidade em Governo
  Eletrônico), que por sua vez segue o WCAG.

**Conclusão:** manter **WCAG 2.2 AA como padrão de conformidade do projeto**
(como já está em `CLAUDE.md` e na skill `accessibility/SKILL.md`) e usar
**WAI-ARIA como técnica de implementação** — exatamente como o DS Gov faz.
Não substituir um pelo outro; usar os dois.

## Instalação

```bash
# Pacote principal do DS Gov
npm install @govbr-ds/core

# Ícones (Font Awesome 5 é dependência do DS Gov)
npm install @fortawesome/fontawesome-free
```

No `angular.json`, adicionar nos assets e styles:
```json
"styles": [
  "node_modules/@govbr-ds/core/dist/core.min.css",
  "node_modules/@fortawesome/fontawesome-free/css/all.min.css",
  "src/styles.scss"
],
"scripts": [
  "node_modules/@govbr-ds/core/dist/core.min.js"
]
```

## Estrutura de componentes DS Gov em Angular

O DS Gov fornece CSS e JS vanilla — para integrar com Angular,
criar componentes wrapper:

```typescript
// shared/components/br-button/br-button.component.ts
@Component({
  selector: 'app-br-button',
  standalone: true,
  template: `
    <button class="br-button" [class]="type" [type]="htmlType"
            [disabled]="disabled" [attr.aria-label]="ariaLabel">
      @if (loading) {
        <div class="br-loading" role="progressbar"
             aria-label="Carregando..." aria-live="polite">
        </div>
      }
      <ng-content />
    </button>
  `,
})
export class BrButtonComponent {
  type = input<'primary' | 'secondary' | 'danger'>('primary');
  htmlType = input<'button' | 'submit' | 'reset'>('button');
  disabled = input(false);
  loading = input(false);
  ariaLabel = input<string | undefined>(undefined);
}
```

## Header padrão DS Gov

```html
<!-- Estrutura obrigatória para sistemas do governo federal -->
<header class="br-header" id="header">
  <div class="container-lg">
    <div class="header-top">
      <div class="header-logo">
        <img src="assets/govbr-logo.png" alt="Governo Federal do Brasil" />
        <span class="br-divider vertical mx-half mx-sm-1"></span>
        <div class="header-sign">{{ nomeSistema }}</div>
      </div>
      <!-- Barra de acessibilidade obrigatória no DS Gov -->
      <div class="header-actions">
        <div class="header-links">
          <a href="#main-content" class="sr-only">
            Ir para o conteúdo principal
          </a>
        </div>
      </div>
    </div>
  </div>
</header>
```

## Barra de acessibilidade (eMAG — obrigatória em sistemas públicos)

```html
<!-- Teclas de atalho padrão eMAG -->
<div class="br-accessibility-bar" aria-label="Barra de acessibilidade">
  <nav aria-label="Atalhos de teclado">
    <a accesskey="1" href="#main-content" title="Conteúdo principal [Alt+1]">
      Conteúdo
    </a>
    <a accesskey="2" href="#main-navigation" title="Menu principal [Alt+2]">
      Menu
    </a>
    <a accesskey="3" href="#footer" title="Rodapé [Alt+3]">
      Rodapé
    </a>
  </nav>
</div>
```

## Classes CSS do DS Gov mais utilizadas

| Classe | Componente |
|---|---|
| `br-button primary` | Botão primário |
| `br-button secondary` | Botão secundário |
| `br-input` | Campo de texto |
| `br-select` | Select/dropdown |
| `br-table` | Tabela |
| `br-card` | Card |
| `br-message` | Mensagem de feedback |
| `br-loading` | Indicador de carregamento |
| `br-header` | Header do sistema |
| `br-menu` | Menu lateral |

## Acessibilidade no DS Gov

O DS Gov implementa WAI-ARIA nos seus componentes nativos. Ao usar as
classes do DS Gov e o JS do `core.min.js`:
- `role`, `aria-expanded`, `aria-label` são gerenciados automaticamente
  em Menu, Accordion, Select.
- Você ainda é responsável por: `aria-live` em resultados dinâmicos,
  `alt` em imagens informativas, e contraste de cor customizado.

Ferramentas de validação recomendadas pelo próprio DS Gov:
- **ASES** (Avaliador e Simulador de Acessibilidade de Sítios) — ferramenta
  do governo brasileiro: https://ases.estaleiro.serpro.gov.br
- **WAVE** e **axe** complementam o ASES para cobertura mais ampla.

## Quando NÃO usar o DS Gov

Se o documento de visão não indicar conformidade com o Padrão Digital de
Governo, não usar o DS Gov — use a biblioteca configurada em
`project.config.md` (Angular Material ou PrimeNG). O DS Gov tem identidade
visual específica do governo e não é adequado para sistemas comerciais.
