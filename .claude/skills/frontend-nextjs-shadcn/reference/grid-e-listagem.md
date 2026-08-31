# Next.js + shadcn/ui — Grid e listagem

> Referência da skill `frontend-nextjs-shadcn`. Carregar sob demanda.

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
