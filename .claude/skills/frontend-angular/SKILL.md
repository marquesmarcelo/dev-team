---
name: frontend-angular
description: Use ao implementar frontend em Angular, quando project.config.md indicar esta stack. Cobre estrutura de projeto Angular 17+, standalone components, signals, biblioteca de componentes padrão (Angular Material ou PrimeNG), acessibilidade WCAG 2.2 AA, e padrão de UI assíncrona.
---

# Frontend: Angular (v17+) + Standalone Components

> Leia também `.claude/skills/accessibility/SKILL.md` antes de implementar
> qualquer tela nova. Se o projeto requer o Design System do Governo Federal
> (DS Gov), leia adicionalmente `.claude/skills/frontend-angular-dsgov/SKILL.md`.

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


## Standalone Components (padrão Angular 17+)

```typescript
// features/processo/components/processo-list/processo-list.component.ts
@Component({
  selector: 'app-processo-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, RouterModule],
  templateUrl: './processo-list.component.html',
})
export class ProcessoListComponent {
  private processoService = inject(ProcessoService);

  // Signals — estado reativo sem Zone.js
  processos = this.processoService.processos;
  isLoading = this.processoService.isLoading;
  hasError = this.processoService.hasError;
  meta = this.processoService.meta;
}
```

## Service com estado (Signals)

```typescript
// features/processo/services/processo.service.ts
@Injectable({ providedIn: 'root' })
export class ProcessoService {
  private http = inject(HttpClient);

  // Signals de estado
  processos = signal<Processo[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  isSubmitting = signal(false);
  meta = signal<PaginationMeta | null>(null);

  // Sort/filtro persistidos em localStorage
  private readonly STORAGE_KEY = 'grid-state:processo';
  gridState = signal<GridState>(this.loadGridState() ?? DEFAULT_GRID_STATE);

  listar(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    const { page, pageSize, sort, order, filtros } = this.gridState();

    this.http.get<ListagemResponse<Processo>>('/api/v1/processos', {
      params: { page, page_size: pageSize, sort, order, ...filtros }
    }).subscribe({
      next: (res) => {
        this.processos.set(res.data);
        this.meta.set(res.meta);
        this.saveGridState(this.gridState());
      },
      error: () => this.hasError.set(true),
      complete: () => this.isLoading.set(false),
    });
  }

  toggleSort(coluna: string): void {
    const atual = this.gridState();
    const novo = atual.sort === coluna
      ? { ...atual, order: atual.order === 'asc' ? 'desc' : 'asc' }
      : { ...atual, sort: coluna, order: 'asc', page: 1 };
    this.gridState.set(novo as GridState);
    this.saveGridState(novo as GridState);
    this.listar();
  }

  private loadGridState(): GridState | null {
    const s = localStorage.getItem(this.STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  }

  private saveGridState(state: GridState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }
}
```

## UI assíncrona (obrigatório, ver CLAUDE.md)

```html
<!-- botão desabilitado durante operação -->
<button mat-raised-button [disabled]="isLoading() || isSubmitting()"
        (click)="pesquisar()">
  @if (isLoading()) { <mat-spinner diameter="16" /> Aguarde... }
  @else { Pesquisar }
</button>

<!-- grid com 4 estados distintos -->
@if (isLoading()) {
  <app-grid-skeleton [rows]="meta()?.pageSize ?? 10" />
} @else if (hasError()) {
  <app-error-state (retry)="listar()" />
} @else if (!processos().length) {
  <app-empty-state message="Nenhum resultado encontrado" />
} @else {
  <mat-table [dataSource]="processos()">...</mat-table>
}
```

## Cabeçalho de coluna com toggle de ordenação

```html
<th mat-header-cell *matHeaderCellDef
    role="button" tabindex="0"
    [attr.aria-sort]="gridState().sort === 'descricao'
      ? gridState().order === 'asc' ? 'ascending' : 'descending'
      : 'none'"
    (click)="processoService.toggleSort('descricao')"
    (keydown.enter)="processoService.toggleSort('descricao')">
  Descrição
  @if (gridState().sort === 'descricao') {
    <mat-icon>{{ gridState().order === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
  }
</th>
```

