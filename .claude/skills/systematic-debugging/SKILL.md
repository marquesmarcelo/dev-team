---
name: systematic-debugging
description: Use quando encontrar qualquer bug, teste falhando, comportamento inesperado, erro de compilação persistente ou container que não sobe. Processo de 4 fases: investigar → analisar → hipótese → implementar. Proibido pular fases ou fazer tentativas aleatórias.
---

# Debugging Sistemático — 4 Fases

> Derivado do `systematic-debugging` do Superpowers (Jesse Vincent / obra),
> adaptado para as stacks e contexto deste projeto.

**Regra central:** nunca fazer mudança aleatória esperando que resolva.
Cada mudança deve ter hipótese clara e verificação do resultado.
Pular fase = investigação incompleta = bug volta ou piora.

---

## Fase 1 — Reprodução confiável (não avance sem isso)

Antes de qualquer diagnóstico, reproduza o problema de forma consistente.

```bash
# Rodar o teste que falha isoladamente
docker compose run --rm backend <comando-teste> -run TestNomeExato

# Se for problema de container
docker compose logs backend --tail=50
docker compose ps

# Se for erro de frontend
# Abrir DevTools → Console → reproduzir o comportamento
```

**Critérios para avançar:**
- [ ] Consigo reproduzir o problema toda vez que executo o mesmo passo
- [ ] Sei exatamente qual arquivo/linha/endpoint está envolvido
- [ ] Tenho a mensagem de erro completa (não truncada)

Se não conseguir reproduzir consistentemente: documentar as condições
em que aparece (flaky test? só em CI? só com dados específicos?) antes de avançar.

---

## Fase 2 — Investigação da causa raiz (não dos sintomas)

**Erro: tratar o sintoma.** Se o log diz "connection refused", o sintoma é
"conexão recusada" — a causa pode ser container não iniciado, porta errada,
variável de ambiente vazia, ou banco ainda inicializando.

**Correto: rastrear até a origem.**

```bash
# Ler o erro completo, não só a última linha
docker compose logs backend 2>&1 | head -100

# Verificar variáveis de ambiente
docker compose run --rm backend env | grep DATABASE

# Verificar se o serviço dependente está saudável
docker compose exec postgres pg_isready

# Verificar se a migration rodou
docker compose run --rm backend <comando-migrate-status>

# Git: o que mudou recentemente que pode ter causado isso?
git log --oneline -10
git diff HEAD~1 -- <arquivo-suspeito>
```

**Técnicas específicas por tipo de problema:**

| Tipo | Onde olhar primeiro |
|---|---|
| Teste unitário falhando | Mock configurado errado? Interface do port mudou? |
| Teste E2E falhando | Estado do DOM assíncrono? Selector quebrou? Dados diferentes? |
| Container não sobe | `docker compose logs <serviço>` — ler as primeiras linhas do erro |
| 500 no backend | Stack trace completo nos logs + request que disparou |
| Frontend não renderiza | Console do browser → erros de rede → response da API |
| Migration falha | Conflito com migration anterior? Coluna já existe? |
| Build quebrado | Primeiro erro, não o último — compiladores encadeiam erros |

**Critérios para avançar:**
- [ ] Identifiquei a linha/função/serviço específico que origina o problema
- [ ] Entendo *por que* esse ponto está falhando (não só *onde*)
- [ ] Descartei ao menos 2 causas alternativas

---

## Fase 3 — Hipótese e teste mínimo

Antes de modificar qualquer código, formule uma hipótese explícita:

```
Hipótese: "O erro ocorre porque [causa específica].
           Se eu [mudança mínima], o comportamento deve mudar para [resultado esperado]."
```

**Teste mínimo primeiro:** faça a menor mudança possível que valida ou
refuta a hipótese. Não corrija e refatore ao mesmo tempo.

```bash
# Exemplo: suspeita que a variável DATABASE_URL está vazia
# Teste mínimo: imprimir o valor antes de usar
docker compose run --rm backend env | grep DATABASE_URL
# → confirma ou refuta a hipótese sem mudar código de produção

# Exemplo: suspeita de race condition em teste assíncrono
# Teste mínimo: adicionar wait explícito
# → se resolver, confirma a hipótese de timing
```

**Se a hipótese for refutada:** volte à Fase 2 com a nova informação.
Não construa sobre uma hipótese errada.

**Critérios para avançar:**
- [ ] Hipótese formulada explicitamente por escrito
- [ ] Teste mínimo executado e resultado registrado
- [ ] Hipótese confirmada (ou nova hipótese formulada após refutação)

---

## Fase 4 — Implementação da correção

Com a causa raiz confirmada, implemente a correção:

1. **Corrija apenas o que causou o problema.** Não refatore código adjacente
   enquanto corrige um bug — isso mistura responsabilidades e dificulta
   o review. Se notar algo errado por perto, anote para uma tarefa separada.

2. **Escreva ou atualize o teste** que teria capturado este bug.
   Bug sem teste = bug que pode voltar silenciosamente.

3. **Verifique defense-in-depth:** o bug poderia ocorrer em outro lugar
   pelo mesmo motivo? Se sim, corrija todos os pontos ou documente o padrão.

4. **Verificação final:**
```bash
# O teste que falhava agora passa?
docker compose run --rm backend <comando-teste> -run TestNomeExato

# Nenhum outro teste quebrou?
docker compose run --rm backend <comando-teste-completo>

# O comportamento esperado no sistema está correto?
# (re-executar o cenário que originou o bug)
```

**Critérios de conclusão:**
- [ ] Teste que reproduzia o bug agora passa
- [ ] Toda a suíte de testes passa (sem regressão)
- [ ] Comportamento esperado verificado manualmente se necessário
- [ ] Teste adicionado ou atualizado para cobrir este caso

---

## Armadilhas comuns — o que nunca fazer

| Armadilha | O que fazer em vez disso |
|---|---|
| Mudar configuração aleatória esperando que resolva | Fase 2 — identificar a causa antes de mudar qualquer coisa |
| "Acho que é X, vou corrigir X" sem verificar | Fase 3 — formular hipótese e testar com mudança mínima |
| Corrigir e refatorar na mesma mudança | Separar em dois commits: fix + refactor |
| Deletar e reescrever quando há bug | O reescrito vai ter os mesmos bugs se a causa raiz não for entendida |
| Pedir ao LLM "tenta outra abordagem" em loop | Voltar à Fase 2 — mais informação, não mais tentativas |
| Marcar como resolvido antes de verificar | Fase 4 sempre inclui verificação explícita |

---

## Condition-based waiting (testes assíncronos)

Quando testes E2E falham por timing (elemento não encontrado, estado ainda carregando):

```typescript
// ❌ Nunca: sleep arbitrário
await page.waitForTimeout(2000)

// ✅ Sempre: esperar pela condição real
await page.waitForSelector('[data-testid="grid-results"]')
await expect(page.getByRole('button', { name: 'Salvar' })).toBeEnabled()
await page.waitForResponse(resp => resp.url().includes('/api/v1/processos'))
```

A condição de espera deve ser o estado real que indica que a operação
completou — nunca um tempo fixo.
