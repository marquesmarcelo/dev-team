# Next.js + shadcn/ui — Estados e animacao

> Referência da skill `frontend-nextjs-shadcn`. Carregar sob demanda.

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

O `dev-fullstack` verifica explicitamente:
- Botão desabilitado durante carregamento (`expect(button).toBeDisabled()`)
- Grid mostra loading antes do resultado (`expect(skeleton).toBeVisible()`)
- Estado vazio diferente de loading (`expect(emptyMessage).toBeVisible()`)

## Skeleton, lazy loading e animações (Framer Motion)

> Padrão universal em `CLAUDE.md`. Implementar em todo componente com conteúdo assíncrono.

```bash
npm install framer-motion
```

### Skeleton — componente em shared/ui/

```tsx
// components/shared/ui/skeleton.tsx
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'animate-pulse rounded-md bg-muted',
      className
    )} />
  )
}

// Skeleton de linha de tabela — mesma estrutura da linha real
export function SkeletonTableRow() {
  return (
    <tr className="border-b">
      <td className="p-4"><Skeleton className="h-4 w-48" /></td>
      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
      <td className="p-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </td>
    </tr>
  )
}

// Skeleton de card — mesma estrutura do card real
export function SkeletonCard() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
```

### Lazy loading de rotas e componentes pesados

```tsx
// Rotas: Next.js App Router faz code splitting automaticamente por page.tsx

// Componentes pesados: import dinâmico só quando necessário
import dynamic from 'next/dynamic'

const MapEditor = dynamic(
  () => import('@/components/shared/geo/map-editor'),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-md" />,
    ssr: false,   // Leaflet não funciona em SSR
  }
)

const RichTextEditor = dynamic(
  () => import('@/components/shared/forms/rich-text-editor'),
  { loading: () => <Skeleton className="h-48 w-full rounded-md" /> }
)
```

### Animações com Framer Motion

```tsx
// Variantes reutilizáveis — definir uma vez, importar onde precisar
// lib/animations.ts
export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
}

export const slideUp = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: 8, transition: { duration: 0.15 } },
}

export const scaleModal = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1,    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}

export const staggerList = {
  visible: { transition: { staggerChildren: 0.04 } }  // 40ms entre itens
}
```

```tsx
// Modal com animação
import { motion, AnimatePresence } from 'framer-motion'
import { scaleModal, fadeIn } from '@/lib/animations'

export function Modal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            variants={fadeIn} initial="hidden" animate="visible" exit="exit"
          />
          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            variants={scaleModal} initial="hidden" animate="visible" exit="exit"
          >
            <div className="bg-background rounded-lg p-6 max-w-md w-full shadow-xl">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Lista com stagger
import { staggerList, slideUp } from '@/lib/animations'

export function AnimatedList({ items }: { items: Item[] }) {
  return (
    <motion.ul variants={staggerList} initial="hidden" animate="visible">
      {items.map(item => (
        <motion.li key={item.id} variants={slideUp}>
          <ItemCard item={item} />
        </motion.li>
      ))}
    </motion.ul>
  )
}

// Transição de skeleton → conteúdo
export function FadeContent({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="skeleton" {...fadeIn}>
          <SkeletonCard />
        </motion.div>
      ) : (
        <motion.div key="content" variants={slideUp} initial="hidden" animate="visible">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Imagens com lazy loading

```tsx
import Image from 'next/image'

// Next.js Image já faz lazy loading por padrão
// placeholder="blur" mostra versão borrada enquanto carrega
<Image
  src={url}
  alt={alt}
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/png;base64,..."   // gerar via plaiceholder ou similar
  className="rounded-md transition-opacity duration-300"
/>
```
