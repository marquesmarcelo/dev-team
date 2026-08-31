# Next.js + shadcn/ui — Appshell

> Referência da skill `frontend-nextjs-shadcn`. Carregar sob demanda.

## AppShell (estrutura única, criada na primeira funcionalidade visual)
```
app/
  page.tsx                 # rota raiz = LOGIN, não a aplicação
  (shell)/
    layout.tsx              # combina header + sidebar + conteúdo + footer
    dashboard/page.tsx
    processos/page.tsx
    ...
components/
  shell/
    app-shell.tsx           # layout root
    app-header.tsx          # logo + título + toggle + info do usuário
    app-sidebar.tsx         # menu hierárquico (accordion 2 níveis)
    app-footer.tsx          # rodapé fixo
    sidebar-group.tsx       # grupo expansível do menu
    nav-config.ts           # configuração do menu (não hardcoded nos componentes)
```

### Header
```tsx
// app-header.tsx
export function AppHeader({ onToggleSidebar, sidebarOpen }: HeaderProps) {
  return (
    <header className="h-16 border-b flex items-center px-4 gap-4">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar}
              aria-label={sidebarOpen ? "Recolher menu" : "Expandir menu"}>
        <Menu className="h-5 w-5" />
      </Button>
      <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
      <span className="font-semibold text-lg">{SYSTEM_NAME}</span>
      <div className="ml-auto flex items-center gap-2">
        {/* nome do usuário + avatar + dropdown de logout */}
      </div>
    </header>
  );
}
```

### Menu hierárquico (2 níveis com accordion)
```tsx
// nav-config.ts — nunca hardcoded nos componentes
export const NAV_CONFIG: NavGroup[] = [
  {
    label: "Cadastros", icon: "users",
    items: [
      { label: "Clientes", path: "/app/clientes" },
      { label: "Fornecedores", path: "/app/fornecedores" },
    ]
  },
  {
    label: "Tabelas Acessórias", icon: "table",
    items: [
      { label: "Categorias", path: "/app/categorias" },
    ]
  },
];

// app-sidebar.tsx usando shadcn/ui Collapsible
function SidebarGroup({ group, collapsed }: { group: NavGroup, collapsed: boolean }) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2">
        <Icon name={group.icon} />
        {!collapsed && <span>{group.label}</span>}
        {!collapsed && <ChevronDown className="ml-auto" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {group.items.map(item => (
          <Link key={item.path} href={item.path}
                className="flex items-center gap-2 p-2 pl-8 hover:bg-accent">
            {item.label}
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

Quando sidebar recolhida: mostrar apenas ícones dos grupos. Ao hover,
mostrar tooltip com o nome do grupo.

### Rodapé
```tsx
// app-footer.tsx
export function AppFooter() {
  return (
    <footer className="h-10 border-t flex items-center justify-center px-4 text-sm text-muted-foreground">
      {SYSTEM_NAME} v{VERSION} — {new Date().getFullYear()}
      {/* Para DSGOV: links obrigatórios do Padrão Digital de Governo */}
    </footer>
  );
}
```

### Layout do shell
```tsx
// (shell)/layout.tsx
export default function ShellLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="flex flex-col h-screen">
      <AppHeader onToggleSidebar={() => setSidebarOpen(v => !v)} sidebarOpen={sidebarOpen} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar open={sidebarOpen} navConfig={NAV_CONFIG} />
        <main className="flex-1 overflow-auto w-full px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
```

### Alinhamento da área de conteúdo

O `<main>` usa `flex-1` + `w-full` — o conteúdo começa junto à sidebar e
vai até a margem direita. **Nunca** envolver `{children}` ou a página em
`mx-auto max-w-*`: isso centraliza o conteúdo e cria vão à esquerda e sobra
à direita.

```tsx
// ❌ conteúdo centralizado em coluna estreita
<div className="container mx-auto max-w-4xl">
  <ProcessosTable />
</div>

// ✅ conteúdo alinhado à esquerda, ocupando a largura disponível
<div className="w-full space-y-4">
  <ProcessosTable />
