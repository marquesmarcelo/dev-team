---
name: frontend-angular-dsgov
description: Use quando o project.config.md indicar sistema público ou conformidade com o Padrão Digital de Governo (DSGOV). O frontend Angular+DSGOV SEMPRE começa com git clone do quickstart oficial — nunca com ng new. Leia junto com frontend-angular/SKILL.md.
---

# Frontend Angular + DSGOV Web Components (Standalone)

> Leia junto com `frontend-angular/SKILL.md`.
>
> Documentação:
> - Componentes: https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/components/
> - Design System: https://www.gov.br/ds/home

---

## Ponto de partida obrigatório — clone do quickstart oficial

**Nunca usar `ng new` para projetos Angular+DSGOV.**
O projeto começa sempre pelo clone do quickstart oficial, que já tem
toda a configuração correta: `angular.json`, `main.ts`, `styles.scss`,
pacotes instalados e estrutura validada pelo time do SERPRO.

```bash
git clone https://gitlab.com/govbr-ds/bibliotecas/wbc/govbr-ds-wbc-quickstart-angular.git nome-do-projeto
cd nome-do-projeto
npm install
npm start   # http://localhost:4200 — validar que tudo funciona antes de qualquer mudança
```

Com o projeto rodando, fazer o reset do histórico Git e conectar ao repositório do projeto:

```bash
rm -rf .git
git init
git remote add origin <url-do-repositorio-do-projeto>
git add .
git commit -m "chore: init do quickstart DSGOV"
git push -u origin main
```

### O que ajustar no quickstart

O quickstart já entrega tudo pronto — estrutura, configuração, componentes.
O único ajuste é limpar os **itens de exemplo** do menu e substituir pelos
itens reais do projeto. O componente `<br-menu>` e toda a estrutura ao redor
permanecem intocados.

```html
<!-- Manter exatamente o <br-menu> do quickstart.
     Apenas substituir os <menu-item> de exemplo pelos itens do projeto,
     definidos no nav-config criado a partir de specs/00-visao-produto.md -->

<br-menu id="menu-lateral">
  <menu-header slot="header">Nome do Sistema</menu-header>

  <!-- Apagar os itens de exemplo do quickstart e colocar os do projeto -->
  <menu-item slot="items" label="Início"    icon="home"   href="/"></menu-item>
  <menu-item slot="items" label="Processos" icon="folder" href="/processos"></menu-item>
  <menu-item slot="items" label="Usuários"  icon="users"  href="/usuarios"></menu-item>
</br-menu>
```

Nada mais do quickstart deve ser alterado. Funcionalidades entram como
novas rotas e componentes — nunca modificando a estrutura base.

---

## Padrão obrigatório — Breadcrumb na área útil

Toda página autenticada deve ter `<br-breadcrumb>` como **primeiro elemento
da área de conteúdo** (logo abaixo do header, antes de qualquer outro conteúdo).

```html
<!-- layout da página padrão -->
<main id="main-content">

  <!-- Breadcrumb: SEMPRE a primeira linha da área útil -->
  <br-breadcrumb>
    <crumb label="Início" href="/"></crumb>
    <crumb [label]="secaoAtual" [href]="secaoPath"></crumb>
    <crumb [label]="paginaAtual" current></crumb>
  </br-breadcrumb>

  <!-- Título e conteúdo da página -->
  <h1>{{ tituloDaPagina }}</h1>
  <!-- ... -->

</main>
```

**Regra de profundidade do breadcrumb:**

| Tipo de página | Breadcrumb |
|---|---|
| Listagem | Início → Nome da seção |
| Formulário de criação | Início → Nome da seção → Novo |
| Formulário de edição | Início → Nome da seção → Nome do registro |
| Detalhe | Início → Nome da seção → Nome do registro |

O `current` (sem `href`) é sempre o último item — indica a página atual
e não é clicável. Nunca omitir o breadcrumb em páginas autenticadas.

---

## Catálogo de componentes (40 disponíveis)

<cite index="92-1">40 componentes disponíveis, todos com API estável e recomendada para novos projetos.</cite>
Consulte exemplos em: https://govbr-ds.gitlab.io/bibliotecas/wbc/govbr-ds-wbc/docs/components/

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
  <tab-item label="Dados"     active></tab-item>
  <tab-item label="Histórico"></tab-item>
  <tab-item label="Anexos"></tab-item>
