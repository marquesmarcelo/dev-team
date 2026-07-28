---
name: frontend-angular-dsgov
description: Use quando o project.config.md indicar sistema público ou conformidade com o Padrão Digital de Governo (DSGOV). Usa @govbr-ds/webcomponents-angular com standalone Angular (bootstrapApplication). Leia junto com frontend-angular/SKILL.md.
---

# Frontend Angular + DSGOV Web Components (Standalone)

> Leia junto com `frontend-angular/SKILL.md`.
>
> Referências oficiais:
> - Componentes: https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/components/
> - Início: https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/comecar
> - Design System: https://www.gov.br/ds/home

---

## Problema crítico — standalone Angular não inicializa os Web Components

Em apps standalone (`bootstrapApplication` + `app.config.ts`), o
`WebcomponentsAngularModule.forRoot()` nunca é chamado — então
`defineCustomElements()` nunca executa. Resultado: `<br-modal>`,
`<br-input>`, `<br-button>` ficam como tags HTML não reconhecidas
(sem Shadow DOM, sem estilo, sem comportamento).

**A correção obrigatória é chamar `defineCustomElements()` no `main.ts`
ANTES de `bootstrapApplication()`:**

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser'
import { defineCustomElements } from '@govbr-ds/webcomponents/loader'
import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'

// ← OBRIGATÓRIO: registrar os custom elements ANTES do bootstrap
// Sem isso, todas as tags <br-*> ficam como HTML desconhecido
defineCustomElements()

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err))
```

Sem o `defineCustomElements()` no `main.ts`, nenhum componente DSGOV
funciona — independente de qualquer outra configuração.

---

## Instalação

```bash
npm install @govbr-ds/core @govbr-ds/webcomponents @govbr-ds/webcomponents-angular
```

Os três pacotes são necessários:
- `@govbr-ds/core` — tokens CSS, fontes, ícones
- `@govbr-ds/webcomponents` — Custom Elements (e o `/loader` com `defineCustomElements`)
- `@govbr-ds/webcomponents-angular` — wrappers Angular + Control Value Accessors

---

## Configuração completa

### `main.ts` — ponto crítico

```typescript
import { bootstrapApplication } from '@angular/platform-browser'
import { defineCustomElements } from '@govbr-ds/webcomponents/loader'
import { AppComponent } from './app/app.component'
import { appConfig } from './app/app.config'

defineCustomElements()   // ← sem essa linha, nada funciona

bootstrapApplication(AppComponent, appConfig).catch(console.error)
```

### `styles.scss` — estilos globais

```scss
@import '@govbr-ds/core/dist/core.min.css';

// NÃO aplicar classes br-* manualmente — usar os Web Components
```

### `app.config.ts`

```typescript
import { ApplicationConfig } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { routes } from './app.routes'
import { loadingProgressInterceptor } from './core/http/loading-progress.interceptor'

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingProgressInterceptor])),
    // NÃO importar WebcomponentsAngularModule.forRoot() aqui —
    // standalone não usa NgModule; o defineCustomElements() no main.ts já resolve
  ]
}
```

### Componentes standalone — `CUSTOM_ELEMENTS_SCHEMA`

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'

@Component({
  selector: 'app-processo-list',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],   // ← permite tags <br-*> no template
  imports: [CommonModule, ReactiveFormsModule],
  template: `...`
})
export class ProcessoListComponent {}
```

---

## Catálogo de componentes (40 disponíveis)

Todos com API estável. Consulte exemplos detalhados em
https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/components/

### Layout e navegação

**Header**
```html
<br-header>
  <header-logo slot="logo" src="/assets/logo-gov.svg" alt="Governo Federal"></header-logo>
  <header-link slot="links" label="Início" href="/"></header-link>
  <header-function slot="functions" icon="user" label="Perfil"></header-function>
</br-header>
```

**Menu (sidebar)**
```html
<!-- Declarar no AppComponent — nunca dentro de um componente de feature -->
<br-menu id="menu-lateral">
  <menu-header slot="header">Nome do Sistema</menu-header>
  <menu-item slot="items" label="Início"    icon="home"   href="/"></menu-item>
  <menu-item slot="items" label="Processos" icon="folder" href="/processos"></menu-item>
  <menu-item slot="items" label="Usuários"  icon="users"  href="/usuarios"></menu-item>
</br-menu>
```

**Breadcrumb**
```html
<br-breadcrumb>
  <crumb label="Início"    href="/"></crumb>
  <crumb label="Processos" href="/processos"></crumb>
  <crumb label="Novo"      current></crumb>
</br-breadcrumb>
```

