---
name: ai-anthropic
description: Use ao implementar funcionalidades de IA usando a API da Anthropic (Claude), quando project.config.md indicar este provedor. Cobre formato de chamada, saída estruturada via tool use, e convenções específicas.
---

# IA: Anthropic Claude API

## Cliente
- Use o SDK oficial da linguagem do backend (ex: `anthropic-sdk-go` para
  Go) — nunca monte a chamada HTTP manualmente, salvo necessidade muito
  específica.
- A interface `LLMClient` em `/port` expõe métodos de negócio (ex:
  `AvaliarQuestao(ctx, questao) (*Avaliacao, error)`), nunca o método
  genérico do SDK — o adapter em `/adapter/llm` é quem chama o SDK e
  traduz para o tipo de domínio.

## Saída estruturada
- Use **tool use** (function calling) para forçar saída estruturada,
  definindo um schema de input da "ferramenta" que representa o formato
  de resposta esperado — isso é mais confiável que pedir "responda em
  JSON" no texto do prompt e fazer parse manual.
- Sempre valide a resposta da ferramenta contra o schema esperado antes de
  converter para o tipo de domínio. Resposta que não valida é tratada como
  erro do adapter, propagado como erro de domínio apropriado — nunca
  "consertada" silenciosamente.

## Escolha de modelo
- Modelo configurado em `project.config.md`. Para tarefas de
  classificação/validação simples, considere um modelo mais leve antes de
  usar o mais capaz disponível — nem toda chamada precisa do modelo mais
  caro.

## Prompts
- Versionados em `/prompts/<nome>.md`, nunca como string solta no meio do
  código Go.
- Comentário no topo do arquivo de prompt: data da última revisão e
  motivo da mudança, se houver.

## Custo e observabilidade
- Toda resposta da API retorna contagem de tokens de entrada/saída — capture
  isso e exponha como métrica Prometheus (`labels`: nome da oportunidade
  de IA, não o conteúdo).
- Para chamadas de alto volume (ex: avaliar todas as questões de um banco
  de uma vez), avalie batching ou rate limiting antes de disparar em
  paralelo sem controle.

## Tratamento de erro
- Timeout, erro de rede, e rate limit (HTTP 429) são tratados
  separadamente: rate limit pede retry com backoff; timeout/erro de rede
  segue o fallback definido em design.md.

## Dado sensível
- Antes de montar o prompt, confirme se o dado enviado já passou pela
  checagem de sensibilidade registrada em `oportunidades-ia.md`. Se o
  projeto usa a API pública da Anthropic sem acordo específico de dados,
  considere mascarar/anonimizar campos sensíveis (CPF, nome completo de
  terceiros, dado de processo) antes de incluir no prompt, salvo decisão
  explícita em contrário registrada em design.md.