## AppShell (estrutura única, criada na primeira funcionalidade visual)

```
src/app/
  core/
    layout/
      app-shell/
        app-shell.component.ts      # combina header + sidebar + conteúdo + footer
        app-header/
          app-header.component.ts   # logo + título + toggle + info do usuário
        app-sidebar/
          app-sidebar.component.ts  # menu hierárquico (accordion 2 níveis)
          nav-config.ts             # configuração do menu — nunca hardcoded
        app-footer/
          app-footer.component.ts   # rodapé fixo
```

### nav-config.ts — fonte única de verdade para o menu

```typescript
export interface NavItem  { label: string; path: string; icon?: string; }
export interface NavGroup { label: string; icon: string; items: NavItem[]; }

export const NAV_CONFIG: NavGroup[] = [
  {
    label: 'Cadastros', icon: 'people',
    items: [
      { label: 'Clientes',      path: '/app/clientes' },
      { label: 'Fornecedores',  path: '/app/fornecedores' },
    ]
  },
  {
    label: 'Tabelas Acessórias', icon: 'table_view',
    items: [
      { label: 'Categorias', path: '/app/categorias' },
      { label: 'Status',     path: '/app/status' },
    ]
  },
];
```

### app-shell.component.ts

```typescript
@Component({
  selector: 'app-shell',
  standalone: true,
  template: `
    <div class="shell-wrapper">
      <app-header
        [sidebarOpen]="sidebarOpen()"
        (toggleSidebar)="sidebarOpen.set(!sidebarOpen())"
      />
      <div class="shell-body">
        <app-sidebar
          [open]="sidebarOpen()"
          [navConfig]="navConfig"
        />
        <main class="shell-content">
          <router-outlet />
        </main>
      </div>
      <app-footer />
    </div>
  `,
})
export class AppShellComponent {
  readonly sidebarOpen = signal(true);
  readonly navConfig   = NAV_CONFIG;
}
```

### Menu hierárquico com accordion (Material ou DSGOV)

**Angular Material:**
```html
<!-- app-sidebar.component.html -->
@for (group of navConfig; track group.label) {
  <mat-expansion-panel [class.collapsed]="!open">
    <mat-expansion-panel-header>
      <mat-icon>{{ group.icon }}</mat-icon>
      @if (open) { <span>{{ group.label }}</span> }
    </mat-expansion-panel-header>

    @for (item of group.items; track item.path) {
      <a mat-list-item [routerLink]="item.path" routerLinkActive="active">
        {{ item.label }}
      </a>
    }
  </mat-expansion-panel>
}
```

**DSGOV:** usar `<br-menu>` com `<br-list>` aninhados conforme
documentação em https://www.gov.br/ds/components/menu.

Quando sidebar recolhida (`open = false`): mostrar apenas ícones com
`[matTooltip]="group.label"` no header do painel.

### Header
```html
<header class="app-header">
  <button mat-icon-button (click)="toggleSidebar.emit()"
          [attr.aria-label]="sidebarOpen ? 'Recolher menu' : 'Expandir menu'">
    <mat-icon>menu</mat-icon>
  </button>

  <img src="/assets/logo.svg" alt="Logo" class="logo" />
  <span class="system-title">{{ systemName }}</span>

  <div class="spacer"></div>

  <!-- info do usuário: nome + avatar + dropdown de logout -->
</header>
```

### Rodapé
```html
<!-- app-footer.component.html -->
<footer class="app-footer">
  <span>{{ systemName }} v{{ version }} — {{ year }}</span>
  <!-- DSGOV: links obrigatórios do Padrão Digital de Governo -->
  <!-- Privado: links de ajuda, política de privacidade -->
</footer>
```

```scss
// app-footer.component.scss
.app-footer {
  height: 40px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  flex-shrink: 0; // garante que o footer não some quando o conteúdo é grande
}
```

A página de login não usa o `AppShell` — é componente standalone com
rota própria na raiz.

## Autocomplete/Combobox com criação inline