</div>
```

`max-w-*` continua correto em dois lugares: bloco de texto corrido
(`max-w-prose` em `/sobre`, termos) e um controle isolado que ficaria
absurdo esticado (`<Input className="max-w-xs" />` para CPF).

**Formulário aproveitando a largura:**
```tsx
<form className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
  <Field name="descricao" className="col-span-full" />
  <Field name="categoria" />
  <Field name="responsavel" />
  <RichTextEditor name="observacoes" className="col-span-full" />
</form>
```

**Tabela:** `<Table className="w-full">` com as colunas distribuídas por
proporção; só a coluna de ações tem largura fixa (`w-24`).

- Login (`app/page.tsx`) não usa o ShellLayout — é página isolada.

## Indicador de navegação entre rotas (barra no topo + item com loading)

> Padrão universal em `CLAUDE.md`: **dois indicadores obrigatórios juntos.**
> Implementar no AppShell — não por feature.

**Lib:** `nprogress`
```bash
npm install nprogress && npm install --save-dev @types/nprogress
```

```tsx
// components/layout/navigation-progress.tsx
'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false, minimum: 0.15, speed: 300 })

// Hook global para saber qual path está carregando (para o item do menu)
let _setNavigatingTo: ((path: string | null) => void) | null = null

export function useNavigatingTo() {
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  useEffect(() => { _setNavigatingTo = setNavigatingTo }, [])
  return navigatingTo
}

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    NProgress.done()
    _setNavigatingTo?.(null)   // limpa o loading do item do menu
  }, [pathname, searchParams])
  return null
}

export function startNavigation(path: string) {
  NProgress.start()
  _setNavigatingTo?.(path)     // sinaliza qual item está carregando
}
```

```css
/* globals.css */
#nprogress .bar { background: hsl(var(--primary)); height: 3px; }
#nprogress .peg { box-shadow: 0 0 10px hsl(var(--primary)); }
#nprogress .spinner { display: none; }
```

```tsx
// components/layout/sidebar-nav-item.tsx
'use client'
import { Loader2 } from 'lucide-react'
import { startNavigation, useNavigatingTo } from './navigation-progress'

function SidebarNavItem({ item }: { item: NavItem }) {
  const navigatingTo = useNavigatingTo()
  const isLoading = navigatingTo === item.path

  return (
    <Link
      href={item.path}
      onClick={() => startNavigation(item.path)}
      aria-busy={isLoading}
      className={cn(
        'flex items-center gap-2 p-2 rounded hover:bg-accent transition-opacity',
        isLoading && 'opacity-70 pointer-events-none'  // bloqueia duplo clique
      )}
    >
      {isLoading
        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        : <Icon name={item.icon} className="h-4 w-4" aria-hidden="true" />
      }
      <span>{item.label}</span>
    </Link>
  )
}
```

```tsx
// app/(shell)/layout.tsx
import { Suspense } from 'react'
import { NavigationProgress } from '@/components/layout/navigation-progress'

export default function ShellLayout({ children }) {
  return (
    <div className="flex flex-col h-screen">
      <Suspense><NavigationProgress /></Suspense>
      <AppHeader ... />
      ...
    </div>
  )
}
```

**Interceptor HTTP automático — barra dispara em toda chamada fetch:**

```ts
// lib/fetch-with-progress.ts
// Wrapper sobre fetch que controla NProgress automaticamente
import { startNavigation, doneNavigation } from '@/components/layout/navigation-progress'

let activeRequests = 0  // contador para múltiplas requisições simultâneas

export async function fetchWithProgress(input: RequestInfo, init?: RequestInit): Promise<Response> {
  activeRequests++
  if (activeRequests === 1) startNavigation('')   // só inicia se não houver outra rodando

  try {
    return await fetch(input, init)
  } finally {
    activeRequests--
    if (activeRequests === 0) doneNavigation()    // só completa quando todas terminarem
  }
}
```

```ts
// lib/navigation-progress.tsx — adicionar doneNavigation e contador
export const startNavigation = (path: string) => {
  NProgress.start()
  _setNavigatingTo?.(path)
}
export const doneNavigation = () => {
  NProgress.done()
  _setNavigatingTo?.(null)
}
```

```ts
// hooks/use-api.ts — todos os hooks usam fetchWithProgress
import { fetchWithProgress } from '@/lib/fetch-with-progress'

