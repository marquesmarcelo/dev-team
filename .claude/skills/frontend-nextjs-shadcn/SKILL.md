---
name: frontend-nextjs-shadcn
description: Use ao implementar frontend em Next.js com shadcn/ui, quando project.config.md indicar esta stack. Cobre estrutura de pastas, convenção de hooks, uso de componentes shadcn/ui, e padrões específicos do App Router.
---

# Frontend: Next.js (App Router) + shadcn/ui

> Convenção de nomenclatura completa em
> `examples/naming-conventions/frontend-nextjs-typescript.md` — leia antes
> de nomear arquivos, componentes ou hooks. Exemplo de árvore de pastas
> completa em `examples/folder-structures/frontend-nextjs-shadcn.md`.

## Estrutura de pastas
```
src/
  app/                          # rotas Next.js (App Router)
    (shell)/                    # layout autenticado
      layout.tsx
      processos/page.tsx        # cada feature tem sua rota
      usuarios/page.tsx
    page.tsx                    # rota raiz = login
  components/
    layout/                     # AppShell, Header, Sidebar, Footer
    shared/
      ui/                       # componentes visuais sem lógica de domínio
        status-badge.tsx        #   StatusBadge, Skeleton, EmptyState, ErrorState
        skeleton-table.tsx
        empty-state.tsx
        error-state.tsx
        modal.tsx               #   Modal/Dialog genérico
        confirm-delete.tsx      #   Confirmação de exclusão
      forms/                    # componentes de formulário reutilizáveis
        autocomplete-create.tsx #   AutocompleteCreate (já implementado)
        rich-text-editor.tsx    #   RichTextEditor (já implementado)
      hooks/                    # hooks sem vínculo com domínio
        use-local-storage.ts    #   useLocalStorage
        use-pagination.ts       #   usePagination
        use-debounce.ts         #   useDebounce
    features/                   # componentes e hooks por domínio
      processo/
        components/             #   componentes específicos da feature
        hooks/                  #   useProcessos, useProcesso, etc.
        types.ts                #   interfaces e types da feature
      usuario/
        components/
        hooks/
        types.ts
  lib/                          # utilitários puros (sem JSX, sem hooks)
```

**Regra de decisão shared/ vs features/:**
- Pode ser usado em mais de uma feature → `shared/ui/`, `shared/forms/` ou `shared/hooks/`
- Específico de uma entidade → `features/<entidade>/`
- Componente `shared/` nunca importa de `features/`


## Convenções específicas
- Instalar componente via `npx shadcn add <componente>` antes de
  implementar algo do zero — verificar primeiro se já existe equivalente
  em `/components/ui`.
- Componentes de UI consomem hooks (`useProcesso()`, etc.), nunca fazem
  fetch direto via `useEffect` + `fetch` solto no componente.
- Tratamento de erro e loading: todo hook expõe `{ data, isLoading, error }`
  ou equivalente — componente sempre trata os três estados visivelmente.