> Padrão universal definido no `CLAUDE.md`. Use quando `ux.md` indicar campo
> de autocomplete. O comportamento é idêntico ao de qualquer outra tecnologia —
> esta seção descreve apenas a implementação específica para Angular.

**Angular Material:** use `<mat-autocomplete>` + `<input matInput>`.
**DSGOV:** use `<br-input>` com lista de sugestões customizada conforme
documentação do Design System.

```typescript
// shared/components/autocomplete-create/autocomplete-create.component.ts
@Component({
  selector: 'app-autocomplete-create',
  standalone: true,
  template: `
    <mat-form-field class="w-full">
      <mat-label>{{ label }}</mat-label>
      <input matInput
             [matAutocomplete]="auto"
             [formControl]="searchCtrl"
             [attr.aria-label]="label" />
      <button *ngIf="value()" mat-icon-button matSuffix
              (click)="clear()" aria-label="Limpar seleção">
        <mat-icon>close</mat-icon>
      </button>
      <mat-autocomplete #auto="matAutocomplete"
                        [displayWith]="displayFn"
                        (optionSelected)="onSelected($event.option.value)">
        @for (item of items(); track item.id) {
          <mat-option [value]="item">
            {{ item.codigo }} — {{ item.descricao }}
          </mat-option>
        }
        <!-- Opção de criação inline -->
        @if (canCreate && searchCtrl.value && !exactMatch()) {
          <mat-option [value]="null" (click)="createNew()">
            <mat-icon>add</mat-icon>
            Criar "{{ searchCtrl.value }}"
          </mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `
})
export class AutocompleteCreateComponent<T extends { id: string; codigo: string; descricao: string }> {
  label   = input.required<string>();
  value   = model<T | null>(null);
  search  = input.required<(query: string) => Observable<T[]>>();
  create  = input<(descricao: string) => Observable<T>>();  // undefined = sem criação inline
  canCreate = computed(() => !!this.create());

  readonly searchCtrl = new FormControl('');
  readonly items      = signal<T[]>([]);

  exactMatch = computed(() =>
    this.items().some(i => i.descricao.toLowerCase() === this.searchCtrl.value?.toLowerCase())
  );

  constructor() {
    // Busca com debounce enquanto o usuário digita
    toObservable(this.searchCtrl.valueChanges).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(v => typeof v === 'string' && v.length >= 1),
      switchMap(v => this.search()(v as string))
    ).subscribe(results => this.items.set(results));
  }

  onSelected(item: T) { this.value.set(item); }
  clear()             { this.value.set(null); this.searchCtrl.setValue(''); this.items.set([]); }
  displayFn(item: T)  { return item ? `${item.codigo} — ${item.descricao}` : ''; }

  createNew() {
    const fn = this.create();
    if (!fn) return;
    fn(this.searchCtrl.value!).subscribe(novo => {
      this.value.set(novo);
      this.searchCtrl.setValue(this.displayFn(novo));
    });
  }
}
```

Endpoint de busca: `GET /api/v1/<entidade>/autocomplete?q=<texto>&limit=20`
Retorno: `[{ id, codigo, descricao }]` — ILIKE no Postgres com índice na coluna.
O `dba` garante índice nas colunas `descricao` e `codigo` da entidade.

## Formulário container-agnóstico (página ou dialog)

```typescript
@Component({
  selector: 'app-processo-form',
  standalone: true,
  inputs: ['initialData'],
  outputs: ['onSubmit', 'onCancel'],
})
export class ProcessoFormComponent {
  // Funciona dentro de página OU de MatDialog — não sabe onde está
  initialData = input<Processo | null>(null);
  onSubmit = output<ProcessoFormData>();
  onCancel = output<void>();
}
```

## Lazy loading por feature

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'processos',
    loadChildren: () =>
      import('./features/processo/processo.routes').then(m => m.PROCESSO_ROUTES),
  },
];
```

## Acessibilidade (WCAG 2.2 AA)

- Angular Material CDK já gerencia ARIA, foco e teclado — não sobrescrever.
- Adicionar `aria-live="polite"` em resultados dinâmicos de busca.
- Confirmar contraste de cor do tema Material customizado.
- Testes E2E (Playwright) verificar: botão desabilitado, estados de loading,
  navegação por teclado, `aria-sort` em colunas ordenáveis.

## Versão da aplicação no frontend

**Rodapé com versão** (injetada via environment do Angular):
```typescript
// environments/environment.ts
export const environment = {
  production: false,
  appName:    'Nome do Sistema',
  appVersion: 'dev',      // substituído no CI: $(cat VERSION)
  buildDate:  '',         // substituído no CI
  gitCommit:  '',         // substituído no CI
}
```

```html
<!-- layout/app-footer/app-footer.component.html -->
<footer class="app-footer">
  <span>{{ env.appName }}</span>
  <span>·</span>
  <span>v{{ env.appVersion }}</span>
  <span>·</span>
  <span>{{ year }}</span>
  <span>·</span>
  <a routerLink="/sobre">Sobre</a>
