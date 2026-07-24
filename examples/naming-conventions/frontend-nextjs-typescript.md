# Convenções de nomenclatura: Frontend Next.js + TypeScript + React

> Pesquisado contra práticas atuais da comunidade React/Next.js (2026).

## Arquivos: kebab-case (minúsculo, com hífen)
Exemplos: `user-profile.tsx`, `use-auth.ts`, `processo-form.tsx`.

Por quê: evita bug de case-sensitivity entre sistemas de arquivo (Windows/
macOS são case-insensitive por padrão; Linux não é — um import que
funciona no seu Mac pode quebrar no servidor Linux se o nome do arquivo
usar case diferente do import).

Exceção: arquivos especiais do App Router do Next.js já têm nome fixo
(`page.tsx`, `layout.tsx`, `loading.tsx`, `not-found.tsx`) — não renomear.

## Componentes: PascalCase (dentro do arquivo)
```tsx
// arquivo: user-profile.tsx
export default function UserProfile() { ... }
```
Por quê: React trata tags minúsculas como elementos HTML nativos —
PascalCase é o que diferencia um componente customizado.

## Hooks: camelCase com prefixo `use`, arquivo em kebab-case
```ts
// arquivo: use-processo.ts
export function useProcesso(id: string) { ... }
```
O prefixo `use` não é só estilo — o ESLint do React usa esse prefixo para
aplicar as regras de Hooks corretamente.

## Funções e variáveis: camelCase
```ts
const getFormattedDate = (date: Date) => { ... }
const isUserLoggedIn = () => { ... }
```

## Booleanos: prefixo `is`/`has`/`should`
```ts
const [isModalOpen, setIsModalOpen] = useState(false);
const [hasError, setHasError] = useState(false);
```

## Handlers de evento: `handle<Evento>` internamente, `on<Evento>` como prop
```tsx
function Form({ onSubmit }: { onSubmit: () => void }) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }
  return <form onSubmit={handleSubmit}>...</form>;
}
```

## ❌ Não usar: prefixo `I` em interface/tipo
Exemplos do que EVITAR: `IUserProps`, `TAuthState`.

Por quê: ao contrário de C#, TypeScript já distingue tipo de valor pelo
contexto — o prefixo é "bagagem" de Hungarian notation sem necessidade
real. Use nome descritivo direto: `UserProps`, `AuthState`.

## Tipos e interfaces: PascalCase
```ts
interface ProcessoFormProps {
  processoId: string;
  onSave: (data: ProcessoData) => void;
}

type ProcessoStatus = "aberto" | "concluido";
```

## Constantes: SCREAMING_SNAKE_CASE
Diferente de Go — em TypeScript/JS, constante de módulo é
`SCREAMING_SNAKE_CASE`: `const MAX_RETRY_COUNT = 3;`.

## Estrutura de pastas por feature (organização recomendada)
```
features/
  processo/
    components/
      processo-form.tsx
      processo-list.tsx
    hooks/
      use-processo.ts
    types.ts
```

## Exemplo completo
```tsx
// arquivo: features/processo/hooks/use-processo.ts
export function useProcesso(id: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // ...
  return { processo, isLoading, hasError };
}

// arquivo: features/processo/components/processo-card.tsx
interface ProcessoCardProps {
  processoId: string;
  onConcluir: () => void;
}

export function ProcessoCard({ processoId, onConcluir }: ProcessoCardProps) {
  const { processo, isLoading, hasError } = useProcesso(processoId);

  function handleConcluirClick() {
    onConcluir();
  }

  if (isLoading) return <Skeleton />;
  if (hasError) return <ErrorState />;

  return (
    <Card>
      <p>{processo.descricao}</p>
      <Button onClick={handleConcluirClick}>Concluir</Button>
    </Card>
  );
}
```
