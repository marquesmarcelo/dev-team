---
name: frontend-angular-dsgov
description: Use quando o project.config.md indicar sistema público ou conformidade com o Padrão Digital de Governo (DSGOV). O frontend Angular+DSGOV SEMPRE começa com git clone do quickstart oficial. Para formulários, importar GovbrDsWebcomponentsModule no componente standalone. Eventos: usar click/change/input nativos. Verificar versão atual antes de implementar. Leia junto com frontend-angular/SKILL.md.
---

# Frontend Angular + DSGOV Web Components (Standalone)

> Leia junto com `frontend-angular/SKILL.md`.
>
> **Documentação oficial (fonte primária):**
> - Componentes: https://webcomponents-ds.estaleiro.serpro.gov.br/docs/components/
> - llms-full.txt: https://webcomponents-ds.estaleiro.serpro.gov.br/llms-full.txt
> - Formulários: https://webcomponents-ds.estaleiro.serpro.gov.br/docs/frameworks/formularios
> - Eventos: https://webcomponents-ds.estaleiro.serpro.gov.br/docs/fundamentos/eventos

---

## ⚠️ Verificar versão antes de implementar

**Antes de qualquer implementação, verificar a versão atual da biblioteca:**

```bash
# Verificar versão publicada no npm
npm show @govbr-ds/webcomponents-angular version
npm show @govbr-ds/webcomponents version
npm show @govbr-ds/core version

# Verificar versão documentada (deve coincidir)
# Ler: https://webcomponents-ds.estaleiro.serpro.gov.br/llms.txt
# ou:  https://webcomponents-ds.estaleiro.serpro.gov.br/llms-full.txt
```

Se a versão instalada no projeto for diferente da versão atual publicada:
1. Informar o usuário sobre a diferença
2. Perguntar se deseja atualizar antes de prosseguir
3. Consultar o `CHANGELOG` do quickstart para identificar breaking changes

**Ao implementar novos componentes ou corrigir comportamentos:**

1. **Localizar o componente** — ler `.claude/references/dsgov-llms.txt`
   (índice leve com links diretos para cada página de documentação)

2. **Buscar a documentação** — `web_fetch` na URL `.md` do componente
   (documentação sempre mais atualizada)

3. **Fallback offline** — ler `.claude/references/dsgov-llms-full.txt`
   (documentação completa local, quando URL indisponível)

Não assumir que exemplos anteriores estão corretos sem verificar.
Se a versão do arquivo local diferir da versão publicada no npm, sugerir
atualização com os comandos em `.claude/references/README.md`.

Esta skill foi baseada na versão **2.0.0** (julho/2026). Se a versão atual
for diferente, priorizar a documentação oficial sobre o conteúdo desta skill.

---

## Ponto de partida obrigatório — clone do quickstart oficial

**Nunca usar `ng new` para projetos Angular+DSGOV.**

```bash
git clone git@gitlab.com:govbr-ds/bibliotecas/wbc/govbr-ds-wbc-quickstart-angular.git nome-do-projeto
cd nome-do-projeto
npm install
npm start   # validar que funciona ANTES de qualquer mudança
```

Conectar ao repositório do projeto:
```bash
rm -rf .git
git init
git remote add origin <url-do-repositorio>
git add . && git commit -m "chore: init quickstart DSGOV" && git push -u origin main
```

### O que ajustar no quickstart

Apenas os `<menu-item>` de exemplo — manter o componente `<br-menu>` e toda
a estrutura ao redor exatamente como veio. Substituir somente os itens pelos
itens reais do projeto definidos a partir de `specs/00-visao-produto.md`.

---

## Arquitetura correta para Reactive Forms em standalone

A documentação oficial (llms-full.txt) é clara: para standalone Angular,
importar **`GovbrDsWebcomponentsModule`** no componente — ele injeta todos
os Value Accessors corretos de uma vez, sem precisar importar individualmente.

```typescript
// ❌ ERRADO — Value Accessors individuais (abordagem anterior, não oficial)
import { BrSelect, SelectValueAccessor, BrRadio, RadioValueAccessor }
  from '@govbr-ds/webcomponents-angular/standalone'

// ✅ CORRETO — conforme documentação oficial
import { GovbrDsWebcomponentsModule }
  from '@govbr-ds/webcomponents-angular'

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GovbrDsWebcomponentsModule],
  template: `
    <form [formGroup]="form">
      <br-input    label="Nome"   formControlName="nome"   [state]="s('nome')"></br-input>
      <br-select   label="Status" formControlName="status" [state]="s('status')">
        <select-option value="aberto">Aberto</select-option>
      </br-select>
      <br-checkbox label="Ativo"  formControlName="ativo"></br-checkbox>
      <br-radio    label="Sim"    value="S" formControlName="opcao"></br-radio>
      <br-button emphasis="primary" type="submit">Salvar</br-button>
    </form>
  `
})
export class ProcessoFormComponent {
  form = inject(FormBuilder).group({
    nome:   ['', Validators.required],
    status: ['', Validators.required],
    ativo:  [false],
    opcao:  [''],
  })

  s(field: string): 'info' | 'danger' {
    const c = this.form.get(field)
    return c?.invalid && c?.touched ? 'danger' : 'info'
  }
}
```

