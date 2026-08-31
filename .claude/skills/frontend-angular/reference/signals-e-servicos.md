# Angular — Signals e servicos

> Referência da skill `frontend-angular`. Carregar sob demanda.

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
