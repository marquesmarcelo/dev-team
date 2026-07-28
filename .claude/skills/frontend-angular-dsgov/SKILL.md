---
name: frontend-angular-dsgov
description: Use quando o project.config.md indicar sistema público ou conformidade com o Padrão Digital de Governo. Substitui o uso manual de classes CSS do @govbr-ds/core pelos Web Components oficiais (@govbr-ds/webcomponents-angular). Leia esta skill junto com frontend-angular/SKILL.md.
---

# Frontend Angular + DSGOV Web Components

> Esta skill **substitui** o uso manual de classes CSS do `@govbr-ds/core`
> pelos Web Components oficiais. Leia junto com `frontend-angular/SKILL.md`.
>
> Referências oficiais:
> - Componentes: https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/
> - Início: https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/comecar
> - Design System: https://www.gov.br/ds/home

---

## Por que Web Components e não CSS manual

A abordagem anterior (classes CSS do `@govbr-ds/core` aplicadas manualmente)
gerava os problemas observados: modal abrindo na área errada, inputs sem
estilo correto, menu fora do padrão visual. Os Web Components encapsulam
o HTML, CSS e comportamento corretos — não é possível implementar o padrão
visual do governo montando classes CSS manualmente.

```
// ❌ Abordagem anterior — classe CSS manual, comportamento quebrado
<div class="br-modal">
  <div class="br-card">...</div>
</div>

// ✅ Correto — Web Component com HTML, CSS e comportamento encapsulados
<br-modal title="Título" [visible]="modalAberto">
  <span slot="content">Conteúdo do modal</span>
</br-modal>
```

---

## Instalação

```bash
npm install @govbr-ds/core @govbr-ds/webcomponents @govbr-ds/webcomponents-angular
```

Os três pacotes são necessários em conjunto:
- `@govbr-ds/core` — tokens de design, CSS base, fontes e ícones
- `@govbr-ds/webcomponents` — os Web Components (Custom Elements)
- `@govbr-ds/webcomponents-angular` — wrappers Angular + Control Value Accessors para Reactive Forms

---

## Configuração inicial

### 1. Importar estilos globais (`styles.scss`)

```scss
// Estilos obrigatórios do Design System
@import '@govbr-ds/core/dist/core.min.css';

// Não usar: não adicione classes CSS br-* manualmente além deste import
// Os Web Components aplicam seus próprios estilos internamente
```

### 2. Registrar os Web Components (`app.config.ts`)

```typescript
import { ApplicationConfig } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { defineCustomElements } from '@govbr-ds/webcomponents/loader'

// Registrar os Web Components do DSGOV — obrigatório antes do bootstrap
defineCustomElements(window)

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ]
}
```

### 3. Habilitar Custom Elements no Angular (`app.config.ts` ou módulo)

```typescript
// Para componentes standalone (recomendado Angular 17+)
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],   // permite tags <br-*> no template
  template: `...`
})
export class AppComponent {}
```

---

## Componentes mais usados

Todos os componentes seguem o padrão `<br-nome-do-componente>`.
Consulte a documentação completa em https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/components/

### Button

```html
<br-button emphasis="primary" (brClick)="salvar()">Salvar</br-button>
<br-button emphasis="secondary" (brClick)="cancelar()">Cancelar</br-button>
<br-button emphasis="primary" loading>Salvando...</br-button>
<br-button emphasis="tertiary" danger (brClick)="excluir()">Excluir</br-button>
```

### Input + Reactive Forms

```typescript
// O wrapper inclui Control Value Accessor — integra diretamente com formControlName
```

```html
<form [formGroup]="form">
  <br-input
    label="Nome"
    formControlName="nome"
    [state]="form.get('nome')?.invalid && form.get('nome')?.touched ? 'danger' : 'info'"
  ></br-input>
  <br-message
    *ngIf="form.get('nome')?.invalid && form.get('nome')?.touched"
    state="danger"
    [show-icon]="true">
    Nome é obrigatório.
  </br-message>
</form>
```

### Select

```html
<br-select label="Status" formControlName="status">
  <select-option value="aberto">Aberto</select-option>
  <select-option value="encerrado">Encerrado</select-option>
</br-select>
```

### Modal

```typescript
// O modal é posicionado pelo próprio Web Component — não aninhar dentro do menu
@Component({
  template: `
    <!-- Modal deve ser filho direto do body via portal, ou declarado no root -->
    <br-modal
      [title]="'Confirmar exclusão'"
      [visible]="modalAberto"
      (brClose)="modalAberto = false">
      <span slot="content">Deseja excluir este registro?</span>
      <span slot="footer">
        <br-button emphasis="secondary" (brClick)="modalAberto = false">Cancelar</br-button>
        <br-button emphasis="primary" danger (brClick)="confirmarExclusao()">Excluir</br-button>
      </span>
    </br-modal>
  `
})
```

> **Problema comum:** modal abrindo na área do menu acontece quando o
> `<br-modal>` está aninhado dentro do componente de menu ou sidebar.
> Declare o modal no componente raiz da página ou use um serviço de portal.

### Menu / Sidebar