- Formato de erro de API: ler `project.config.md` (seção "Padrão de
  comunicação") para o formato JSON de erro e tratar de forma consistente
  em todos os hooks (ex: um `apiClient` central que já normaliza o erro).
- Server Components por padrão (App Router); usar `"use client"` apenas
  quando houver interatividade real (estado, evento, hook de navegador).
- Acessibilidade: shadcn/ui já usa Radix por baixo (ARIA correto) — não
  sobrescrever atributos ARIA gerados pelos primitivos sem motivo forte.

## Formulário de CRUD: componente autônomo (página ou modal)
O formulário de criação/edição nunca sabe se está numa página ou num
`Dialog` do shadcn/ui — ele só recebe props:
```tsx
interface ProcessoFormProps {
  initialData?: Processo;        // presente = edição; ausente = criação
  onSubmit: (data: ProcessoFormData) => void;
  onCancel: () => void;
}

export function ProcessoForm({ initialData, onSubmit, onCancel }: ProcessoFormProps) {
  // ...
}
```
Uso em página:
```tsx
<ProcessoForm onSubmit={salvar} onCancel={() => router.back()} />
```
Uso em modal:
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <ProcessoForm onSubmit={salvar} onCancel={() => setOpen(false)} />
  </DialogContent>
</Dialog>
```
A decisão de página-vs-modal fica no componente que envolve o formulário,
nunca dentro do `ProcessoForm` — ver `ux.md` da feature para qual dos dois
foi decidido.

## Autocomplete/Combobox com criação inline

> Padrão universal definido no `CLAUDE.md`. Use quando `ux.md` indicar campo
> de autocomplete. O comportamento é o mesmo em qualquer tecnologia — esta
> seção descreve apenas a implementação específica desta stack.

Use o componente `<Command>` do shadcn/ui:

```tsx
// components/shared/autocomplete-create.tsx
interface AutocompleteCreateProps<T extends { id: string; codigo: string; descricao: string }> {
  value: T | null;
  onChange: (item: T) => void;
  onSearch: (query: string) => Promise<T[]>;
  onCreateNew?: (descricao: string) => Promise<T>;  // undefined = sem criação inline
  placeholder?: string;
}

export function AutocompleteCreate<T extends { id: string; codigo: string; descricao: string }>({
  value, onChange, onSearch, onCreateNew, placeholder = "Buscar..."
}: AutocompleteCreateProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 1) setItems(await onSearch(query));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const exactMatch = items.some(i => i.descricao.toLowerCase() === query.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}
                className="w-full justify-between">
          {value ? `${value.codigo} — ${value.descricao}` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandGroup>
              {items.map(item => (
                <CommandItem key={item.id} onSelect={() => { onChange(item); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value?.id === item.id ? "opacity-100" : "opacity-0")} />
                  {item.codigo} — {item.descricao}
                </CommandItem>
              ))}
            </CommandGroup>
            {/* Criação inline: só se onCreateNew fornecido e não há correspondência exata */}
            {onCreateNew && query.length > 0 && !exactMatch && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={async () => {
                    setIsCreating(true);
                    const novo = await onCreateNew(query);
                    onChange(novo);
                    setOpen(false);
                    setIsCreating(false);
                  }} disabled={isCreating}>
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating ? "Criando..." : `Criar "${query}"`}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

Endpoint de busca: `GET /api/v1/<entidade>/autocomplete?q=<texto>&limit=20`
Retorno: `[{ id, codigo, descricao }]` — ILIKE no Postgres com índice na coluna.

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

## Relação com o UX Designer
- Antes de implementar uma tela nova, leia `specs/<feature>/ux.md` (gerado
  pelo subagent `ux-designer`) para fluxo, estados de tela (vazio, erro,
  carregando) e hierarquia visual — não improvise layout sem esse
  documento quando ele existir.

## Dois Dockerfiles por serviço
> Antes de criar ou atualizar qualquer Dockerfile, leia os exemplos em
> `examples/docker/frontend/` — são os arquivos de referência deste projeto.

- `Dockerfile` — produção: multi-stage, imagem final com apenas o output
  do `next build` (standalone + static). Ver
  `examples/docker/frontend/Dockerfile`.
- `Dockerfile.dev` — desenvolvimento: imagem Node completa, não copia
  código (vem do volume), roda `npm install && npm run dev` na
  inicialização. Ver `examples/docker/frontend/Dockerfile.dev`.

## .dockerignore (obrigatório, criado junto com o Dockerfile)
```
node_modules
.next
out
.env
.env.*
*.log
.git
```

## Comandos sempre via container
```bash
docker compose run --rm frontend npm install
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
```
Mesma regra do backend: se algo só funciona instalando na máquina do
desenvolvedor, o ambiente containerizado está incompleto.

## Acessibilidade (WCAG 2.2 AA — obrigatório, não opcional)

> Leia `.claude/skills/accessibility/SKILL.md` antes de implementar qualquer
> tela nova. O resumo abaixo cobre os pontos mais críticos na prática com
> shadcn/ui, mas a skill tem o padrão completo.

**O que o Radix/shadcn já entrega (não refazer):**
- ARIA roles em todos os componentes interativos
- Gerenciamento de foco em Dialog, Modal, DropdownMenu
- `Escape` fecha dropdown/dialog
- `aria-expanded` em Accordion, Collapsible, Select

**O que você ainda precisa garantir:**
- `<label>` associado a cada campo — nunca depender só de `placeholder`
- Mensagens de erro vinculadas via `aria-describedby`
- `alt` descritivo em imagens informativas; `alt=""` em decorativas
- `aria-label` em botões de ícone sem texto visível
- `aria-live="polite"` em resultados de busca e mensagens de status que
  atualizam sem recarregar
- Nunca adicionar `* { outline: none }` — remove foco de teclado de tudo
- Nunca usar `autocomplete="off"` em campos de senha — bloqueia gerenciador
  de senhas
- Área de toque mínima de 24x24px (idealmente 44x44px) em botões de ícone
- Não sobrescrever cores com valores de baixo contraste — usar variáveis CSS
  do tema shadcn

**Para sistemas públicos governamentais — verificar se eMAG é necessário**
(ver skill de acessibilidade).

## UI assíncrona por padrão (obrigatório em todo componente interativo)

Toda ação que chama o backend segue este padrão — não é opcional por
componente.

### Hook expõe estados, componente reflete

```ts
// O componente nunca gerencia loading/submitting — vem do hook
const { data, isLoading, isSubmitting, error, search } = useProcessos();
```

### Botão de qualquer ação

```tsx
<Button
  onClick={handlePesquisar}
  disabled={isLoading || isSubmitting}  // desabilitado durante qualquer operação
>
  {isLoading ? (
    <><Spinner className="mr-2 h-4 w-4" /> Aguarde...</>
  ) : (
    'Pesquisar'
  )}
</Button>
```

Regra: **nunca** um botão que dispara ação para o backend permanece
habilitado enquanto a operação está em andamento. Isso previne:
- Duplo clique criando dois objetos
- Dupla pesquisa com resultados se sobrepondo
- Duplo submit de formulário

### Formulário durante envio

```tsx
<fieldset disabled={isSubmitting}>  {/* desabilita todos os campos */}
  <Input name="descricao" />
  <Select name="categoria" />
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Salvando...' : 'Salvar'}
  </Button>
</fieldset>
```

### Grid com estados visualmente distintos

```tsx
function ProcessoGrid({ state, data, meta }: Props) {
  if (state.isLoading) {
    return <GridSkeleton rows={state.pageSize} />;  // skeleton, não vazio
  }
  if (state.hasError) {
    return (
      <GridError
        message={state.error}
        onRetry={state.retry}  // sempre oferecer retry
      />
    );
  }
  if (!data.length) {
    return <GridEmpty message="Nenhum resultado encontrado" />;  // distinto do loading
  }
  return (
    <DataTable data={data} columns={columns} />
  );
}
```

**Os quatro estados são obrigatórios e visualmente distintos:**
- `isLoading` → skeleton rows (usuário sabe que está carregando)
- `hasError` → mensagem + botão de tentar novamente
- `isEmpty` → mensagem "sem resultados" (não vazio em branco)
- `hasData` → tabela/grid real

### Construtor de testes E2E deve verificar estes estados

O `construtor-testes-e2e` verifica explicitamente:
- Botão desabilitado durante carregamento (`expect(button).toBeDisabled()`)
- Grid mostra loading antes do resultado (`expect(skeleton).toBeVisible()`)
- Estado vazio diferente de loading (`expect(emptyMessage).toBeVisible()`)

## Grid de listagem: paginação e ordenação (obrigatório, ver CLAUDE.md)

Três comportamentos sempre juntos: clique alterna asc/desc, ordenação
padrão garantida, e estado persistido entre visitas.

### Hook de estado do grid (URL + localStorage combinados)

**Três regras de ouro:**
1. **Grid não executa busca automática ao carregar** — só após o usuário clicar em "Pesquisar". Isso evita requisição desnecessária quando o usuário ainda quer ajustar os filtros.
2. **Filtros e critérios de ordenação voltam preenchidos** ao retornar à tela — restaurados do localStorage antes de qualquer interação do usuário.
3. URL reflete o estado atual — página compartilhável com os mesmos filtros.

A URL é a fonte de verdade para compartilhar; o `localStorage` faz os filtros voltarem preenchidos quando o usuário retorna à tela. Regra de reconciliação: se a URL já tem parâmetros explícitos (link compartilhado), a URL vence; se a URL está "limpa" (navegação normal), hidrata a partir do `localStorage`; se não há nada em nenhum dos dois, usa os defaults de `design.md`.

```ts
// hooks/use-grid-state.ts
const STORAGE_KEY_PREFIX = 'grid-state:';

interface GridState {
  filtros: Record<string, string>;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export function useGridState(feature: string, defaults: GridState) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageKey = STORAGE_KEY_PREFIX + feature;

  const [state, setState] = useState<GridState>(() => {
    if (searchParams.toString()) {
      // URL explícita vence — parseia os params com fallback nos defaults
      return parseParamsOrDefaults(searchParams, defaults);
    }
    const salvo = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    return salvo ? JSON.parse(salvo) : defaults;
  });

  function updateState(partial: Partial<GridState>) {
    const novo = { ...state, ...partial };
    setState(novo);
    localStorage.setItem(storageKey, JSON.stringify(novo));
    router.push(`?${toSearchParams(novo)}`, { scroll: false });
  }

  function toggleSort(coluna: string) {
    if (state.sort === coluna) {
      // mesma coluna: alterna asc <-> desc (nunca um terceiro estado "sem ordenação")
      updateState({ sort: coluna, order: state.order === 'asc' ? 'desc' : 'asc' });
    } else {
      // coluna diferente: assume a nova coluna, começa em crescente
      updateState({ sort: coluna, order: 'asc', page: 1 });
    }
  }

  function updateFiltros(filtros: Record<string, string>) {
    // mudar filtro sempre volta para a página 1 — manter a página antiga
    // depois de um filtro novo mostraria resultado incoerente
    updateState({ filtros, page: 1 });
  }

  return { state, toggleSort, updateFiltros, updateState };
}
```

### Cabeçalho de coluna clicável
```tsx
function ColumnHeader({ coluna, label, state, onSort }: ColumnHeaderProps) {
  const ativo = state.sort === coluna;
  return (
    <TableHead
      role="button"
      tabIndex={0}
      onClick={() => onSort(coluna)}
      aria-sort={ativo ? (state.order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label} {ativo && (state.order === 'asc' ? '↑' : '↓')}
    </TableHead>
  );
}
```

### Defaults vêm de design.md, nunca inventados no componente
```ts
const defaults: GridState = {
  filtros: {},
  sort: 'criado_em',   // valor definido em design.md pelo arquiteto
  order: 'desc',       // idem
  page: 1,
  pageSize: 20,
};
```

### Paginação resiliente a estado obsoleto
Se o `localStorage` tiver uma página salva (ex: página 5) mas a busca
atual só retornar 2 páginas (`meta.total_pages`), o componente clampa
para a última página válida em vez de mostrar grid vazio — nunca confiar
ciegamente no número salvo sem validar contra a resposta real da API.

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
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <AppFooter />
    </div>
  );
}
```

- Login (`app/page.tsx`) não usa o ShellLayout — é página isolada.

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

## Loading por linha no grid (padrão obrigatório)

> Padrão universal em `CLAUDE.md`. Rastrear qual ID está sendo processado,
> nunca um boolean global — cada linha tem seu próprio estado.

```tsx
// hooks/use-processos.ts — rastrear ID por operação
export function useProcessos() {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId,  setEditingId]  = useState<string | null>(null)

  async function excluir(id: string) {
    setDeletingId(id)
    try {
      await fetchWithProgress(`/api/v1/processos/${id}`, { method: 'DELETE' })
      notify.sucesso('Processo excluído')
      await recarregar()
    } catch (e) {
      notify.erro('Erro ao excluir')
    } finally {
      setDeletingId(null)
    }
  }

  async function abrirEdicao(id: string) {
    setEditingId(id)
    // navegação ou carregamento dos dados do item
    await router.push(`/processos/${id}/editar`)
    // editingId é limpo pelo NavigationProgress quando a rota completa
    setEditingId(null)
  }

  return { deletingId, editingId, excluir, abrirEdicao }
}
```

```tsx
// Linha do grid — botões com LoadingButton por ID
function ProcessoRow({ row }: { row: Processo }) {
  const { deletingId, editingId, excluir, abrirEdicao } = useProcessos()

  return (
    <tr>
      <td>{row.descricao}</td>
      <td>
        <LoadingButton
          variant="ghost"
          size="icon"
          loading={editingId === row.id}
          loadingText=""     // ícone spinner substitui o ícone de editar
          aria-label="Editar processo"
          onClick={() => abrirEdicao(row.id)}
        >
          <Pencil className="h-4 w-4" />
        </LoadingButton>

        <LoadingButton
          variant="ghost"
          size="icon"
          loading={deletingId === row.id}
          loadingText=""
          aria-label="Excluir processo"
          onClick={() => excluir(row.id)}
        >
          <Trash2 className="h-4 w-4" />
        </LoadingButton>
      </td>
    </tr>
  )
}
```

O spinner substitui o ícone durante o loading — mesma área, sem
deslocar o layout da tabela. A barra superior dispara automaticamente
via `fetchWithProgress` (exclusão) ou `startNavigation` (edição).

## APP_ENV — configuração por ambiente

> Regra universal em `CLAUDE.md`. Implementar no `next.config.ts` e
> no middleware de headers.

```typescript
// next.config.ts
const isProd = process.env.APP_ENV === 'production'