</footer>
```

**Página `/sobre`** (pública, sem autenticação):
```typescript
// features/sobre/sobre.component.ts
@Component({
  standalone: true,
  template: `
    <main class="sobre-page">
      <div class="sobre-card">
        <h1>{{ env.appName }}</h1>
        <dl>
          <dt>Frontend</dt>  <dd>v{{ env.appVersion }}</dd>
          <dt>Backend</dt>   <dd>{{ (version$ | async)?.backend ?? '–' }}</dd>
          <dt>Build</dt>     <dd>{{ env.buildDate || '–' }}</dd>
          <dt>Commit</dt>    <dd class="mono">{{ env.gitCommit || '–' }}</dd>
        </dl>
      </div>
    </main>
  `
})
export class SobreComponent {
  env = environment
  year = new Date().getFullYear()
  version$ = inject(HttpClient).get<any>('/api/version')
}
```

## Loading por linha no grid (padrão obrigatório)

> Padrão universal em `CLAUDE.md`. Rastrear qual ID está sendo processado
> com signals — cada linha verifica seu próprio ID contra o signal global.

```typescript
// features/processo/services/processo.service.ts
@Injectable({ providedIn: 'root' })
export class ProcessoService {
  private http = inject(HttpClient)
  private notify = inject(NotifyService)
  private router = inject(Router)

  // Signals de loading por operação — rastreiam o ID atual
  readonly deletingId = signal<string | null>(null)
  readonly editingId  = signal<string | null>(null)

  excluir(id: string): void {
    this.deletingId.set(id)
    this.http.delete(`/api/v1/processos/${id}`).subscribe({
      next: () => {
        this.notify.sucesso('Processo excluído')
        this.deletingId.set(null)
      },
      error: (e) => {
        this.notify.erro('Erro ao excluir')
        this.deletingId.set(null)
      }
    })
    // A barra superior dispara automaticamente via loadingProgressInterceptor
  }

  abrirEdicao(id: string): void {
    this.editingId.set(id)
    this.router.navigate(['/processos', id, 'editar'])
    // editingId é limpo pelo NavigationProgressService quando a rota completa
    // Ou limpar no ngOnInit do componente de edição
  }
}
```

```html
<!-- features/processo/components/processo-list/processo-list.component.html -->
<tr *ngFor="let row of processos()">
  <td>{{ row.descricao }}</td>
  <td class="actions">
    <!-- Botão Editar: spinner quando editingId === row.id -->
    <app-loading-button
      variant="text"
      [loading]="service.editingId() === row.id"
      loadingText=""
      [attr.aria-label]="'Editar ' + row.descricao"
      (clicked)="service.abrirEdicao(row.id)">
      <mat-icon>edit</mat-icon>
    </app-loading-button>

    <!-- Botão Excluir: spinner quando deletingId === row.id -->
    <app-loading-button
      variant="text"
      color="warn"
      [loading]="service.deletingId() === row.id"
      loadingText=""
      [attr.aria-label]="'Excluir ' + row.descricao"
      (clicked)="service.excluir(row.id)">
      <mat-icon>delete</mat-icon>
    </app-loading-button>
  </td>