**Footer**
```html
<br-footer>
  <footer-logo slot="logo" src="/assets/logo-gov.svg"></footer-logo>
  <footer-legal slot="legal">© 2026 Nome do Órgão</footer-legal>
</br-footer>
```

**Tab**
```html
<br-tab>
  <tab-item label="Dados" active></tab-item>
  <tab-item label="Histórico"></tab-item>
  <tab-item label="Anexos"></tab-item>
</br-tab>
```

---

### Formulários

**Input** (integra com Reactive Forms via Control Value Accessor)
```html
<form [formGroup]="form">
  <br-input
    label="Nome completo"
    formControlName="nome"
    [state]="fieldState('nome')">
  </br-input>
  <br-message *ngIf="showError('nome')" state="danger" [show-icon]="true">
    Nome é obrigatório.
  </br-message>

  <br-input
    label="E-mail"
    type="email"
    formControlName="email"
    [state]="fieldState('email')">
  </br-input>

  <br-input
    label="CPF"
    type="cpf"
    formControlName="cpf"
    placeholder="000.000.000-00"
    [state]="fieldState('cpf')">
  </br-input>
</form>
```

```typescript
// Helper reutilizável — adicionar ao componente
fieldState(field: string): 'info' | 'danger' {
  const c = this.form.get(field)
  return c?.invalid && c?.touched ? 'danger' : 'info'
}

showError(field: string): boolean {
  const c = this.form.get(field)
  return !!(c?.invalid && c?.touched)
}
```

**Textarea**
```html
<br-textarea
  label="Descrição"
  formControlName="descricao"
  rows="4"
  [state]="fieldState('descricao')">
</br-textarea>
```

**Select**
```html
<br-select label="Status" formControlName="status" [state]="fieldState('status')">
  <select-option value="">Selecione...</select-option>
  <select-option value="aberto">Aberto</select-option>
  <select-option value="em_andamento">Em andamento</select-option>
  <select-option value="encerrado">Encerrado</select-option>
</br-select>
```

**Checkbox e Checkbox-group**
```html
<br-checkbox
  label="Aceito os termos"
  formControlName="aceiteTermos">
</br-checkbox>

<br-checkgroup label="Permissões">
  <br-checkbox label="Leitura"  value="read"  name="perms"></br-checkbox>
  <br-checkbox label="Escrita"  value="write" name="perms"></br-checkbox>
</br-checkgroup>
```

**Radio**
```html
<br-radio label="Masculino" value="M" formControlName="genero"></br-radio>
<br-radio label="Feminino"  value="F" formControlName="genero"></br-radio>
```

**Switch**
```html
<br-switch label="Ativo" formControlName="ativo"></br-switch>
```

**DateTimePicker**
```html
<br-date-picker label="Data de nascimento" formControlName="dataNascimento"></br-date-picker>
<br-datetime-input label="Data e hora"     formControlName="dataHora"></br-datetime-input>
```

**Upload**
```html
<br-upload
  label="Anexar documento"
  accept=".pdf,.doc,.docx"
  (brChange)="onFileChange($event)">
</br-upload>
```

**Slider**
```html
<br-slider label="Quantidade" min="0" max="100" formControlName="quantidade"></br-slider>
```

---

### Feedback e comunicação

**Button**
```html
<!-- Primário -->
<br-button emphasis="primary" (brClick)="salvar()">Salvar</br-button>

<!-- Secundário -->
<br-button emphasis="secondary" (brClick)="cancelar()">Cancelar</br-button>

<!-- Terciário / destrutivo -->
<br-button emphasis="tertiary" danger (brClick)="excluir()">Excluir</br-button>

<!-- Com loading — substitui o LoadingButton do Angular padrão no DSGOV -->
<br-button emphasis="primary" [loading]="salvando" (brClick)="salvar()">
  Salvar
</br-button>

<!-- Ícone circular (botões de ação em grid) -->
<br-button emphasis="tertiary" circle icon="pencil"
  [loading]="editingId === item.id"
  (brClick)="editar(item.id)">
</br-button>

<br-button emphasis="tertiary" circle icon="trash" danger
  [loading]="deletingId === item.id"
  (brClick)="excluir(item.id)">
</br-button>
```

**Message** (inline, dentro do formulário)
```html
<br-message state="danger"   [show-icon]="true">Campo obrigatório.</br-message>
<br-message state="warning"  [show-icon]="true">Atenção: dado desatualizado.</br-message>
<br-message state="success"  [show-icon]="true">Salvo com sucesso.</br-message>
<br-message state="info"     [show-icon]="true">Preencha todos os campos.</br-message>
```

