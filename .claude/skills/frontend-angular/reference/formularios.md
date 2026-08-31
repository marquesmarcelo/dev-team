# Angular — Formularios

> Referência da skill `frontend-angular`. Carregar sob demanda.

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

## Editor de texto rico (WYSIWYG)

> Usar quando `ux.md` indicar campo com editor rico. Regras universais
> (quando usar, sanitização, acessibilidade) em `CLAUDE.md` → "Editor
> de texto rico".

**Lib principal:** TipTap — mais moderno, WAI-ARIA correto, sem jQuery,
suporta saída em **HTML** ou **Markdown**.
**Alternativa:** ngx-quill — mais simples de integrar, mas output só HTML.

```bash
# TipTap (recomendado)
npm install @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-link

# ngx-quill (alternativa mais simples)
npm install quill ngx-quill
```

### TipTap com Angular (wrapper manual)

```typescript
// shared/forms/rich-text-editor/rich-text-editor.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy,
         ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA, forwardRef } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => RichTextEditorComponent),
    multi: true
  }],
  template: `
    <div class="rich-editor" [class.disabled]="disabled">
      <div class="toolbar" role="toolbar" aria-label="Formatação de texto">
        <button type="button" (click)="cmd('toggleBold')"
                [attr.aria-pressed]="editor?.isActive('bold')"
                aria-label="Negrito"><strong>B</strong></button>
        <button type="button" (click)="cmd('toggleItalic')"
                [attr.aria-pressed]="editor?.isActive('italic')"
                aria-label="Itálico"><em>I</em></button>
        <button type="button" (click)="cmd('toggleBulletList')"
                [attr.aria-pressed]="editor?.isActive('bulletList')"
                aria-label="Lista">≡</button>
        <button type="button" (click)="cmd('toggleOrderedList')"
                [attr.aria-pressed]="editor?.isActive('orderedList')"
                aria-label="Lista numerada">1.</button>
      </div>
      <div #editorEl class="editor-content" role="textbox"
           aria-multiline="true" [attr.aria-disabled]="disabled"></div>
    </div>
  `
})
export class RichTextEditorComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() outputFormat: 'html' | 'markdown' = 'html'
  @Input() disabled = false
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef

  editor?: Editor
  private onChange = (_: string) => {}
  private onTouched = () => {}

  ngOnInit() {
    this.editor = new Editor({
      element: this.editorEl.nativeElement,
      extensions: [StarterKit, Link.configure({ openOnClick: false })],
      editable: !this.disabled,
      onUpdate: ({ editor }) => {
        const value = this.outputFormat === 'html' ? editor.getHTML() : editor.getText()
        this.onChange(value)
        this.onTouched()
      }
    })
  }

  cmd(name: string) { (this.editor?.chain().focus() as any)[name]().run() }

  writeValue(value: string)               { this.editor?.commands.setContent(value ?? '') }
  registerOnChange(fn: any)               { this.onChange = fn }
  registerOnTouched(fn: any)              { this.onTouched = fn }
  setDisabledState(isDisabled: boolean)   { this.editor?.setEditable(!isDisabled) }
  ngOnDestroy()                           { this.editor?.destroy() }
}
```

```html
<!-- Uso com Reactive Forms -->
<app-rich-text-editor formControlName="descricao" outputFormat="html">
</app-rich-text-editor>
```

**O backend sanitiza o HTML** antes de persistir (ver `CLAUDE.md`).

## Dirty state — proteção contra perda de dados

> Regra universal em `CLAUDE.md`. Aplicar em todo formulário de modal e de página.

```typescript
// core/guards/unsaved-changes.guard.ts
import { Injectable, inject } from '@angular/core'
import { CanDeactivate } from '@angular/router'

export interface HasUnsavedChanges {
  isDirty: () => boolean
}

@Injectable({ providedIn: 'root' })
export class UnsavedChangesGuard implements CanDeactivate<HasUnsavedChanges> {
  canDeactivate(component: HasUnsavedChanges): boolean {
    if (!component.isDirty()) return true
    return window.confirm(
      'Você tem alterações não salvas. Deseja descartá-las e sair?'
    )
  }
}

// app.routes.ts — adicionar guard nas rotas de formulário
{
  path: 'processos/novo',
  component: ProcessoFormComponent,
  canDeactivate: [UnsavedChangesGuard]
}
```

```typescript
// shared/ui/unsaved-changes-dialog/unsaved-changes-dialog.component.ts
@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  template: `
    @if (visible) {
      <div class="dialog-overlay" (click)="keepEditing()">
        <div class="dialog" role="alertdialog"
             aria-labelledby="dialog-title"
             aria-describedby="dialog-desc"
             (click)="$event.stopPropagation()">
          <h2 id="dialog-title">Alterações não salvas</h2>
          <p id="dialog-desc">
            Você tem alterações que não foram salvas.
            Se sair agora, elas serão perdidas.
          </p>
          <div class="actions">
            <br-button emphasis="secondary" (click)="keepEditing()">
              Continuar editando
            </br-button>
            <br-button emphasis="primary" danger (click)="discard()">
              Descartar alterações
            </br-button>
          </div>
        </div>
      </div>
    }
  `
})
export class UnsavedChangesDialogComponent {
  @Input()  visible = false
  @Output() discardChanges  = new EventEmitter<void>()
  @Output() continueEditing = new EventEmitter<void>()

  discard()      { this.discardChanges.emit() }
  keepEditing()  { this.continueEditing.emit() }
}
```

```typescript
// features/processo/processo-form.component.ts
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GovbrDsWebcomponentsModule,
            UnsavedChangesDialogComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <!-- campos -->
      <br-button emphasis="secondary" (click)="cancelar()">Cancelar</br-button>
      <br-button type="submit" emphasis="primary" [loading]="salvando()">Salvar</br-button>
    </form>

    <app-unsaved-changes-dialog
      [visible]="mostrarConfirmacao()"
      (discardChanges)="descartarENavegar()"
      (continueEditing)="mostrarConfirmacao.set(false)">
    </app-unsaved-changes-dialog>
  `
})
export class ProcessoFormComponent implements HasUnsavedChanges, OnInit {
  mostrarConfirmacao = signal(false)
  private pendingAction?: () => void

  form = inject(FormBuilder).group({
    nome:   ['', Validators.required],
    status: ['', Validators.required],
  })

  private valoresIniciais = this.form.value

  isDirty(): boolean {
    return JSON.stringify(this.form.value) !== JSON.stringify(this.valoresIniciais)
  }

  cancelar() {
    if (this.isDirty()) {
      this.pendingAction = () => this.router.back()
      this.mostrarConfirmacao.set(true)
    } else {
      this.router.back()
    }
  }

  descartarENavegar() {
    this.mostrarConfirmacao.set(false)
    this.pendingAction?.()
  }

  // Para uso em modal — interceptar fechamento
  tentarFechar(onClose: () => void) {
    if (this.isDirty()) {
      this.pendingAction = onClose
      this.mostrarConfirmacao.set(true)
    } else {
      onClose()
    }
  }
}
```

**Alerta nativo ao recarregar:**
```typescript
// No componente de formulário (página ou modal)
@HostListener('window:beforeunload', ['$event'])
onBeforeUnload(event: BeforeUnloadEvent) {
  if (this.isDirty()) event.preventDefault()
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