</br-tab>
```

---

### Formulários

**Helper de estado de validação** — adicionar ao componente

```typescript
fieldState(field: string): 'info' | 'danger' {
  const c = this.form.get(field)
  return c?.invalid && c?.touched ? 'danger' : 'info'
}

showError(field: string): boolean {
  const c = this.form.get(field)
  return !!(c?.invalid && c?.touched)
}
```

**Input**
```html
<br-input
  label="Nome completo"
  formControlName="nome"
  [state]="fieldState('nome')">
</br-input>
<br-message *ngIf="showError('nome')" state="danger" [show-icon]="true">
  Nome é obrigatório.
</br-message>
```

**Textarea**
```html
<br-textarea label="Descrição" formControlName="descricao" rows="4"
  [state]="fieldState('descricao')">
</br-textarea>
```

**Select**
```html
<br-select label="Status" formControlName="status" [state]="fieldState('status')">
  <select-option value="">Selecione...</select-option>
  <select-option value="aberto">Aberto</select-option>
  <select-option value="encerrado">Encerrado</select-option>
</br-select>
```

**Checkbox / Checkgroup**
```html
<br-checkbox label="Aceito os termos" formControlName="aceite"></br-checkbox>

<br-checkgroup label="Permissões">
  <br-checkbox label="Leitura" value="read"  name="perms"></br-checkbox>
  <br-checkbox label="Escrita" value="write" name="perms"></br-checkbox>
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
<br-date-picker     label="Data de nascimento" formControlName="dataNasc"></br-date-picker>
<br-datetime-input  label="Data e hora"        formControlName="dataHora"></br-datetime-input>
```

**Upload**
```html
<br-upload label="Anexar documento" accept=".pdf,.doc" (brChange)="onFile($event)">
</br-upload>
```

**Slider**
```html
<br-slider label="Quantidade" min="0" max="100" formControlName="qtd"></br-slider>
```

---

### Botões e ações

**Button**
```html
<br-button emphasis="primary"   (brClick)="salvar()">Salvar</br-button>
<br-button emphasis="secondary" (brClick)="cancelar()">Cancelar</br-button>
<br-button emphasis="tertiary"  danger (brClick)="excluir()">Excluir</br-button>

<!-- Com loading nativo — substitui LoadingButton do Angular padrão -->
<br-button emphasis="primary" [loading]="salvando()" (brClick)="salvar()">
  Salvar
</br-button>

<!-- Ícone circular para botões de linha no grid -->
<br-button emphasis="tertiary" circle icon="pencil"
  [loading]="editingId() === item.id" (brClick)="editar(item.id)">
</br-button>
<br-button emphasis="tertiary" circle icon="trash" danger
  [loading]="deletingId() === item.id" (brClick)="excluir(item.id)">
</br-button>
```

**Dropdown**
```html
<br-dropdown label="Ações">
  <br-item label="Editar"   icon="pencil"   (brClick)="editar(item)"></br-item>
  <br-item label="Exportar" icon="download" (brClick)="exportar(item)"></br-item>
  <br-divider></br-divider>
  <br-item label="Excluir"  icon="trash" danger (brClick)="excluir(item)"></br-item>
</br-dropdown>
```

---

### Feedback

**Message** (inline — dentro do contexto da página)
```html
<br-message state="danger"  [show-icon]="true">Campo obrigatório.</br-message>
<br-message state="warning" [show-icon]="true">Dado pode estar desatualizado.</br-message>
<br-message state="success" [show-icon]="true">Salvo com sucesso.</br-message>
<br-message state="info"    [show-icon]="true">Preencha todos os campos.</br-message>
```

**Notification** (toast — declarar no AppComponent raiz)
```typescript
// core/services/notify.service.ts
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
<br-notification
  [show]="notif.visivel()"
  [state]="notif.tipo()"
  [timer]="notif.duracao()"
  (brClose)="notif.fechar()">
  <notification-header slot="header">{{ notif.titulo() }}</notification-header>
  <notification-body   slot="body">{{ notif.mensagem() }}</notification-body>
