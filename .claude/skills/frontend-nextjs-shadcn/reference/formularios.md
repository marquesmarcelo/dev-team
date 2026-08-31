# Next.js + shadcn/ui — Formularios

> Referência da skill `frontend-nextjs-shadcn`. Carregar sob demanda.

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

## Editor de texto rico (WYSIWYG)

> Usar quando `ux.md` indicar campo com editor rico. Regras universais
> (quando usar, sanitização obrigatória no backend, acessibilidade)
> em `CLAUDE.md` → "Editor de texto rico".

**Lib:** TipTap (`@tiptap/react`) — acessível, extensível, WAI-ARIA correto.
Suporta saída em **HTML** ou **Markdown** — definir por feature no `spec.md`.

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
            @tiptap/extension-link @tiptap/extension-image \
            @tiptap/extension-markdown   # saída Markdown (opcional)
```

```tsx
// components/shared/forms/rich-text-editor.tsx
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  outputFormat?: 'html' | 'markdown'   // padrão: html
  placeholder?: string
  disabled?: boolean
}

export function RichTextEditor({
  value, onChange, outputFormat = 'html', placeholder, disabled
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const out = outputFormat === 'markdown'
        ? editor.storage.markdown?.getMarkdown?.() ?? editor.getText()
        : editor.getHTML()
      onChange(out)
    },
  })

  return (
    <div className={`border rounded-md ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex gap-1 border-b p-1 flex-wrap"
           role="toolbar" aria-label="Formatação de texto">
        <button type="button" aria-label="Negrito"
                aria-pressed={editor?.isActive('bold')}
                onClick={() => editor?.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </button>
        <button type="button" aria-label="Itálico"
                aria-pressed={editor?.isActive('italic')}
                onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </button>
        <button type="button" aria-label="Lista"
                aria-pressed={editor?.isActive('bulletList')}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          ≡
        </button>
        <button type="button" aria-label="Lista numerada"
                aria-pressed={editor?.isActive('orderedList')}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          1.
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="p-3 min-h-[120px] prose prose-sm max-w-none"
        placeholder={placeholder}
      />
    </div>
  )
}
```

**Integrar com react-hook-form:**
```tsx
<Controller name="descricao" control={control}
  render={({ field }) =>
    <RichTextEditor value={field.value} onChange={field.onChange} outputFormat="html" />
  }
/>
```

**O backend sanitiza antes de persistir** — ver `CLAUDE.md` "Editor de texto rico".
sanitização equivalente no lado do cliente também.

## Dirty state — proteção contra perda de dados

> Regra universal em `CLAUDE.md`. Aplicar em todo formulário de modal e de página.

```tsx
// hooks/use-dirty-state.ts
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useDirtyState<T extends Record<string, unknown>>(
  initialValues: T
) {
  const [values, setValues]   = useState<T>(initialValues)
  const [isDirty, setIsDirty] = useState(false)
  const router = useRouter()

  const setValue = useCallback((key: keyof T, value: unknown) => {
    setValues(prev => {
      const next = { ...prev, [key]: value }
      // Sujo se qualquer campo diferir do valor inicial
      const dirty = Object.keys(next).some(k => next[k] !== initialValues[k])
      setIsDirty(dirty)
      return next as T
    })
  }, [initialValues])

  const reset = useCallback(() => {
    setValues(initialValues)
    setIsDirty(false)
  }, [initialValues])

  // Alerta nativo ao recarregar/fechar a aba
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Bloquear navegação de rota com dados sujos
  useEffect(() => {
    if (!isDirty) return
    // Next.js 14+ App Router — interceptar com push/replace customizado
    const originalPush = router.push.bind(router)
    // Usar um signal de bloqueio — solicitar confirmação antes de navegar
  }, [isDirty, router])

  return { values, setValue, isDirty, reset }
}
```

```tsx
// components/shared/ui/unsaved-changes-dialog.tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel,
         AlertDialogContent, AlertDialogDescription,
         AlertDialogFooter, AlertDialogHeader, AlertDialogTitle }
  from '@/components/ui/alert-dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  onDiscard: () => void           // "Descartar alterações"
  onKeepEditing: () => void       // "Continuar editando"
}

export function UnsavedChangesDialog({
  open, onDiscard, onKeepEditing
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem alterações que não foram salvas. Se sair agora, elas serão perdidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeepEditing}>
            Continuar editando
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Descartar alterações
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

```tsx
// Uso em modal
export function ProcessoModal({ open, onClose }: ModalProps) {
  const { values, setValue, isDirty, reset } = useDirtyState({ nome: '', status: '' })
  const [confirmClose, setConfirmClose] = useState(false)

  const handleClose = () => {
    if (isDirty) {
      setConfirmClose(true)   // mostrar confirmação
    } else {
      onClose()               // fechar direto se não tem dados
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
        <DialogContent
          onInteractOutside={(e) => {
            e.preventDefault()   // impedir fechar ao clicar fora
            handleClose()        // tratar manualmente com dirty check
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            handleClose()
          }}>
          {/* campos do formulário */}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={confirmClose}
        onDiscard={() => { reset(); setConfirmClose(false); onClose() }}
        onKeepEditing={() => setConfirmClose(false)}
      />
    </>
  )
}

// Uso em página de formulário (Novo / Editar)
export default function ProcessoFormPage() {
  const { values, setValue, isDirty, reset } = useDirtyState(initialValues)
  const router = useRouter()
  const [confirmNav, setConfirmNav] = useState(false)

  const handleCancel = () => {
    if (isDirty) setConfirmNav(true)
    else router.back()
  }

  return (
    <>
      {/* formulário */}
      <Button variant="outline" onClick={handleCancel}>Cancelar</Button>

      <UnsavedChangesDialog
        open={confirmNav}
        onDiscard={() => { reset(); router.back() }}
        onKeepEditing={() => setConfirmNav(false)}
      />
    </>
  )
}
```

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