---

## Eventos — usar nativos, não aliases depreciados

A documentação oficial esclarece que os controles GovBR-DS usam **eventos
nativos da plataforma**. Os aliases `brClick`, `brChange`, `brInput` foram
depreciados na série 2.x.

| ✅ Usar | ❌ Depreciado | Quando |
|---|---|---|
| `(click)` | `(brClick)` | botões, ações |
| `(change)` | `(brChange)`, `(valueChange)` | seleção confirmada |
| `(input)` | `(brInput)` | valor mudando continuamente |
| `(focus)` / `(blur)` | — | entrada/saída do controle |
| `CustomEvent` via `(brNavigate)`, `(brPage)` | — | eventos de domínio (ainda customizados) |

```html
<!-- ❌ Depreciado -->
<br-button (brClick)="salvar()">Salvar</br-button>

<!-- ✅ Correto -->
<br-button (click)="salvar()">Salvar</br-button>

<!-- ✅ Correto — evento customizado de domínio (não foi migrado para nativo) -->
<br-pagination (brPage)="mudarPagina($event.detail)"></br-pagination>
```

---

## Configuração (referência — não alterar no quickstart)

### `angular.json`
```json
"styles": [
  "node_modules/@govbr-ds/core/dist/core-tokens.min.css",
  "src/styles.scss"
]
```

### `tsconfig.json`
```json
{ "compilerOptions": { "skipLibCheck": true } }
```

### `src/styles.scss` — apenas sobrescritas
```scss
// CSS do DSGOV já está no angular.json — não reimportar aqui
```

---

## Padrão obrigatório — Breadcrumb na área útil

Toda página autenticada tem `<br-breadcrumb>` como **primeiro elemento** da área de conteúdo:

```typescript
@Component({
  standalone: true,
  imports: [GovbrDsWebcomponentsModule, RouterModule],
  template: `
    <main id="main-content">
      <br-breadcrumb>
        <breadcrumb-item label="Início"     href="/"></breadcrumb-item>
        <breadcrumb-item label="Processos"  href="/processos"></breadcrumb-item>
        <breadcrumb-item label="Novo"       current></breadcrumb-item>
      </br-breadcrumb>
      <h1>Novo Processo</h1>
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

## Componentes mais usados

Todos importados via `GovbrDsWebcomponentsModule` no componente standalone.

### Button
```html
<br-button emphasis="primary"   (click)="salvar()">Salvar</br-button>
<br-button emphasis="secondary" (click)="cancelar()">Cancelar</br-button>
<br-button emphasis="tertiary"  danger (click)="excluir()">Excluir</br-button>
<br-button emphasis="primary"   [loading]="salvando()">Salvar</br-button>
<!-- Botões de linha no grid — loading por ID -->
<br-button emphasis="tertiary" circle icon="pencil"
  [loading]="editingId() === item.id" (click)="editar(item.id)">
</br-button>
```

### Formulário completo com validação
```typescript
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GovbrDsWebcomponentsModule, CommonModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <br-input label="Nome" formControlName="nome" [state]="s('nome')">
      </br-input>
      <br-message *ngIf="err('nome')" state="danger" [show-icon]="true">
        Nome obrigatório.
      </br-message>

      <br-select label="Status" formControlName="status" [state]="s('status')">
        <select-option value="">Selecione...</select-option>
        <select-option value="aberto">Aberto</select-option>
        <select-option value="encerrado">Encerrado</select-option>
      </br-select>

      <br-textarea label="Descrição" formControlName="descricao" rows="4"
        [state]="s('descricao')">
      </br-textarea>

      <br-checkbox label="Ativo" formControlName="ativo"></br-checkbox>

      <br-button type="submit" emphasis="primary" [loading]="salvando()">
        Salvar
      </br-button>
    </form>
  `
})
export class ProcessoFormComponent {
  salvando = signal(false)
  form = inject(FormBuilder).group({
    nome:      ['', Validators.required],
    status:    ['', Validators.required],
    descricao: [''],
    ativo:     [false],
  })

  s(f: string): 'info' | 'danger' {
    const c = this.form.get(f)
    return c?.invalid && c?.touched ? 'danger' : 'info'
  }
  err(f: string): boolean {
    const c = this.form.get(f)
    return !!(c?.invalid && c?.touched)
  }
  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return }
    this.salvando.set(true)
    try {
      await this.service.criar(this.form.value)
      this.notify.sucesso('Criado', 'Registro salvo.')
    } catch { this.notify.erro('Erro', 'Tente novamente.') }
    finally { this.salvando.set(false) }
  }
}
```

### Modal (declarar na página, nunca dentro do menu)
```html
<br-modal title="Confirmar exclusão" [visible]="modalAberto"
  (brClose)="modalAberto = false">
  <span slot="content">Deseja excluir este registro? Ação irreversível.</span>
  <span slot="footer">
    <br-button emphasis="secondary" (click)="modalAberto = false">Cancelar</br-button>
    <br-button emphasis="primary" danger [loading]="excluindo" (click)="confirmar()">
      Excluir
    </br-button>
  </span>