const nextConfig = {
  // Source maps apenas em desenvolvimento
  productionBrowserSourceMaps: false,

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: isProd ? [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; ')
          },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ] : [
          // Development: sem CSP restritivo — não quebrar HMR e DevTools
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}
export default nextConfig
```

```typescript
// components/providers/env-guard.tsx — bloqueio best-effort de DevTools em prod
'use client'
import { useEffect } from 'react'

export function EnvGuard() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') return

    // Best-effort: detectar DevTools abertos pelo delta de tempo
    // Não é inviolável — o valor real está nos outros controles de segurança
    const handler = () => {
      const start = performance.now()
      // eslint-disable-next-line no-debugger
      debugger
      if (performance.now() - start > 100) {
        document.body.innerHTML = ''
      }
    }
    const interval = setInterval(handler, 1000)
    return () => clearInterval(interval)
  }, [])

  return null
}
```

```bash
# .env.example
APP_ENV=development
NEXT_PUBLIC_APP_ENV=development   # versão pública para o componente client-side
```

Em produção o CI injeta `APP_ENV=production` e `NEXT_PUBLIC_APP_ENV=production`.

## Autenticação — regra de segurança obrigatória

**JWT nunca vai para `localStorage` ou `sessionStorage`.**
O token é armazenado em cookie `HttpOnly` pelo backend — o frontend
não toca no token diretamente. O cookie é enviado automaticamente
pelo browser em cada requisição.

```typescript
// ❌ PROIBIDO — vulnerável a XSS
localStorage.setItem('token', jwt)
const token = localStorage.getItem('token')
headers: { Authorization: `Bearer ${token}` }