**Notification** (toast — declarar no AppComponent raiz)
```html
<!-- app.component.html -->
<br-notification
  [show]="notif.visivel"
  [state]="notif.tipo"
  [timer]="notif.duracao"
  (brClose)="notif.fechar()">
  <notification-header slot="header">{{ notif.titulo }}</notification-header>
  <notification-body slot="body">{{ notif.mensagem }}</notification-body>
</br-notification>
```

```typescript
// core/services/notify.service.ts
@Injectable({ providedIn: 'root' })
export class NotifyService {
  visivel  = signal(false)
  tipo     = signal<'success'|'danger'|'warning'|'info'>('info')
  titulo   = signal('')
  mensagem = signal('')
  duracao  = signal(4000)

  private show(tipo: 'success'|'danger'|'warning'|'info', titulo: string, msg: string, ms = 4000) {
    this.tipo.set(tipo); this.titulo.set(titulo)
    this.mensagem.set(msg); this.duracao.set(ms)
    this.visivel.set(true)
  }

  fechar()  { this.visivel.set(false) }
  sucesso(t: string, m: string) { this.show('success', t, m, 4000) }
  erro(t: string, m: string)    { this.show('danger',  t, m, 8000) }
  aviso(t: string, m: string)   { this.show('warning', t, m, 6000) }
  info(t: string, m: string)    { this.show('info',    t, m, 4000) }
}
```

**Loading**
```html
<!-- Spinner de carregamento -->
<br-loading *ngIf="carregando" label="Carregando..."></br-loading>
```

**Modal** (declarar no componente da página, nunca dentro do menu)
```html
<!-- ⚠️ Nunca aninhar br-modal dentro de br-menu ou br-header -->
<!-- Declarar no template do componente de página ou no AppComponent -->
<br-modal
  title="Confirmar exclusão"
  [visible]="modalAberto"
  (brClose)="modalAberto = false">

  <span slot="content">
    Deseja excluir "{{ itemSelecionado?.nome }}"? Esta ação não pode ser desfeita.
  </span>

  <span slot="footer">
    <br-button emphasis="secondary" (brClick)="modalAberto = false">Cancelar</br-button>
    <br-button emphasis="primary" danger
      [loading]="excluindo"
      (brClick)="confirmarExclusao()">
      Excluir
    </br-button>
  </span>
</br-modal>
```

**Tag**
```html
<br-tag label="Aberto"       color="success"></br-tag>
<br-tag label="Em andamento" color="warning"></br-tag>
<br-tag label="Encerrado"    color="danger"></br-tag>
```

**Tooltip**
```html
<br-tooltip text="Clique para editar este registro" place="top">
  <br-button emphasis="tertiary" circle icon="pencil"></br-button>
</br-tooltip>
```

**Dropdown**
```html
<br-dropdown label="Ações">
  <br-item label="Editar"  icon="pencil"  (brClick)="editar(item)"></br-item>
  <br-item label="Exportar" icon="download" (brClick)="exportar(item)"></br-item>
  <br-divider></br-divider>
  <br-item label="Excluir" icon="trash" danger (brClick)="excluir(item)"></br-item>
</br-dropdown>
```

**Sign-in** (autenticação gov.br)
```html
<br-sign-in
  label="Entrar com gov.br"
  (brClick)="loginGovBr()">
</br-sign-in>
```

---

### Dados e listagem

**Table**
```html
<br-table density="medium">
  <table-header>
    <table-header-cell>Descrição</table-header-cell>
    <table-header-cell>Status</table-header-cell>
    <table-header-cell>Data</table-header-cell>
    <table-header-cell>Ações</table-header-cell>
  </table-header>
  <table-body>
    <table-row *ngFor="let p of processos()">
      <table-cell>{{ p.descricao }}</table-cell>
      <table-cell><br-tag [label]="p.status" [color]="statusColor(p.status)"></br-tag></table-cell>
      <table-cell>{{ p.criadoEm | date:'dd/MM/yyyy' }}</table-cell>
      <table-cell>
        <br-button emphasis="tertiary" circle icon="pencil"
          [loading]="editingId() === p.id"
          (brClick)="editar(p.id)">
        </br-button>
        <br-button emphasis="tertiary" circle icon="trash" danger
          [loading]="deletingId() === p.id"
          (brClick)="excluir(p.id)">
        </br-button>
      </table-cell>
    </table-row>
  </table-body>
</br-table>
```

**Pagination**
```html
<br-pagination
  [total]="total()"
  [page]="pagina()"
  [page-count]="itensPorPagina"
  (brPage)="mudarPagina($event.detail)">
</br-pagination>
```