</tr>
```

O spinner substitui o `mat-icon` durante o loading — sem deslocar o
layout. `HttpClient` dispara a barra superior automaticamente via
`loadingProgressInterceptor`.

## APP_ENV — configuração por ambiente

> Regra universal em `CLAUDE.md`. Implementar via `environment.ts` e
> middleware de headers no servidor (Nginx ou backend).

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  appEnv: 'development' as 'development' | 'production',
  appName: 'Nome do Sistema',
  appVersion: 'dev',
  buildDate: '',
  gitCommit: '',
}

// environments/environment.prod.ts
export const environment = {
  production: true,
  appEnv: 'production' as 'development' | 'production',
  appName: 'Nome do Sistema',
  appVersion: '${APP_VERSION}',   // substituído pelo CI
  buildDate: '${BUILD_DATE}',
  gitCommit: '${GIT_COMMIT}',
}
```

```typescript
// core/guards/env-guard.ts — bloqueio best-effort de DevTools em prod
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'

@Injectable({ providedIn: 'root' })
export class EnvGuardService {
  init(): void {
    if (environment.appEnv !== 'production') return

    // Best-effort: não é inviolável — valor real está no CSP e ausência de source maps
    setInterval(() => {
      const start = performance.now()
      // eslint-disable-next-line no-debugger
      debugger
      if (performance.now() - start > 100) {
        document.body.innerHTML = ''
      }
    }, 1000)
  }
}
```

**Headers de segurança em produção** — configurar no Nginx ou no backend
que serve o Angular (não no Angular em si, que é SPA estática):

```nginx
# nginx.conf — bloco location para a aplicação Angular
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

```bash
# .env.example
APP_ENV=development   # backend lê e passa para o build do Angular via CI
```

**Build do Angular:**
```bash
# Desenvolvimento (HMR ativo, source maps, sem CSP)
ng serve

# Produção (sem source maps, otimizado)
ng build --configuration=production
```

## Autenticação — regra de segurança obrigatória

**JWT nunca vai para `localStorage` ou `sessionStorage`.**
O token é armazenado em cookie `HttpOnly` pelo backend. O Angular
não gerencia o token — o browser envia o cookie automaticamente.

```typescript
// ❌ PROIBIDO — vulnerável a XSS
localStorage.setItem('auth_token', jwt)
headers.set('Authorization', `Bearer ${localStorage.getItem('auth_token')}`)

// ✅ CORRETO — withCredentials em toda requisição autenticada
// O HttpClient envia o cookie HttpOnly automaticamente.

// app.config.ts — setar withCredentials globalmente
provideHttpClient(
  withInterceptors([loadingProgressInterceptor]),
  withCredentials()   // ← todas as requisições incluem cookies
)

// Ou por interceptor, se só parte das requisições for autenticada:
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }))
}

// AuthService — login: backend seta o cookie, Angular não toca no token
login(email: string, senha: string): Observable<void> {
  return this.http.post<void>('/api/auth/login', { email, senha })
  // cookie HttpOnly setado automaticamente pelo browser na resposta
}

// Logout: backend apaga o cookie
logout(): Observable<void> {
  return this.http.post<void>('/api/auth/logout', {})
}
```

## LoadingButton — componente obrigatório em shared/ui/

> Padrão universal em `CLAUDE.md`. Todo botão que dispara operação assíncrona
> usa este componente. Material: use `mat-button` com diretiva; DSGOV: use
> `br-button` com atributo `loading`.

```typescript
// shared/ui/loading-button/loading-button.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <button
      [attr.mat-button]="variant === 'text' ? '' : null"
      [attr.mat-raised-button]="variant === 'raised' ? '' : null"
      [attr.mat-flat-button]="variant === 'flat' ? '' : null"
      [color]="color"
      [disabled]="loading || disabled"
      [class.opacity-75]="loading"
      [attr.aria-busy]="loading"
      (click)="!loading && clicked.emit($event)"
      type="button"
    >
      @if (loading) {
        <mat-spinner diameter="16" strokeWidth="2"
                     style="display:inline-block; margin-right:8px"
                     aria-hidden="true" />
        {{ loadingText || 'Aguarde...' }}
      } @else {
        <ng-content />
      }
    </button>
  `
})
export class LoadingButtonComponent {
  @Input() loading  = false
  @Input() disabled = false
  @Input() loadingText = ''            // "Salvando...", "Pesquisando..."
  @Input() variant: 'text' | 'raised' | 'flat' = 'flat'
  @Input() color: 'primary' | 'warn' | 'accent' = 'primary'
  @Output() clicked = new EventEmitter<MouseEvent>()
}
```

