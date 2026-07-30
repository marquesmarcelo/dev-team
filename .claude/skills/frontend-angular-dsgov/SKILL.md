---
name: frontend-angular-dsgov
description: Use quando o project.config.md indicar sistema público ou conformidade com o Padrão Digital de Governo (DSGOV). O frontend Angular+DSGOV SEMPRE começa com git clone do quickstart oficial. Para standalone Angular, importar componentes individualmente de @govbr-ds/webcomponents-angular/standalone — nunca usar CUSTOM_ELEMENTS_SCHEMA nem defineCustomElements(). Leia junto com frontend-angular/SKILL.md.
---

# Frontend Angular + DSGOV Web Components (Standalone)

> Leia junto com `frontend-angular/SKILL.md`.
>
> **Referências obrigatórias — ler antes de qualquer implementação:**
> - Guia de implementação: https://gitlab.com/govbr-ds/bibliotecas/wbc/govbr-ds-wbc-quickstart-angular/-/blob/main/GUIA-IMPLEMENTACAO.md
> - Componentes: https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/components/
> - Design System: https://www.gov.br/ds/home

---

## Ponto de partida obrigatório — clone do quickstart oficial

**Nunca usar `ng new` para projetos Angular+DSGOV.**

```bash
git clone git@gitlab.com:govbr-ds/bibliotecas/wbc/govbr-ds-wbc-quickstart-angular.git nome-do-projeto
cd nome-do-projeto
npm install
npm start   # validar que funciona antes de qualquer mudança
```

Com o projeto rodando, conectar ao repositório do projeto:

```bash
rm -rf .git
git init
git remote add origin <url-do-repositorio-do-projeto>
git add .
git commit -m "chore: init do quickstart DSGOV"
git push -u origin main
```

### O que ajustar no quickstart

Apenas os `<menu-item>` de exemplo — manter o componente `<br-menu>` e toda a
estrutura ao redor exatamente como veio. Substituir somente os itens pelos
itens reais do projeto:

```html
<br-menu id="menu-lateral">
  <menu-header slot="header">Nome do Sistema</menu-header>
  <!-- Apagar os itens de exemplo e colocar os do projeto -->
  <menu-item slot="items" label="Início"    icon="home"   href="/"></menu-item>
  <menu-item slot="items" label="Processos" icon="folder" href="/processos"></menu-item>
  <menu-item slot="items" label="Usuários"  icon="users"  href="/usuarios"></menu-item>
</br-menu>
```

---

## Arquitetura correta para standalone Angular

<cite index="16-1">Para standalone Angular, importar componentes individualmente do subpath `/standalone` — o wrapper Angular cuida do registro dos custom elements internamente, sem necessidade de `CUSTOM_ELEMENTS_SCHEMA` nem `defineCustomElements()`.</cite>

```typescript
// ❌ ERRADO — abordagem anterior, causa problemas
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { defineCustomElements } from '@govbr-ds/webcomponents/loader'
defineCustomElements()  // não necessário com o wrapper Angular

// ✅ CORRETO — importar do subpath /standalone
import { BrButton, BrInput, BrSelect, BrModal }
  from '@govbr-ds/webcomponents-angular/standalone'

@Component({
  standalone: true,
  imports: [BrButton, BrInput, ReactiveFormsModule],
  // schemas: [] — NÃO precisa de CUSTOM_ELEMENTS_SCHEMA
  template: `<br-button emphasis="primary">Salvar</br-button>`
})
export class ProcessoFormComponent {}
```

### Reactive Forms com Web Components

<cite index="18-1">Para habilitar `ngModel` e two-way binding, adicionar `FormsModule` e o atributo `ngDefaultControl` no componente de formulário.</cite>

**⚠️ Atenção — Value Accessors explícitos obrigatórios para `br-select`, `br-radio` e `br-checkbox`:**

`br-input` e `br-textarea` funcionam com `ngDefaultControl` genérico. Mas
`br-select`, `br-radio` e `br-checkbox` têm API interna própria — sem importar
o Value Accessor correto, o `formControlName` usa um fallback genérico do Angular
que não entende essa API, causando binding inconsistente (valor não atualiza,
validação não dispara corretamente).