// ✅ CORRETO — cookie HttpOnly gerenciado pelo browser/servidor
// O frontend não faz nada com o token.
// O browser envia o cookie automaticamente.
// O backend lê o JWT do cookie, nunca do header Authorization.

// Login: só chama a API — o backend seta o cookie na resposta
await fetchWithProgress('/api/auth/login', {
  method: 'POST',
  credentials: 'include',   // ← obrigatório para enviar/receber cookies
  body: JSON.stringify({ email, senha }),
})

// Todas as requisições autenticadas: credentials: 'include'
await fetchWithProgress('/api/v1/processos', {
  credentials: 'include',   // ← cookie enviado automaticamente
})

// Logout: só chama a API — o backend apaga o cookie
await fetchWithProgress('/api/auth/logout', {
  method: 'POST',
  credentials: 'include',
})
```

O `fetchWithProgress` deve sempre incluir `credentials: 'include'`
nas chamadas autenticadas. O interceptor HTTP automático pode setar
isso globalmente se toda a aplicação for autenticada.

## LoadingButton — componente obrigatório em shared/ui/

> Padrão universal em `CLAUDE.md`. Todo botão que dispara operação assíncrona
> usa este componente — nunca `<Button disabled={loading}>` ad-hoc sem visual.

```tsx
// components/shared/ui/loading-button.tsx
import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string   // texto no gerúndio: "Salvando...", "Pesquisando..."
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, children, disabled, className, ...props }, ref) => (
    <Button
      ref={ref}
      disabled={disabled || loading}
      className={cn(loading && 'opacity-75', className)}
      {...props}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {loading && loadingText ? loadingText : children}
    </Button>
  )
)
LoadingButton.displayName = 'LoadingButton'
export { LoadingButton }
```

**Uso nos formulários e ações:**
```tsx
// Submit de formulário
<LoadingButton
  type="submit"
  loading={isSubmitting}
  loadingText="Salvando..."
