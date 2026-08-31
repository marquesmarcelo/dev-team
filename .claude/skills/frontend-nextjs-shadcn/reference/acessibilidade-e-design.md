# Next.js + shadcn/ui — Acessibilidade e design

> Referência da skill `frontend-nextjs-shadcn`. Carregar sob demanda.

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

## Anti-padrões de design — detectar antes de entregar

shadcn/ui é o template mais afetado pelos vícios de "AI slop". Antes de
considerar qualquer tela entregue, verificar que não há:

```
❌ Inter como única fonte (vício de AI slop)
❌ Gradiente roxo-para-azul decorativo
❌ Texto cinza (#999, #aaa) sobre fundo colorido
❌ Cards aninhados dentro de outros cards
❌ Ícone em rounded-square acima de todo heading
❌ Preto puro — usar tint da cor primária
❌ Bounce/elastic easing em animações
❌ Padding menor que 16px em áreas de conteúdo
```

**Detector automático** (sem API key, roda no CI):
```bash
npx impeccable detect src/       # varredura do diretório
npx impeccable detect --json src/ # saída JSON para CI
```

60 regras determinísticas — instalar via `npx impeccable install` para
integração com Claude Code. Repositório: https://github.com/pbakaus/impeccable