**Uso:**
```html
<!-- Submit de formulário -->
<app-loading-button
  [loading]="isSubmitting()"
  loadingText="Salvando..."
  (clicked)="salvar()">
  Salvar
</app-loading-button>

<!-- Pesquisa -->
<app-loading-button
  [loading]="isLoading()"
  loadingText="Pesquisando..."
  (clicked)="pesquisar()">
  Pesquisar
</app-loading-button>

<!-- Exclusão -->
<app-loading-button
  color="warn"
  [loading]="isDeleting()"
  loadingText="Excluindo..."
  (clicked)="excluir(item.id)">
  Excluir
</app-loading-button>
```

**DSGOV:** substituir pelo componente `<br-button>` com o atributo `loading`:
```html
<br-button label="Salvar"
           [loading]="isSubmitting()"
           (click)="salvar()">
</br-button>
```

## Editor de texto rico

> Usar quando `ux.md` indicar campo com editor rico. Regras universais
> (quando usar, sanitização, acessibilidade) em `CLAUDE.md` → "Editor
> de texto rico".

**Lib recomendada:** Quill com `ngx-quill` — bem integrado ao Angular,
acessível.

```bash
npm install quill ngx-quill
```

```typescript
// app.module.ts ou standalone imports
import { QuillModule } from 'ngx-quill'

// Configuração básica (nível "basic" do ux.md)
const QUILL_BASIC = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ]
}

// No componente
@Component({
  template: `
    <quill-editor
      [formControl]="conteudoCtrl"
      [modules]="quillModules"
      [placeholder]="placeholder"
      [readOnly]="disabled"
      aria-label="Conteúdo do campo"
    />
  `
})
export class FormularioComponent {
  quillModules = QUILL_BASIC
}
```

**TipTap como alternativa** (mais moderno, sem jQuery):
```bash
npm install @tiptap/core @tiptap/pm @tiptap/starter-kit
```
Requer wrapper Angular manual, mas tem melhor suporte a WAI-ARIA.

**O backend sanitiza o HTML** antes de persistir (ver `CLAUDE.md`).

## Reatividade moderna (Angular 19+ — preferir sobre RxJS para casos simples)

A skill oficial do Angular (`angular/skills`) enfatiza os novos primitivos
reativos disponíveis a partir do Angular 19. Preferir sobre `switchMap` +
Observable quando o caso de uso for simples:

### `resource()` — carregamento assíncrono nativo

```typescript
// Substitui: service.listar(params).pipe(switchMap(...))
// Use quando: carregar dados com base em signal de parâmetros

import { resource, signal } from '@angular/core'

readonly filtros = signal({ status: 'aberto', pagina: 1 })

readonly processos = resource({
  request: () => this.filtros(),          // reexecuta quando filtros mudar
  loader: ({ request }) =>
    fetch(`/api/v1/processos?status=${request.status}&pagina=${request.pagina}`)
      .then(r => r.json()) as Promise<ProcessoPage>
})

// No template:
// processos.isLoading() → boolean
// processos.value()     → ProcessoPage | undefined
// processos.error()     → unknown
// processos.reload()    → recarrega manualmente
```

### `linkedSignal()` — signal derivado com escrita

```typescript
// Use quando: signal que depende de outro mas pode ser escrito independentemente
// Exemplo: ordenação padrão vinda do servidor, mas alterável pelo usuário

import { linkedSignal } from '@angular/core'

readonly ordenacaoPadrao = signal('criado_em')  // vem de uma config ou API

readonly ordenacaoAtiva = linkedSignal(() => this.ordenacaoPadrao())
// → sincroniza com ordenacaoPadrao automaticamente
// → mas pode ser sobrescrito pelo usuário: this.ordenacaoAtiva.set('descricao')
```

