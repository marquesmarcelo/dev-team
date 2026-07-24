---
name: accessibility
description: Use ao projetar telas (ux-designer), implementar componentes (dev-frontend), ou revisar código de UI (code-reviewer). Define o padrão de acessibilidade adotado pelo projeto (WCAG 2.2 AA) com regras práticas e verificáveis — não teoria abstrata.
---

# Acessibilidade: WCAG 2.2 Level AA

## Por que WCAG 2.2 AA (e não outra versão ou nível)

<cite index="18-1">WCAG 2.2 foi lançado em outubro de 2023 e é o padrão global atual. Se você está construindo um novo site hoje, projetar para 2.2 é simplesmente a abordagem mais inteligente e preparada para o futuro.</cite> O nível AA é o alvo padrão — é o nível exigido pela maioria das leis e regulações internacionais (ADA, European Accessibility Act, Lei Brasileira de Inclusão). <cite index="19-1">Nível AA oferece acesso mais amplo do que o Nível A, especialmente para usuários de tecnologias assistivas.</cite>

## WCAG 2.2 e WAI-ARIA — complementares, não concorrentes

**WCAG 2.2 é o padrão** (define o "o quê" — ex: "foco de teclado deve ser visível", "contraste mínimo de 4.5:1").

**WAI-ARIA é uma técnica de implementação** (define o "como" para componentes dinâmicos — `role`, `aria-label`, `aria-live`, `aria-expanded`, etc.). <cite index="36-1">WAI-ARIA é mencionado como uma das técnicas no documento "Técnicas para WCAG 2".</cite>

Na prática: você segue o WCAG 2.2 como meta; usa WAI-ARIA quando HTML semântico puro não é suficiente para transmitir semântica a tecnologias assistivas. <cite index="37-1">Só use ARIA quando absolutamente necessário — na maioria dos casos, HTML combinado com boas práticas de UX permite acessibilidade sem WAI-ARIA.</cite>

Para projetos do setor público brasileiro, vale adicionalmente o **eMAG** (Modelo de Acessibilidade em Governo Eletrônico), que segue o WCAG com adaptações para o contexto brasileiro.

---

## Os 4 princípios do WCAG — POUR

| Princípio | Pergunta central | Exemplos práticos |
|---|---|---|
| **Perceptível** | O usuário consegue perceber o conteúdo? | Alt text em imagens, contraste suficiente, legenda em vídeo |
| **Operável** | O usuário consegue interagir? | Teclado funciona, foco visível, sem armadilha de teclado |
| **Compreensível** | O usuário entende? | Labels claros, mensagens de erro descritivas, comportamento previsível |
| **Robusto** | Funciona em tecnologias assistivas? | HTML semântico, ARIA correto, compatível com screen readers |

---

## Regras práticas por categoria (WCAG 2.2 AA — o que fazer de fato)

### 1. Contraste de cor (Perceptível — 1.4.3 / 1.4.11)
- Texto normal: razão mínima de **4.5:1** entre texto e fundo.
- Texto grande (≥18pt ou ≥14pt negrito): mínimo **3:1**.
- Componentes de UI e estado de foco: mínimo **3:1** contra cores adjacentes.
- **shadcn/ui + Tailwind:** usar as variáveis CSS de tema (`--foreground`, `--background`, etc.) em vez de cores hardcoded — elas já são calibradas para contraste. Não sobrescrever com cinza claro em fundo branco sem verificar.
- Ferramentas de verificação: Chrome DevTools (inspetor de acessibilidade), extensão axe, whocanuse.com.

### 2. Foco de teclado visível (Operável — 2.4.7 / 2.4.11 — novo em 2.2)
- Todo elemento interativo (botão, link, campo, checkbox) deve ter foco de teclado **visível e com contraste mínimo de 3:1** contra o entorno.
- **shadcn/ui:** o Radix por baixo já gerencia foco corretamente. Não remover `outline` via CSS global (`* { outline: none }` é um anti-padrão — nunca fazer isso).
- Em modo escuro, confirmar que o anel de foco ainda é visível — o Tailwind `focus-visible:ring` usa variáveis que podem precisar de ajuste no tema escuro.
- Novidade do WCAG 2.2 (2.4.12): ao receber foco, o componente não pode estar **completamente oculto** por outro elemento (ex: header fixo cobrindo o campo focado).

### 3. Área de clique/toque (Operável — 2.5.8 — novo em 2.2)
- Alvo mínimo: **24x24 CSS pixels** (AA). Recomendado: **44x44px** para evitar erros em mobile.
- Botões de ícone sem texto (ex: fechar modal, editar linha) precisam de área de clique suficiente — usar `p-3` no mínimo em torno do ícone.
- Em grids com botões de ação por linha (editar/excluir): garantir espaçamento entre eles — evitar dois botões de 16px colados.

### 4. Semântica HTML e ARIA (Robusto — 4.1.2)
- Use elementos HTML nativos antes de ARIA: `<button>` em vez de `<div onClick>`, `<nav>` em vez de `<div role="navigation">` — o navegador já entrega ARIA correto para elementos semânticos.
- **shadcn/ui/Radix:** não adicionar `role`, `aria-*` extras nos componentes Radix — eles já gerenciam ARIA internamente. Adicionar ARIA por cima pode criar conflito e piorar a experiência de screen reader.
- Quando usar ARIA: apenas quando HTML semântico não for suficiente (ex: `aria-live` para anúncio dinâmico, `aria-expanded` para accordion customizado).
- `role="presentation"` e `aria-hidden="true"` para elementos puramente decorativos (ícones acompanhados de texto).

