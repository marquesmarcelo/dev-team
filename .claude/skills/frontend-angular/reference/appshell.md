# Angular — Appshell

> Referência da skill `frontend-angular`. Carregar sob demanda.

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

### Alinhamento da área de conteúdo

O `<main class="shell-content">` começa junto à sidebar e vai até a margem
direita da janela. **Nunca** centralizar o conteúdo com `margin: 0 auto` +
`max-width` — isso cria vão à esquerda e sobra à direita.

```scss
.shell-body    { display: flex; flex: 1; overflow: hidden; }
.shell-content {
  flex: 1;                  // consome todo o espaço restante
  width: 100%;
  overflow: auto;
  padding: 1.5rem 1rem;
  @media (min-width: 768px) { padding: 1.5rem; }
  // ❌ nunca: margin: 0 auto; max-width: 1080px;
}
```

`max-width` continua correto em dois lugares: bloco de texto corrido
(página `/sobre`, termos — `max-width: 65ch`) e um controle isolado que
ficaria absurdo esticado (campo de CPF).

**Formulário aproveitando a largura:**
```scss
.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 768px)  { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1280px) { grid-template-columns: repeat(3, 1fr); }
}
.form-grid .full-row { grid-column: 1 / -1; }  // texto longo, editor rico
```

**Tabela:** `width: 100%` com as colunas por proporção; só a coluna de
ações tem largura fixa.

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