**Quando manter RxJS:**
- Streams de eventos complexos (WebSocket, polling com retry, mergeMap)
- Operadores de tempo (debounceTime, throttleTime)
- Combinação de múltiplas fontes (combineLatest, forkJoin)
- Código legado que já usa Observables amplamente

## Indicador de navegação entre rotas (barra no topo + item com loading)

> Padrão universal em `CLAUDE.md`: **dois indicadores obrigatórios juntos.**
> Implementar no AppShell — não por feature.

**Lib:** `nprogress` + `@types/nprogress`
```bash
npm install nprogress && npm install --save-dev @types/nprogress
```

```typescript
// core/services/navigation-progress.service.ts
import { Injectable, inject, signal } from '@angular/core'
import { Router, NavigationStart, NavigationEnd,
         NavigationCancel, NavigationError } from '@angular/router'
import { filter } from 'rxjs/operators'
import * as NProgress from 'nprogress'

@Injectable({ providedIn: 'root' })
export class NavigationProgressService {
  private router = inject(Router)

  // Signal com o path que está carregando — usado pelo item do menu
  readonly navigatingTo = signal<string | null>(null)

  init(): void {
    NProgress.configure({ showSpinner: false, minimum: 0.15, speed: 300 })

    this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe((e: NavigationStart) => {
      NProgress.start()
      this.navigatingTo.set(e.url)      // sinaliza qual rota está carregando
    })

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd
              || e instanceof NavigationCancel
              || e instanceof NavigationError)
    ).subscribe(() => {
      NProgress.done()
      this.navigatingTo.set(null)       // limpa o loading do item
    })
  }
}
```

```typescript
// app.config.ts
import { APP_INITIALIZER, provideHttpClient, withInterceptors } from '@angular/core'
import { NavigationProgressService } from './core/services/navigation-progress.service'
import { loadingProgressInterceptor } from './core/http/loading-progress.interceptor'

export const appConfig = {
  providers: [
    provideHttpClient(withInterceptors([loadingProgressInterceptor])),  // ← interceptor global
    {
      provide: APP_INITIALIZER,
      useFactory: (svc: NavigationProgressService) => () => svc.init(),
      deps: [NavigationProgressService],
      multi: true
    }
  ]
}
```

**Interceptor HTTP automático — barra dispara em toda chamada:**

```typescript
// core/http/loading-progress.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { finalize } from 'rxjs/operators'
import { NavigationProgressService } from '../services/navigation-progress.service'

let activeRequests = 0   // contador para múltiplas requisições simultâneas

export const loadingProgressInterceptor: HttpInterceptorFn = (req, next) => {
  const navProgress = inject(NavigationProgressService)

  activeRequests++
  if (activeRequests === 1) navProgress.start()    // inicia só na primeira

  return next(req).pipe(
    finalize(() => {
      activeRequests--
      if (activeRequests === 0) navProgress.done() // completa só quando todas terminarem
    })
  )
}
```

```typescript
// navigation-progress.service.ts — adicionar métodos start/done públicos
import * as NProgress from 'nprogress'

@Injectable({ providedIn: 'root' })
export class NavigationProgressService {
  readonly navigatingTo = signal<string | null>(null)

  start(path?: string): void {
    NProgress.start()
    if (path !== undefined) this.navigatingTo.set(path)
  }

  done(): void {
    NProgress.done()
    this.navigatingTo.set(null)
  }

  init(): void {
    NProgress.configure({ showSpinner: false, minimum: 0.15, speed: 300 })
    this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe((e: NavigationStart) => this.start(e.url))

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError)
    ).subscribe(() => this.done())
  }
}
```

**Todos os `HttpClient.get/post/put/delete` já disparam a barra automaticamente.**
Não precisa chamar `start()/done()` manualmente nos services — o interceptor cuida disso.