**Card**
```html
<br-card>
  <span slot="header">Título do Card</span>
  <span slot="content">Conteúdo do card com informações relevantes.</span>
  <span slot="footer">
    <br-button emphasis="primary">Ver detalhes</br-button>
  </span>
</br-card>
```

**List**
```html
<br-list>
  <br-item *ngFor="let item of itens" [label]="item.nome" [description]="item.descricao">
  </br-item>
</br-list>
```

---

### Navegação e progresso

**Step** (wizard de etapas)
```html
<br-step>
  <step-item label="Identificação" status="success" step="1"></step-item>
  <step-item label="Dados"         status="active"  step="2"></step-item>
  <step-item label="Confirmação"   status="pending" step="3"></step-item>
</br-step>
```

**Wizard**
```html
<br-wizard>
  <wizard-panel label="Identificação" active>
    <!-- conteúdo da etapa 1 -->
  </wizard-panel>
  <wizard-panel label="Dados">
    <!-- conteúdo da etapa 2 -->
  </wizard-panel>
</br-wizard>
```

**Collapse**
```html
<br-collapse label="Ver detalhes">
  <span slot="content">Conteúdo expandível aqui.</span>
</br-collapse>
```

---

### Outros

**Avatar**
```html
<br-avatar name="João Silva" size="medium"></br-avatar>
<br-avatar src="/assets/foto.jpg" size="large"></br-avatar>
```

**Icon**
```html
<br-icon name="home" size="medium"></br-icon>
<br-icon name="user" size="large" color="primary"></br-icon>
```

**Divider**
```html
<br-divider></br-divider>
<br-divider dashed></br-divider>
```

**CookieBar**
```html
<!-- Declarar no AppComponent — uma vez na aplicação -->
<br-cookiebar>
  <cookiebar-header slot="header">Política de Cookies</cookiebar-header>
  <cookiebar-note slot="notes">Este site utiliza cookies para melhorar sua experiência.</cookiebar-note>
</br-cookiebar>
```

**Scrim** (overlay de foco)
```html
<br-scrim [active]="modalAberto" (brClick)="fecharModal()"></br-scrim>
```

**Skip Link** (acessibilidade)
```html
<br-skip-link-item label="Ir para o conteúdo" href="#main-content"></br-skip-link-item>
```

---

## Integração com Reactive Forms

O wrapper inclui Control Value Accessors — os campos integram
diretamente com `formControlName`. O estado de validação (`state`)
deve ser passado como binding Angular:

```typescript
@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <br-input label="Nome" formControlName="nome" [state]="fieldState('nome')"></br-input>
      <br-message *ngIf="showError('nome')" state="danger" [show-icon]="true">
        Nome obrigatório.
      </br-message>

      <br-select label="Status" formControlName="status" [state]="fieldState('status')">
        <select-option value="aberto">Aberto</select-option>
      </br-select>

      <br-button type="submit" emphasis="primary" [loading]="salvando()" (brClick)="onSubmit()">
        Salvar
      </br-button>
    </form>
  `
})
export class ProcessoFormComponent {
  private fb = inject(FormBuilder)
  salvando = signal(false)

  form = this.fb.group({
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
      this.notify.sucesso('Processo criado', 'Registro salvo com sucesso.')
    } catch (e) {
      this.notify.erro('Erro ao salvar', 'Tente novamente.')
    } finally {
      this.salvando.set(false)
    }
  }
}
```

---

## Checklist

- [ ] `defineCustomElements()` chamado em `main.ts` ANTES de `bootstrapApplication()`
- [ ] `@import '@govbr-ds/core/dist/core.min.css'` em `styles.scss`
- [ ] `CUSTOM_ELEMENTS_SCHEMA` em todo componente standalone que usa tags `<br-*>`
- [ ] `WebcomponentsAngularModule.forRoot()` **NÃO** usado — é API NgModule, incompatível com standalone
- [ ] Modal (`<br-modal>`) declarado no componente da página, **nunca** dentro de `<br-menu>` ou `<br-header>`
- [ ] Notificações (`<br-notification>`) declaradas no `AppComponent` raiz
- [ ] Botões de loading usando `[loading]="salvando"` nativo do `<br-button>`
- [ ] Estado de validação passado via `[state]="fieldState('campo')"` nos inputs
- [ ] Sem classes CSS `br-*` aplicadas manualmente — usar somente os Web Components
- [ ] `<br-skip-link-item>` no início do `AppComponent` (acessibilidade eMAG)
- [ ] `<br-cookiebar>` declarado no `AppComponent` se aplicável (LGPD)