export function useProcessos() {
  async function pesquisar(filtros: FiltroProcesso) {
    // fetchWithProgress dispara a barra automaticamente
    const res = await fetchWithProgress('/api/v1/processos?' + new URLSearchParams(filtros as any))
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }
  return { pesquisar }
}
```

**Qualquer link de navegação** (não só menu) dispara a barra:
```tsx
// Wrapper para links comuns — usar no lugar de <Link> quando necessário
import { startNavigation } from '@/components/layout/navigation-progress'

export function NavLink({ href, children, ...props }: LinkProps) {
  return (
    <Link href={href} onClick={() => startNavigation(href as string)} {...props}>
      {children}
    </Link>
  )
}
```

---

## Sistema de notificações toast

> Padrão universal em `CLAUDE.md`. Implementar no AppShell — não por feature.

**Lib:** Sonner (já vem com shadcn/ui)
```bash
npx shadcn@latest add sonner
```

```tsx
// app/(shell)/layout.tsx — adicionar uma vez
import { Toaster } from '@/components/ui/sonner'
// <Toaster position="top-right" richColors expand={false} />

// lib/notify.ts — wrapper para uso em toda a aplicação
import { toast } from 'sonner'
export const notify = {
  sucesso: (msg: string, desc?: string) => toast.success(msg, { description: desc, duration: 4000 }),
  erro:    (msg: string, desc?: string) => toast.error(msg,   { description: desc, duration: 8000 }),
  aviso:   (msg: string, desc?: string) => toast.warning(msg, { description: desc, duration: 6000 }),
  info:    (msg: string, desc?: string) => toast.info(msg,    { description: desc, duration: 4000 }),
}

// Uso nos hooks após operação assíncrona:
// import { notify } from '@/lib/notify'
// notify.sucesso('Processo criado', 'Registrado com sucesso.')
// notify.erro('Erro ao salvar', err.message)
```

`richColors` aplica cores e ícones (✅ ❌ ⚠️ ℹ️) automaticamente.

---

## Versão da aplicação no frontend

**Rodapé com versão** (injetada em build time via variável de ambiente):
```tsx
// components/layout/app-footer.tsx
export function AppFooter() {
  return (
    <footer className="h-10 border-t flex items-center justify-center
                       px-4 text-sm text-muted-foreground gap-4">
      <span>{process.env.NEXT_PUBLIC_APP_NAME}</span>
      <span>·</span>
      <span>v{process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'}</span>
      <span>·</span>
      <span>{new Date().getFullYear()}</span>
      <span>·</span>
      <Link href="/sobre" className="hover:underline">Sobre</Link>
    </footer>
  )
}
```

**Variáveis de ambiente** (`.env.example`):
```bash
NEXT_PUBLIC_APP_NAME=Nome do Sistema
NEXT_PUBLIC_APP_VERSION=   # CI injeta: $(cat VERSION)
NEXT_PUBLIC_BUILD_DATE=    # CI injeta: $(date -u +%Y-%m-%dT%H:%M:%SZ)
NEXT_PUBLIC_GIT_COMMIT=    # CI injeta: $(git rev-parse --short HEAD)
```

**Página `/sobre`** (pública, sem autenticação):
```tsx
// app/sobre/page.tsx
export default async function SobrePage() {
  const api = await fetch(`${process.env.BACKEND_URL}/version`)
    .then(r => r.json()).catch(() => null)

  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="border rounded-lg p-8 max-w-sm w-full space-y-2 text-sm">
        <h1 className="text-2xl font-semibold mb-4">
          {process.env.NEXT_PUBLIC_APP_NAME}
        </h1>
        {[
          ['Frontend',  `v${process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'}`],
          ['Backend',   api?.backend ?? '–'],
          ['Build',     process.env.NEXT_PUBLIC_BUILD_DATE ?? '–'],
          ['Commit',    process.env.NEXT_PUBLIC_GIT_COMMIT ?? '–'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono">{value}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
```