```typescript
// Importar o componente E seu Value Accessor específico
import {
  BrInput,                              // ngDefaultControl genérico OK
  BrTextarea,                           // ngDefaultControl genérico OK
  BrSelect,   SelectValueAccessor,      // ← Value Accessor obrigatório
  BrRadio,    RadioValueAccessor,       // ← Value Accessor obrigatório
  BrCheckbox, BooleanValueAccessor,     // ← Value Accessor obrigatório
  BrButton,
  BrMessage,
} from '@govbr-ds/webcomponents-angular/standalone'

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    BrInput,
    BrSelect,   SelectValueAccessor,    // sempre juntos
    BrRadio,    RadioValueAccessor,     // sempre juntos
    BrCheckbox, BooleanValueAccessor,   // sempre juntos
    BrButton,
    BrMessage,
  ],
  template: `
    <form [formGroup]="form">
      <!-- Input: ngDefaultControl genérico é suficiente -->
      <br-input label="Nome" formControlName="nome"
        ngDefaultControl [state]="fieldState('nome')">
      </br-input>

      <!-- Select: OBRIGATÓRIO ter SelectValueAccessor no imports -->
      <br-select label="Status" formControlName="status"
        ngDefaultControl [state]="fieldState('status')">
        <select-option value="aberto">Aberto</select-option>
        <select-option value="encerrado">Encerrado</select-option>
      </br-select>

      <!-- Radio: OBRIGATÓRIO ter RadioValueAccessor no imports -->
      <br-radio label="Masculino" value="M" formControlName="genero"
        ngDefaultControl>
      </br-radio>
      <br-radio label="Feminino"  value="F" formControlName="genero"
        ngDefaultControl>
      </br-radio>

      <!-- Checkbox: OBRIGATÓRIO ter BooleanValueAccessor no imports -->
      <br-checkbox label="Ativo" formControlName="ativo"
        ngDefaultControl>
      </br-checkbox>
    </form>
  `
})
export class FormularioComponent {
  form = inject(FormBuilder).group({
    nome:   ['', Validators.required],
    status: ['', Validators.required],
    genero: [''],
    ativo:  [false],
  })

  fieldState(field: string): 'info' | 'danger' {
    const c = this.form.get(field)
    return c?.invalid && c?.touched ? 'danger' : 'info'
  }
  showError(field: string): boolean {
    const c = this.form.get(field)
    return !!(c?.invalid && c?.touched)
  }
}
```

**Regra prática:**

| Componente | Import necessário | Value Accessor |
|---|---|---|
| `BrInput` | `BrInput` | `ngDefaultControl` genérico |
| `BrTextarea` | `BrTextarea` | `ngDefaultControl` genérico |
| `BrSelect` | `BrSelect, SelectValueAccessor` | **obrigatório** |
| `BrRadio` | `BrRadio, RadioValueAccessor` | **obrigatório** |
| `BrCheckbox` | `BrCheckbox, BooleanValueAccessor` | **obrigatório** |
| `BrSwitch` | `BrSwitch, BooleanValueAccessor` | **obrigatório** |

### `tsconfig.json` — skipLibCheck obrigatório

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

---

## Configuração do quickstart (referência — não alterar)

O quickstart já entrega tudo correto. Registrado aqui apenas para referência:

### `angular.json` — CSS via `styles`

```json
"styles": [
  "node_modules/@govbr-ds/core/dist/core-tokens.min.css",
  "src/styles.scss"
]
```

> `core-tokens.min.css` — não `core.min.css`. Diferença causa ausência total de estilos.

### `src/styles.scss` — apenas estilos customizados

```scss
// O CSS do DSGOV já está no angular.json
// Adicionar aqui apenas sobrescritas específicas do projeto
```

---

## Padrão obrigatório — Breadcrumb na área útil

Toda página autenticada tem `<br-breadcrumb>` como **primeiro elemento** da área de conteúdo:

```typescript
import { BrBreadcrumb } from '@govbr-ds/webcomponents-angular/standalone'

@Component({
  standalone: true,
  imports: [BrBreadcrumb],
  template: `
    <main id="main-content">
      <br-breadcrumb>
        <crumb label="Início"    href="/"></crumb>
        <crumb label="Processos" href="/processos"></crumb>
        <crumb label="Novo processo" current></crumb>
      </br-breadcrumb>

      <h1>Novo Processo</h1>
      <!-- conteúdo da página -->
    </main>
  `
})
```

| Tipo de página | Breadcrumb |
|---|---|
| Listagem | Início → Seção |
| Criação | Início → Seção → Novo |
| Edição | Início → Seção → Nome do registro |

---

## Catálogo de imports `/standalone`

Importar apenas os componentes usados em cada componente Angular:

```typescript
import {
  // Layout e navegação
  BrHeader, BrMenu, BrBreadcrumb, BrFooter, BrTab,

  // Formulários
  BrInput, BrTextarea, BrSelect, BrCheckbox, BrCheckgroup,
  BrRadio, BrSwitch, BrDatePicker, BrDatetimeInput,
  BrUpload, BrSlider,

  // Botões e ações
  BrButton, BrDropdown,

  // Feedback
  BrMessage, BrNotification, BrModal, BrLoading, BrTag, BrTooltip,

  // Dados e listagem
  BrTable, BrPagination, BrCard, BrList,

  // Progresso
  BrStep, BrWizard, BrCollapse,

  // Outros
  BrAvatar, BrIcon, BrDivider, BrScrim,
  BrSkipLinkItem, BrCookiebar, BrSignIn,

} from '@govbr-ds/webcomponents-angular/standalone'
```

---

## Exemplos de componentes mais usados

### Button

```typescript
import { BrButton } from '@govbr-ds/webcomponents-angular/standalone'

@Component({
  standalone: true,
  imports: [BrButton],
  template: `
    <br-button emphasis="primary"   (brClick)="salvar()">Salvar</br-button>
    <br-button emphasis="secondary" (brClick)="cancelar()">Cancelar</br-button>
    <br-button emphasis="tertiary"  danger (brClick)="excluir()">Excluir</br-button>
    <br-button emphasis="primary"   [loading]="salvando()" (brClick)="salvar()">Salvar</br-button>

    <!-- Botões de linha no grid — loading por ID -->
    <br-button emphasis="tertiary" circle icon="pencil"
      [loading]="editingId() === item.id" (brClick)="editar(item.id)">
    </br-button>
    <br-button emphasis="tertiary" circle icon="trash" danger
      [loading]="deletingId() === item.id" (brClick)="excluir(item.id)">
    </br-button>
  `
})
```

### Formulário completo

```typescript
import { BrInput, BrSelect, BrButton, BrMessage }
  from '@govbr-ds/webcomponents-angular/standalone'

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, BrInput, BrSelect, BrButton, BrMessage],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <br-input label="Nome" formControlName="nome"
        ngDefaultControl [state]="fieldState('nome')">
      </br-input>
      <br-message *ngIf="showError('nome')" state="danger" [show-icon]="true">
        Nome obrigatório.
      </br-message>

      <br-select label="Status" formControlName="status"
        ngDefaultControl [state]="fieldState('status')">
        <select-option value="aberto">Aberto</select-option>
        <select-option value="encerrado">Encerrado</select-option>
      </br-select>

      <br-button type="submit" emphasis="primary" [loading]="salvando()" (brClick)="onSubmit()">
        Salvar
      </br-button>
    </form>
  `
})
export class ProcessoFormComponent {
  salvando = signal(false)
  form = inject(FormBuilder).group({
    nome:   ['', Validators.required],
    status: ['', Validators.required],
  })

  fieldState(field: string): 'info' | 'danger' {
    const c = this.form.get(field)
    return c?.invalid && c?.touched ? 'danger' : 'info'
  }
  showError(field: string): boolean {
    const c = this.form.get(field)
    return !!(c?.invalid && c?.touched)
  }
  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return }
    this.salvando.set(true)
    try {
      await this.service.criar(this.form.value)
      this.notify.sucesso('Criado', 'Registro salvo com sucesso.')
    } catch {
      this.notify.erro('Erro', 'Tente novamente.')
    } finally { this.salvando.set(false) }
  }
}
```

### Modal

```typescript
import { BrModal, BrButton } from '@govbr-ds/webcomponents-angular/standalone'

// ⚠️ Declarar no componente da PÁGINA — nunca dentro do menu ou header
@Component({
  standalone: true,
  imports: [BrModal, BrButton],
  template: `
    <br-modal title="Confirmar exclusão"
      [visible]="modalAberto" (brClose)="modalAberto = false">
      <span slot="content">Deseja excluir este registro? Ação irreversível.</span>
      <span slot="footer">
        <br-button emphasis="secondary" (brClick)="modalAberto = false">Cancelar</br-button>
        <br-button emphasis="primary" danger
          [loading]="excluindo" (brClick)="confirmar()">Excluir</br-button>
      </span>
    </br-modal>
  `
})
```

### Notification (toast — declarar no AppComponent raiz)

```typescript
import { BrNotification } from '@govbr-ds/webcomponents-angular/standalone'

// notify.service.ts
@Injectable({ providedIn: 'root' })
export class NotifyService {
  visivel  = signal(false)
  tipo     = signal<'success'|'danger'|'warning'|'info'>('info')
  titulo   = signal('')
  mensagem = signal('')
  duracao  = signal(4000)