```typescript
// layout/app-sidebar/app-sidebar.component.ts — item com estado de loading
import { Component, inject } from '@angular/core'
import { NavigationProgressService } from '@/core/services/navigation-progress.service'

@Component({
  template: `
    @for (item of navConfig; track item.path) {
      <a [routerLink]="item.path"
         [attr.aria-busy]="navProgress.navigatingTo() === item.path"
         [class.loading]="navProgress.navigatingTo() === item.path"
         [class.pointer-events-none]="navProgress.navigatingTo() === item.path">

        @if (navProgress.navigatingTo() === item.path) {
          <!-- Spinner substitui o ícone durante o loading -->
          <span class="spinner" aria-hidden="true"></span>
        } @else {
          <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
        }
        <span>{{ item.label }}</span>
      </a>
    }
  `
})
export class AppSidebarComponent {
  protected navProgress = inject(NavigationProgressService)
  protected navConfig = NAV_CONFIG
}
```

```scss
/* styles.scss */
@import 'nprogress/nprogress.css';
#nprogress .bar { background: var(--primary, #1976d2); height: 3px; }
#nprogress .peg { box-shadow: 0 0 10px var(--primary, #1976d2); }
#nprogress .spinner { display: none; }

/* Item de menu em loading */
a.loading { opacity: 0.7; }
a.loading .spinner {
  display: inline-block;
  width: 16px; height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

## Sistema de notificações toast

> Padrão universal em `CLAUDE.md`. Implementar como serviço global — não por feature.

**Abordagem:** serviço Angular com `MatSnackBar` (Angular Material) ou
componente customizado. Para DSGOV, usar componente de notificação do
`@govbr-ds/core`.

```typescript
// core/services/notify.service.ts
import { Injectable, inject } from '@angular/core'
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar'

export type NotifyType = 'sucesso' | 'erro' | 'aviso' | 'info'

@Injectable({ providedIn: 'root' })
export class NotifyService {
  private snackBar = inject(MatSnackBar)

  private config(type: NotifyType): MatSnackBarConfig {
    const durations = { sucesso: 4000, info: 4000, aviso: 6000, erro: 8000 }
    const icons     = { sucesso: '✅', erro: '❌', aviso: '⚠️', info: 'ℹ️' }
    const panels    = {
      sucesso: 'notify-sucesso',
      erro:    'notify-erro',
      aviso:   'notify-aviso',
      info:    'notify-info'
    }
    return {
      duration:           durations[type],
      horizontalPosition: 'right',
      verticalPosition:   'top',
      panelClass:         [panels[type]],
    }
  }

  sucesso(msg: string): void { this.snackBar.open(`✅  ${msg}`, '✕', this.config('sucesso')) }
  erro(msg: string):    void { this.snackBar.open(`❌  ${msg}`, '✕', this.config('erro'))    }
  aviso(msg: string):   void { this.snackBar.open(`⚠️  ${msg}`, '✕', this.config('aviso'))   }
  info(msg: string):    void { this.snackBar.open(`ℹ️  ${msg}`, '✕', this.config('info'))    }
}
```

```scss
// styles.scss — cores dos toasts
.notify-sucesso .mdc-snackbar__surface { background: #2e7d32 !important; color: #fff !important; }
.notify-erro    .mdc-snackbar__surface { background: #c62828 !important; color: #fff !important; }
.notify-aviso   .mdc-snackbar__surface { background: #f57f17 !important; color: #fff !important; }
.notify-info    .mdc-snackbar__surface { background: #1565c0 !important; color: #fff !important; }
```

```typescript
// Uso em qualquer componente ou serviço
import { NotifyService } from '@/core/services/notify.service'

@Component({...})
export class ProcessoFormComponent {
  private notify = inject(NotifyService)

  salvar(): void {
    this.service.criar(this.form.value).subscribe({
      next: () => this.notify.sucesso('Processo criado com sucesso.'),
      error: (e) => this.notify.erro(`Erro ao criar processo: ${e.message}`)
    })
  }
}
```

---

## Dois Dockerfiles

- `Dockerfile` — produção: `node:20-alpine` builder + `nginx:alpine` runner
  servindo os arquivos estáticos do `dist/`.
- `Dockerfile.dev` — dev: `node:20-alpine`, monta volume, `CMD ng serve
  --host 0.0.0.0 --poll 500` (poll para hot-reload dentro de container).