### 5. Labels e formulários (Compreensível — 1.3.5 / 3.3.1 / 3.3.2)
- Todo campo de formulário tem `<label>` associado programaticamente — nunca depender só de `placeholder` como label (placeholder some quando o usuário começa a digitar).
- Campos de erro: a mensagem de erro é associada ao campo via `aria-describedby` — não apenas visualmente próxima.
- Campos obrigatórios: marcados via `aria-required="true"` (ou atributo `required`) E visualmente (asterisco com legenda explicando o símbolo).
- shadcn/ui `<FormField>` já gerencia a associação label/campo/erro quando usado corretamente com `react-hook-form` — usar o padrão do shadcn, não criar `<input>` solto.

### 6. Mensagens de status dinâmicas (Robusto — 4.1.3)
- Resultados de busca que atualizam sem recarregar a página precisam ser anunciados para screen readers via `aria-live`.
- Mensagens de sucesso/erro de formulário que aparecem após submit precisam de `role="status"` ou `role="alert"`.
- Nunca usar apenas cor para indicar estado (ex: campo de erro só com borda vermelha — precisa também de ícone ou texto descritivo).

### 7. Autenticação acessível (Compreensível — 3.3.8 — novo em 2.2)
- Formulários de login não podem exigir que o usuário resolva teste cognitivo (CAPTCHA de texto distorcido, puzzle) sem oferecer alternativa.
- **Sempre permitir que o gerenciador de senhas preencha o campo** (`autocomplete="current-password"`, nunca `autocomplete="off"` em campo de senha).
- Não bloquear paste em campos de senha — impossibilita uso de gerenciadores de senhas.

### 8. Navegação por teclado (Operável — 2.1.1)
- Toda funcionalidade acessível pelo mouse deve ser acessível pelo teclado.
- Ordem de tabulação deve ser lógica e seguir a ordem visual da tela.
- Modais e dialogs capturar o foco ao abrir e devolvê-lo ao elemento que o abriu ao fechar (Radix/shadcn já faz isso — não quebrar esse comportamento).
- Escape deve fechar modais, dropdowns e tooltips.

### 9. Textos alternativos (Perceptível — 1.1.1)
- Imagens informativas: `alt` descritivo do conteúdo ou função.
- Imagens decorativas: `alt=""` (string vazia) — screen reader ignora.
- Ícones com texto ao lado: `aria-hidden="true"` no ícone (o texto já comunica a função).
- Ícones sem texto: `aria-label` descritivo no botão ou `<title>` no SVG.

### 10. Sem armadilha de teclado (Operável — 2.1.2)
- Modais e dropdowns retornam o foco quando fechados. Radix gerencia isso — não interferir.
- Iframes ou embeds não prendem o foco indefinidamente.

---

## Novidades específicas do WCAG 2.2 (vs. 2.1)

| Critério | Nível | O que mudou |
|---|---|---|
| **2.4.11** Focus Not Obscured (Minimum) | AA | Foco não pode ficar completamente oculto por header fixo ou cookie banner |
| **2.4.12** Focus Not Obscured (Enhanced) | AAA | Foco visível sem qualquer ocultação parcial |
| **2.5.7** Dragging Movements | AA | Toda ação de drag-and-drop tem alternativa acessível (ex: botões para mover) |
| **2.5.8** Target Size (Minimum) | AA | Alvo mínimo de 24x24px |
| **3.2.6** Consistent Help | AA | Ajuda no mesmo lugar em todas as páginas |
| **3.3.7** Redundant Entry | AA | Não pedir a mesma informação duas vezes no mesmo fluxo |
| **3.3.8** Accessible Authentication | AA | Sem testes cognitivos em autenticação sem alternativa |

---

## shadcn/ui + Radix: o que já vem pronto e o que você precisa fazer

| Já vem pronto pelo Radix | Você ainda precisa garantir |
|---|---|
| ARIA roles em componentes interativos | Labels dos campos de formulário |
| Gerenciamento de foco em Dialog/Modal | Contraste de cor do seu tema |
| Escape fecha dropdown/dialog | `alt` descritivo em imagens |
| `aria-expanded` em Accordion/Collapsible | `aria-live` em resultados dinâmicos |
| Navegação por teclado em Menu/Select | Área de toque mínima em botões de ícone |

---

## Ferramentas de verificação (integrar ao fluxo de desenvolvimento)

- **axe DevTools** (extensão Chrome gratuita) — verifica automaticamente os critérios verificáveis; rodar antes de qualquer PR de UI.
- **WAVE** (extensão Chrome) — visualização mais didática dos erros.
- **Chrome DevTools** → Painel Lighthouse → aba Accessibility — integra ao CI com threshold mínimo de 90.
- **Verificação manual obrigatória** (o que as ferramentas automáticas não pegam):
  - Navegar pela tela **só com teclado** (sem mouse) e verificar ordem de foco e acesso a todas as ações.
  - Testar com **VoiceOver** (Mac/iOS) ou **NVDA** (Windows, gratuito) pelo menos nos fluxos principais.
  - Verificar em **zoom de 200%** — conteúdo não pode sumir ou sobrepor.

---

## No contexto do setor público brasileiro

O **eMAG** (Modelo de Acessibilidade em Governo Eletrônico) é a referência oficial do governo brasileiro. Ele segue o WCAG e adiciona:
- Barra de acessibilidade padrão com atalhos de teclado (ex: `alt+1` para conteúdo, `alt+2` para menu).
- Teclas de atalho documentadas e não conflitantes com os do sistema operacional.
- Compatibilidade explícita com leitores de tela em português (NVDA com eSpeak PT-BR, Orca no Linux).

Para aplicações governamentais voltadas ao público externo, a conformidade com eMAG é obrigatória, não opcional.