  private show(tipo: 'success'|'danger'|'warning'|'info', t: string, m: string, ms = 4000) {
    this.tipo.set(tipo); this.titulo.set(t)
    this.mensagem.set(m); this.duracao.set(ms)
    this.visivel.set(true)
  }
  fechar()  { this.visivel.set(false) }
  sucesso(t: string, m: string) { this.show('success', t, m, 4000) }
  erro(t: string, m: string)    { this.show('danger',  t, m, 8000) }
  aviso(t: string, m: string)   { this.show('warning', t, m, 6000) }
  info(t: string, m: string)    { this.show('info',    t, m, 4000) }
}
```

```html
<!-- app.component.html -->
<br-notification [show]="notif.visivel()" [state]="notif.tipo()"
  [timer]="notif.duracao()" (brClose)="notif.fechar()">
  <notification-header slot="header">{{ notif.titulo() }}</notification-header>
  <notification-body   slot="body">{{ notif.mensagem() }}</notification-body>
</br-notification>
```

### Table com loading por linha

```typescript
import { BrTable, BrButton, BrTag } from '@govbr-ds/webcomponents-angular/standalone'

@Component({
  standalone: true,
  imports: [CommonModule, BrTable, BrButton, BrTag],
  template: `
    <br-table density="medium">
      <table-header>
        <table-header-cell>Descrição</table-header-cell>
        <table-header-cell>Status</table-header-cell>
        <table-header-cell>Ações</table-header-cell>
      </table-header>
      <table-body>
        <table-row *ngFor="let p of processos()">
          <table-cell>{{ p.descricao }}</table-cell>
          <table-cell>
            <br-tag [label]="p.status" [color]="statusColor(p.status)"></br-tag>
          </table-cell>
          <table-cell>
            <br-button emphasis="tertiary" circle icon="pencil"
              [loading]="editingId() === p.id" (brClick)="editar(p.id)">
            </br-button>
            <br-button emphasis="tertiary" circle icon="trash" danger
              [loading]="deletingId() === p.id" (brClick)="excluir(p.id)">
            </br-button>
          </table-cell>
        </table-row>
      </table-body>
    </br-table>

    <br-pagination [total]="total()" [page]="pagina()"
      [page-count]="20" (brPage)="mudarPagina($event.detail)">
    </br-pagination>
  `
})
```

---

## Skip Link e CookieBar — obrigatórios no AppComponent

```typescript
import { BrSkipLinkItem, BrCookiebar, BrNotification }
  from '@govbr-ds/webcomponents-angular/standalone'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BrSkipLinkItem, BrCookiebar, BrNotification, ...],
  template: `
    <!-- Primeiro elemento do AppComponent — acessibilidade eMAG -->
    <br-skip-link-item label="Ir para o conteúdo" href="#main-content">
    </br-skip-link-item>

    <!-- Header e menu do quickstart -->
    <br-header>...</br-header>
    <br-menu>...</br-menu>

    <main id="main-content">
      <router-outlet></router-outlet>
    </main>

    <!-- Notificações globais -->
    <br-notification ...></br-notification>

    <!-- CookieBar — quando necessário (LGPD) -->
    <br-cookiebar>
      <cookiebar-header slot="header">Cookies</cookiebar-header>
      <cookiebar-note slot="notes">Usamos cookies para melhorar sua experiência.</cookiebar-note>
    </br-cookiebar>
  `
})
export class AppComponent {}
```

---

## Checklist

- [ ] Projeto iniciado com `git clone` do quickstart oficial
- [ ] `npm start` funcionando antes de qualquer alteração
- [ ] Apenas os `<menu-item>` substituídos — estrutura do quickstart intacta
- [ ] Componentes importados de `@govbr-ds/webcomponents-angular/standalone`
- [ ] `ngDefaultControl` em todo input dentro de Reactive Forms
- [ ] `SelectValueAccessor`, `RadioValueAccessor`, `BooleanValueAccessor` importados
      **junto** com `BrSelect`, `BrRadio`, `BrCheckbox`, `BrSwitch` em todo componente
      com formulário — sem eles o binding é inconsistente
- [ ] `skipLibCheck: true` no `tsconfig.json`
- [ ] **NÃO** usar `CUSTOM_ELEMENTS_SCHEMA`
- [ ] **NÃO** usar `defineCustomElements()`
- [ ] **NÃO** usar `WebcomponentsAngularModule.forRoot()`
- [ ] `<br-modal>` declarado no componente da página (nunca dentro do menu)
- [ ] `<br-notification>` no `AppComponent` raiz
- [ ] `<br-skip-link-item>` como primeiro elemento do `AppComponent`
- [ ] `<br-breadcrumb>` como primeiro elemento da área de conteúdo em toda página autenticada
