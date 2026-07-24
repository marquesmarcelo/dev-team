# Spec: <nome-da-feature>

## Objetivo
<O que esta funcionalidade entrega e por quê, em 1-2 frases>

## Não-objetivos
- <O que explicitamente NÃO está incluso, para evitar escopo invisível>

## Ator(es)
- <quem usa isso>

## Fluxo principal
Como <ator>, quero <ação>, para <valor de negócio>.

1. <passo 1>
2. <passo 2>
3. <passo 3>

## Fluxos alternativos / erros
- <condição de erro 1> → <comportamento esperado>
- <condição de erro 2> → <comportamento esperado>

## Critérios de aceite (Given/When/Then)

```gherkin
Cenário: <nome do cenário>
  Dado <estado inicial>
  Quando <ação>
  Então <resultado esperado>

Cenário: <nome do cenário de erro>
  Dado <estado inicial>
  Quando <ação inválida>
  Então <erro esperado, incluindo código HTTP se aplicável>
```

## Exemplos concretos com dados reais

> Obrigatório, não opcional. Cada cenário acima precisa de pelo menos um
> exemplo com dado real (ou o mais próximo de real possível) — não dado
> fictício genérico como "Teste 123". Esses exemplos alimentam diretamente
> a construção dos testes E2E pelo `construtor-testes-e2e` e a validação
> pelo `qa-tester`. Se o dono do produto não tiver dado real à mão, peça
> um exemplo plausível e específico do domínio antes de prosseguir.

| Cenário | Dado de entrada | Comportamento esperado |
|---|---|---|
| <nome do cenário 1> | <ex: descrição="Solicitação de troca de monitor", responsável="João Silva"> | <ex: processo aparece na listagem com status "Aberto"> |
| <nome do cenário de erro> | <ex: descrição vazia> | <ex: erro 400 "descrição é obrigatória"> |

## Proposta de testes (obrigatório — sem isso a spec não está completa)

> Preenchida pelo `analista-requisitos` junto com os critérios de aceite.
> Se não for possível propor para algum caso, o analista pergunta ao
> usuário antes de fechar a spec.

| Cenário | Camada de teste | Casos de borda a cobrir |
|---|---|---|
| <cenário do GWT 1> | <unitário/integração/E2E> | <ex: campo vazio, valor duplicado, sem permissão> |
| <cenário do GWT 2> | <...> | <...> |

**Comportamentos assíncronos a verificar no E2E (se houver tela):**
- [ ] Botão de ação fica desabilitado durante a requisição
- [ ] Grid mostra estado de "carregando" durante pesquisa
- [ ] Estado vazio é visualmente distinto do estado de carregamento
- [ ] Mensagem de erro aparece quando a requisição falha

## Restrições conhecidas
- <ex: deve responder em até Xms, deve ser compatível com LGPD, etc>

## Requisitos não-funcionais de performance (preencher só se relevante)
> A maioria das funcionalidades NÃO precisa disto — preencha apenas se
> esta funcionalidade é crítica para o negócio e espera tráfego
> não-trivial, ou se o dono do produto tem uma exigência concreta de
> performance. Deixe em branco e siga adiante se não for o caso.
- Tráfego esperado (ex: 100 requisições/segundo, 500 usuários simultâneos): <...>
- Latência máxima aceitável (ex: p95 < 300ms): <...>
- Justificativa para exigir teste de carga: <...>

## Decisões já tomadas (não re-discutir)
- <qualquer decisão de produto já fechada com o dono>

## Nível de rigor exigido
- [ ] Leve (só este arquivo)
- [ ] Completo (gerar também design.md, tasks.md, evidence.md)

> Justificativa do nível escolhido: <preencher — ex: "envolve dado sensível, requer rigor completo">

## Wireframes (gerado pelo analista-requisitos)
> Esboço de validação — não é design final. O ux-designer fará o design
> completo com estados, acessibilidade e comportamentos. O objetivo aqui
> é o dono do produto confirmar a estrutura antes de acionar o arquiteto.

### Tela: <nome>
```
<wireframe ASCII aqui>
```

### Tela: <nome> (formulário de criação/edição, se houver)
```
<wireframe ASCII aqui>
```