>
  Salvar
</LoadingButton>

// Ação de pesquisa
<LoadingButton
  loading={isLoading}
  loadingText="Pesquisando..."
  onClick={pesquisar}
>
  Pesquisar
</LoadingButton>

// Ação destrutiva
<LoadingButton
  variant="destructive"
  loading={isDeleting}
  loadingText="Excluindo..."
  onClick={() => excluir(id)}
>
  Excluir
</LoadingButton>
```

**Acessibilidade automática:**
- `disabled` bloqueia clique e é anunciado por screen readers
- O spinner tem `aria-hidden="true"` — o texto já comunica o estado
- Para ações longas, adicionar `aria-live="polite"` no container pai

## Editor de texto rico

> Usar quando `ux.md` indicar campo com editor rico. Regras universais
> (quando usar, sanitização obrigatória no backend, acessibilidade)
> em `CLAUDE.md` → "Editor de texto rico".

**Lib recomendada:** TipTap (`@tiptap/react`) — acessível, extensível,
WAI-ARIA correto por padrão.

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

```tsx
// components/shared/rich-text-editor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

export function RichTextEditor({ value, onChange, placeholder, disabled }: {
  value: string;  onChange: (v: string) => void
  placeholder?: string;  disabled?: boolean
}) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  return (
    <div className="border rounded-md">
      <div className="flex gap-1 border-b p-1" role="toolbar" aria-label="Formatação de texto">
        <button type="button" aria-label="Negrito" aria-pressed={editor?.isActive('bold')}
                onClick={() => editor?.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </button>
        {/* itálico, lista, link conforme nível definido em ux.md */}
      </div>
      {/* TipTap já injeta role="textbox" aria-multiline="true" na área de edição */}
      <EditorContent editor={editor} className="p-3 min-h-[120px] prose prose-sm max-w-none" />
    </div>
  )
}
```

Integrar com react-hook-form via `Controller`:
```tsx
<Controller name="descricao" control={control}
  render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} />} />
```

**O backend sanitiza o HTML** antes de persistir (ver `CLAUDE.md`).
O frontend nunca renderiza HTML salvo sem passar por `DOMPurify` ou
sanitização equivalente no lado do cliente também.

## Relação com o UX Designer
- Testes de integração de componente (ex: Testing Library) > testes
  unitários isolados de componente puro.
- `npm run lint` / `npm run build` antes de considerar a tarefa concluída.
