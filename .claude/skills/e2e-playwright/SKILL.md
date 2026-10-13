---
name: e2e-playwright
description: Use ao construir ou rodar testes E2E com Playwright, quando project.config.md indicar esta ferramenta. Cobre estrutura de pastas, seletores recomendados, e como lidar com Server Components do Next.js.
---

# Testes E2E: Playwright

## Por que Playwright (e não Cypress)
Playwright é hoje a recomendação padrão para projetos novos: suporte
nativo a múltiplos motores de navegador (Chromium, Firefox, WebKit),
paralelização gratuita sem serviço de nuvem pago, e funciona bem com
Server Components do Next.js sem configuração especial — a página já
chega renderizada e hidratada quando o teste interage com ela.

## Estrutura de pastas
```
e2e/
  <feature>/
    <cenario>.spec.ts
  fixtures/
    auth.ts            # storage state reutilizável entre testes
  playwright.config.ts
```

## Seletores recomendados
- Prefira `getByRole`, `getByLabel`, `getByText` (seletores baseados em
  acessibilidade) em vez de seletor de CSS/classe — mais resistente a
  mudança visual que não muda o comportamento.
- Evite seletor baseado em classe do Tailwind (`.bg-blue-500`) — isso
  quebra a cada ajuste visual sem relação com o comportamento testado.

## Autenticação entre testes
- Salve o estado de sessão uma vez (`storageState`) em um projeto de setup
  do Playwright, e reutilize entre os testes — evita logar de novo em
  cada teste.

## Auto-waiting
- Playwright já espera elemento ficar visível/estável/habilitado antes de
  interagir — não adicionar `sleep`/`waitForTimeout` manual salvo
  necessidade muito específica e documentada.

## Exemplo de teste a partir de um cenário Given/When/Then
```ts
// e2e/processo/criar-processo.spec.ts
import { test, expect } from '@playwright/test';

test('criar processo com dados válidos', async ({ page }) => {
  // Given: usuário autenticado na tela de processos
  await page.goto('/processos');

  // When: preenche o formulário com dado real do spec.md
  await page.getByRole('button', { name: 'Novo' }).click();
  await page.getByLabel('Descrição').fill('Solicitação de equipamento');
  await page.getByRole('button', { name: 'Salvar' }).click();

  // Then: processo aparece na listagem
  await expect(page.getByText('Solicitação de equipamento')).toBeVisible();
});
```

## CI
- `npx playwright test --shard=1/N` para paralelizar entre workers do
  pipeline, sem precisar de serviço pago de nuvem.

## Fixtures com afterEach obrigatório — ver regra em CLAUDE.md

Todo helper que cria dado via API durante o teste deve registrar a limpeza
**dentro do helper** usando `test.afterEach` ou `page.request.delete`.
Nunca deixar a cargo de quem chama.

```typescript
// e2e/helpers/fixtures.ts
import { Page, expect } from '@playwright/test'

/**
 * Cria um processo via API e registra cleanup automático.
 * Quem chama não precisa fazer nada — o dado é removido após o teste.
 */
export async function criarProcesso(
  page: Page,
  dados: { descricao: string }
): Promise<string> {
  const resp = await page.request.post('/api/v1/processos', { data: dados })
  expect(resp.ok()).toBeTruthy()
  const { id } = await resp.json()

  // Cleanup registrado internamente — nunca deixar para quem chama
  page.on('close', async () => {
    await page.request.delete(`/api/v1/processos/${id}`).catch(() => {})
  })

  return id
}
```

**Para fixtures de scope de test (sem `page.on`):**

```typescript
// playwright.config.ts ou fixture global
import { test as base } from '@playwright/test'

export const test = base.extend<{ processo: string }>({
  processo: async ({ page }, use) => {
    // Setup: criar o dado
    const resp = await page.request.post('/api/v1/processos', {
      data: { descricao: 'Processo E2E fixture' }
    })
    const { id } = await resp.json()

    // Passar o ID para o teste
    await use(id)

    // Teardown: limpar após o teste — sempre executado, mesmo com falha
    await page.request.delete(`/api/v1/processos/${id}`).catch(() => {})
  }
})

// Uso no teste — limpo automaticamente após:
test('deve editar processo', async ({ page, processo }) => {
  await page.goto(`/processos/${processo}/editar`)
  // processo é deletado ao final, sucesso ou falha
})
```

## Variável RUN_TESTS — ver regra em CLAUDE.md

Testes E2E só rodam quando `RUN_TESTS=true`:

```yaml
# docker-compose.dev.yml
services:
  playwright:
    image: mcr.microsoft.com/playwright:v1.44.0-jammy
    environment:
      RUN_TESTS: "true"
      BASE_URL: http://frontend:3000
    command: >
      sh -c '[ "$$RUN_TESTS" = "true" ] &&
             npx playwright test || echo "E2E pulados (RUN_TESTS=false)"'
    depends_on:
      - frontend
      - backend
```