```html
<!-- Header do sistema -->
<br-header>
  <header-logo slot="logo" src="/assets/logo-gov.svg" alt="Logo do sistema"></header-logo>
  <header-link slot="links" label="Início" href="/"></header-link>
</br-header>

<!-- Menu lateral -->
<br-menu id="menu-principal">
  <menu-header slot="header">Nome do Sistema</menu-header>
  <menu-item slot="items" label="Início"       icon="home"   href="/"></menu-item>
  <menu-item slot="items" label="Processos"    icon="folder" href="/processos"></menu-item>
  <menu-item slot="items" label="Usuários"     icon="user"   href="/usuarios"></menu-item>
</br-menu>
```

### Breadcrumb

```html
<br-breadcrumb>
  <crumb label="Início"     href="/"></crumb>
  <crumb label="Processos"  href="/processos"></crumb>
  <crumb label="Detalhes"   current></crumb>
</br-breadcrumb>
```

### Table (grid)

```html
<br-table density="medium" [data]="processos">
  <table-header>
    <table-header-cell>Descrição</table-header-cell>
    <table-header-cell>Status</table-header-cell>
    <table-header-cell>Ações</table-header-cell>
  </table-header>
  <table-body>
    <table-row *ngFor="let p of processos">
      <table-cell>{{ p.descricao }}</table-cell>
      <table-cell>
        <br-tag [label]="p.status" [color]="statusColor(p.status)"></br-tag>
      </table-cell>
      <table-cell>
        <br-button emphasis="tertiary" circle icon="pencil"
          (brClick)="editar(p.id)">
        </br-button>
        <br-button emphasis="tertiary" circle icon="trash" danger
          [loading]="deletingId === p.id"
          (brClick)="excluir(p.id)">
        </br-button>
      </table-cell>
    </table-row>
  </table-body>
</br-table>
```

### Pagination

```html
<br-pagination
  [total]="total"
  [page]="pagina"
  [page-count]="itensPorPagina"
  (brPage)="mudarPagina($event.detail)">
</br-pagination>
```

### Message / Toast

```html
<!-- Mensagem inline (validação de formulário) -->
<br-message state="danger" [show-icon]="true">
  Campo obrigatório.
</br-message>

<!-- Notification (toast) — posicionado globalmente -->
<br-notification [show]="notificacaoVisivel"
                 [state]="notificacaoTipo"
                 [timer]="4000"
                 (brClose)="notificacaoVisivel = false">
  {{ notificacaoMensagem }}
</br-notification>
```

### Loading

```html
<!-- Spinner de carregamento -->
<br-loading *ngIf="carregando" label="Carregando..."></br-loading>

<!-- Skeleton (skeleton não tem componente oficial — usar br-loading ou CSS) -->
```

---

## Integração com Reactive Forms

<cite index="3-1">O wrapper inclui Control Value Accessors para integração com Reactive Forms e ngModel. Quando um componente é inválido, o wrapper aplica a estilização de erro e envia os atributos ARIA corretos automaticamente.</cite>

```typescript
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <br-input
        label="E-mail"
        type="email"
        formControlName="email"
        [state]="emailState">
      </br-input>
      <br-message *ngIf="mostrarErroEmail" state="danger" [show-icon]="true">
        E-mail inválido.
      </br-message>

      <br-button type="submit" emphasis="primary" [disabled]="form.invalid">
        Entrar
      </br-button>
    </form>
  `
})
export class LoginComponent {
  form = inject(FormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  })

  get emailState() {
    const c = this.form.get('email')
    return c?.invalid && c?.touched ? 'danger' : 'info'
  }

  get mostrarErroEmail() {
    const c = this.form.get('email')
    return c?.invalid && c?.touched
  }
}
```

---

## CSP e Web Components

Web Components usam shadow DOM e scripts dinâmicos. Se CSP estiver ativo,
adicionar ao `connect-src` e garantir que `script-src` permita o nonce
dos Web Components:

```
Content-Security-Policy: ...script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'unsafe-inline'...
```

O `'unsafe-inline'` em `style-src` já está previsto no padrão do projeto
(necessário para Tailwind/Radix) — vale igualmente para o shadow DOM dos
Web Components do DSGOV.

---

## Acessibilidade (eMAG)

<cite index="1-1">O Padrão Digital de Governo segue a documentação oficial em https://www.gov.br/ds. Os Web Components já encapsulam os atributos ARIA corretos para cada componente.</cite>

Para sistemas públicos brasileiros, o eMAG (Modelo de Acessibilidade em
Governo Eletrônico) complementa o WCAG 2.2. Os Web Components já seguem
o eMAG internamente — não adicionar atributos ARIA manualmente, pois pode
conflitar com os que o componente já define.

---

## Checklist

- [ ] Três pacotes instalados: `@govbr-ds/core`, `@govbr-ds/webcomponents`, `@govbr-ds/webcomponents-angular`
- [ ] `@import '@govbr-ds/core/dist/core.min.css'` no `styles.scss`
- [ ] `defineCustomElements(window)` chamado antes do bootstrap em `app.config.ts`
- [ ] `CUSTOM_ELEMENTS_SCHEMA` nos componentes que usam tags `<br-*>`
- [ ] Modal declarado no componente raiz da página (nunca dentro do menu/sidebar)
- [ ] Inputs usando `formControlName` com o wrapper Angular (não classes CSS manuais)
- [ ] Estado de validação (`state="danger"`) passado via binding Angular
- [ ] Notificações/toasts usando `<br-notification>` no componente raiz
- [ ] Sem classes CSS `br-*` aplicadas manualmente — usar apenas os Web Components