</br-notification>
```

**Modal** (declarar na página, nunca dentro de br-menu ou br-header)
```html
<!-- ⚠️ Declarar no componente da página, não aninhado no menu -->
<br-modal title="Confirmar exclusão" [visible]="modalAberto" (brClose)="modalAberto = false">
  <span slot="content">
    Deseja excluir "{{ itemSelecionado?.nome }}"? Ação irreversível.
  </span>
  <span slot="footer">
    <br-button emphasis="secondary" (brClick)="modalAberto = false">Cancelar</br-button>
    <br-button emphasis="primary" danger [loading]="excluindo" (brClick)="confirmar()">
      Excluir
    </br-button>
  </span>
</br-modal>
```

**Loading**
```html
<br-loading *ngIf="carregando" label="Carregando..."></br-loading>
```

**Tag**
```html
<br-tag label="Aberto"       color="success"></br-tag>
<br-tag label="Em andamento" color="warning"></br-tag>
<br-tag label="Encerrado"    color="danger"></br-tag>
```

**Tooltip**
```html
<br-tooltip text="Clique para editar" place="top">
  <br-button emphasis="tertiary" circle icon="pencil"></br-button>
</br-tooltip>
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
      <table-cell>
        <br-tag [label]="p.status" [color]="statusColor(p.status)"></br-tag>
      </table-cell>
      <table-cell>{{ p.criadoEm | date:'dd/MM/yyyy' }}</table-cell>
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
  <span slot="content">Conteúdo do card.</span>
  <span slot="footer">
    <br-button emphasis="primary">Ver detalhes</br-button>
  </span>
</br-card>
```

**List**
```html
<br-list>
  <br-item *ngFor="let i of itens" [label]="i.nome" [description]="i.desc"></br-item>
</br-list>
```

---

### Navegação e progresso

**Step**
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
  <wizard-panel label="Identificação" active><!-- etapa 1 --></wizard-panel>
  <wizard-panel label="Dados"><!-- etapa 2 --></wizard-panel>
</br-wizard>
```

**Collapse**
```html
<br-collapse label="Ver detalhes">
  <span slot="content">Conteúdo expandível.</span>
</br-collapse>
```

---

### Outros

**Avatar**
```html
<br-avatar name="João Silva" size="medium"></br-avatar>
```

**Icon**
```html
<br-icon name="home" size="medium"></br-icon>
```

**Divider**
```html
<br-divider></br-divider>
```

**Scrim** (overlay de foco)
```html
<br-scrim [active]="modalAberto" (brClick)="fecharModal()"></br-scrim>
```

**Skip Link** (acessibilidade eMAG — obrigatório)
```html
<!-- Primeiro elemento do AppComponent -->
<br-skip-link-item label="Ir para o conteúdo" href="#main-content"></br-skip-link-item>
```

**CookieBar** (LGPD — quando aplicável)
```html
<br-cookiebar>
  <cookiebar-header slot="header">Política de Cookies</cookiebar-header>
  <cookiebar-note slot="notes">Usamos cookies para melhorar sua experiência.</cookiebar-note>
</br-cookiebar>
```

**Sign-in** (autenticação gov.br)
```html
<br-sign-in label="Entrar com gov.br" (brClick)="loginGovBr()"></br-sign-in>
```

---

## Checklist — verificar antes de qualquer componente

- [ ] `core-tokens.min.css` no array `styles` do `angular.json` (não `core.min.css`, não `@import` no SCSS)
- [ ] `defineCustomElements()` chamado em `main.ts` ANTES de `bootstrapApplication()`
- [ ] `CUSTOM_ELEMENTS_SCHEMA` em todo componente standalone com tags `<br-*>`
- [ ] `WebcomponentsAngularModule.forRoot()` **NÃO** usado
- [ ] `<br-modal>` declarado no componente da página, **nunca** dentro de `<br-menu>`
- [ ] `<br-notification>` declarado no `AppComponent` raiz
- [ ] Botões com loading usando `[loading]="sinal()"` nativo do `<br-button>`
- [ ] Estado de validação via `[state]="fieldState('campo')"` nos inputs
- [ ] `<br-skip-link-item>` como primeiro elemento do `AppComponent`
- [ ] Sem classes CSS `br-*` aplicadas manualmente