</br-modal>
```

### Notification / Toast (declarar no AppComponent raiz)
```typescript
// notify.service.ts
@Injectable({ providedIn: 'root' })
export class NotifyService {
  visivel  = signal(false)
  tipo     = signal<'success'|'danger'|'warning'|'info'>('info')
  titulo   = signal('')
  mensagem = signal('')
  duracao  = signal(4000)

  fechar() { this.visivel.set(false) }
  sucesso(t: string, m: string) { this._show('success', t, m, 4000) }
  erro(t: string, m: string)    { this._show('danger',  t, m, 8000) }
  aviso(t: string, m: string)   { this._show('warning', t, m, 6000) }
  info(t: string, m: string)    { this._show('info',    t, m, 4000) }

  private _show(tipo: any, t: string, m: string, ms: number) {
    this.tipo.set(tipo); this.titulo.set(t)
    this.mensagem.set(m); this.duracao.set(ms)
    this.visivel.set(true)
  }
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
```html
<br-table density="medium">
  <table-header>
    <table-header-cell>Descrição</table-header-cell>
    <table-header-cell>Status</table-header-cell>
    <table-header-cell>Ações</table-header-cell>
  </table-header>
  <table-body>
    <table-row *ngFor="let p of processos()">
      <table-cell>{{ p.descricao }}</table-cell>
      <table-cell><br-tag [label]="p.status" [color]="statusColor(p.status)"></br-tag></table-cell>
      <table-cell>
        <br-button emphasis="tertiary" circle icon="pencil"
          [loading]="editingId() === p.id" (click)="editar(p.id)">
        </br-button>
        <br-button emphasis="tertiary" circle icon="trash" danger
          [loading]="deletingId() === p.id" (click)="excluir(p.id)">
        </br-button>
      </table-cell>
    </table-row>
  </table-body>
</br-table>
<br-pagination [total]="total()" [page]="pagina()" [page-count]="20"
  (brPage)="mudarPagina($event.detail)">
</br-pagination>
```

### AppComponent raiz — elementos obrigatórios
```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GovbrDsWebcomponentsModule, CommonModule],
  template: `
    <!-- Acessibilidade eMAG — primeiro elemento -->
    <br-skip-link-item label="Ir para o conteúdo" href="#main-content">
    </br-skip-link-item>

    <!-- Estrutura do quickstart — não alterar -->
    <br-header>...</br-header>
    <br-menu>
      <menu-header slot="header">Nome do Sistema</menu-header>
      <menu-item slot="items" label="Início"    icon="home"   href="/"></menu-item>
      <menu-item slot="items" label="Processos" icon="folder" href="/processos"></menu-item>
    </br-menu>

    <main id="main-content">
      <router-outlet></router-outlet>
    </main>

    <!-- Notificações — declarar aqui, uma vez na aplicação -->
    <br-notification [show]="notif.visivel()" [state]="notif.tipo()"
      [timer]="notif.duracao()" (brClose)="notif.fechar()">
      <notification-header slot="header">{{ notif.titulo() }}</notification-header>
      <notification-body   slot="body">{{ notif.mensagem() }}</notification-body>
    </br-notification>

    <!-- CookieBar — quando necessário (LGPD) -->
    <br-cookiebar>
      <cookiebar-header slot="header">Cookies</cookiebar-header>
      <cookiebar-note slot="notes">Usamos cookies para melhorar sua experiência.</cookiebar-note>
    </br-cookiebar>
  `
})
```

---

## Checklist

- [ ] Projeto iniciado com `git clone` do quickstart oficial
- [ ] `npm start` funcionando antes de qualquer alteração
- [ ] Apenas os `<menu-item>` substituídos — estrutura do quickstart intacta
- [ ] `GovbrDsWebcomponentsModule` importado nos componentes com formulário/componentes DSGOV
- [ ] **NÃO** usar Value Accessors individuais (`SelectValueAccessor`, etc.)
- [ ] **NÃO** usar `CUSTOM_ELEMENTS_SCHEMA`
- [ ] **NÃO** usar `defineCustomElements()`
- [ ] **NÃO** usar `brClick`, `brChange`, `brInput` — usar `click`, `change`, `input` nativos
- [ ] `skipLibCheck: true` no `tsconfig.json`
- [ ] `<br-modal>` declarado na página (nunca dentro do menu)
- [ ] `<br-notification>` no `AppComponent` raiz
- [ ] `<br-skip-link-item>` como primeiro elemento do `AppComponent`
- [ ] `<br-breadcrumb>` como primeiro elemento da área de conteúdo em toda página autenticada
- [ ] Ao ter dúvida sobre algum componente: consultar https://webcomponents-ds.estaleiro.serpro.gov.br/llms-full.txt
