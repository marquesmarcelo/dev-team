# Angular — Grid e listagem

> Referência da skill `frontend-angular`. Carregar sob demanda.

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
