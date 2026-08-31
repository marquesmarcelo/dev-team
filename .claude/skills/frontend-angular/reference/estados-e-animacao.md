# Angular — Estados e animacao

> Referência da skill `frontend-angular`. Carregar sob demanda.

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

## Skeleton, lazy loading e animações (@angular/animations)

> Padrão universal em `CLAUDE.md`. Implementar em todo componente com conteúdo assíncrono.

### Skeleton — componente em shared/ui/

```typescript
// shared/ui/skeleton/skeleton.component.ts
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="skeleton" [style.height]="height" [style.width]="width"
         aria-busy="true" aria-label="Carregando..."></div>
  `,
  styles: [`
    .skeleton {
      background: var(--skeleton-bg, #e2e8f0);
      border-radius: 4px;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
  `]
})
export class SkeletonComponent {
  @Input() height = '1rem'
  @Input() width  = '100%'
}
```

```html
<!-- Skeleton de tabela — substituir as linhas reais enquanto carrega -->
@if (isLoading()) {
  @for (i of [1,2,3,4,5]; track i) {
    <tr>
      <td><app-skeleton height="1rem" width="60%"></app-skeleton></td>
      <td><app-skeleton height="1rem" width="40%"></app-skeleton></td>
      <td><app-skeleton height="1rem" width="50%"></app-skeleton></td>
    </tr>
  }
} @else {
  @for (item of items(); track item.id) {
    <tr><!-- linha real --></tr>
  }
}
```

### Lazy loading de módulos e componentes

```typescript
// app.routes.ts — lazy loading por rota (code splitting automático)
export const routes: Routes = [
  {
    path: 'processos',
    loadComponent: () =>
      import('./features/processo/processo-list.component')
        .then(m => m.ProcessoListComponent)
  },
  {
    path: 'processos/novo',
    loadComponent: () =>
      import('./features/processo/processo-form.component')
        .then(m => m.ProcessoFormComponent)
  },
]

// Componentes pesados — defer block (Angular 17+)
// Carrega só quando o bloco entra no viewport
@defer (on viewport) {
  <app-map-editor [value]="localizacao()" (change)="setLocalizacao($event)"/>
} @placeholder {
  <app-skeleton height="400px"></app-skeleton>
} @loading {
  <app-skeleton height="400px"></app-skeleton>
}
```

### Animações com @angular/animations

```typescript
// app.config.ts
import { provideAnimations } from '@angular/platform-browser/animations'

export const appConfig: ApplicationConfig = {
  providers: [provideAnimations(), ...]
}
```

```typescript
// animations.ts — variantes reutilizáveis
import { trigger, transition, style, animate, query, stagger } from '@angular/animations'

export const fadeAnimation = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 }))
  ])
])

export const slideUpAnimation = trigger('slideUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('200ms cubic-bezier(0,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(8px)' }))
  ])
])

export const scaleModalAnimation = trigger('scaleModal', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate('200ms cubic-bezier(0,0,0.2,1)', style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
  ])
])

export const listStaggerAnimation = trigger('listStagger', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      stagger('40ms', [
        animate('200ms cubic-bezier(0,0,0.2,1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
])
```

```typescript
// Uso nos componentes
@Component({
  animations: [fadeAnimation, slideUpAnimation, scaleModalAnimation, listStaggerAnimation],
  template: `
    <!-- Backdrop do modal -->
    <div *ngIf="modalAberto" @fade class="backdrop"></div>

    <!-- Modal com scale -->
    <div *ngIf="modalAberto" @scaleModal class="modal">...</div>

    <!-- Lista com stagger -->
    <ul [@listStagger]="items().length">
      <li *ngFor="let item of items()" @slideUp>{{ item.nome }}</li>
    </ul>

    <!-- Skeleton → conteúdo com cross-fade -->
    @if (isLoading()) {
      <app-skeleton @fade height="200px"></app-skeleton>
    } @else {
      <div @slideUp><!-- conteúdo real --></div>
    }
  `
})
```
