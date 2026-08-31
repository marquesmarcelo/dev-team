# References

Documentação de referência para uso pelos agentes durante o desenvolvimento.
Serve como fallback quando o repositório oficial estiver indisponível.

## Arquivos

| Arquivo | Conteúdo | Tamanho | Quando usar |
|---|---|---|---|
| `dsgov-llms.txt` | Índice com links para cada página da documentação DSGOV | ~144KB | Navegar pelo catálogo de componentes, encontrar a URL de um componente específico |
| `dsgov-llms-full.txt` | Documentação completa DSGOV WBC unificada | ~1MB | Consulta offline completa, quando a URL oficial estiver indisponível |

## ⚠️ Nunca ler estes arquivos inteiros

`dsgov-llms-full.txt` tem cerca de **30 mil linhas**. Um `Read` sem
intervalo nesse arquivo consome a janela de contexto inteira e o agente
perde o spec, o design e o código que estava lendo. `dsgov-llms.txt`, com
700 linhas, tem o mesmo problema em menor escala.

**A regra vale para qualquer arquivo de referência aqui:** localizar por
busca, ler só o trecho.

```bash
# 1. achar onde o componente está documentado
grep -n "br-input" .claude/references/dsgov-llms-full.txt | head -20

# 2. ler apenas a faixa de linhas ao redor
sed -n '4200,4320p' .claude/references/dsgov-llms-full.txt
```

Com a ferramenta `Read`, usar sempre `offset` e `limit`. Nunca `Read` puro.

**Estratégia de uso:**
1. `grep` em `dsgov-llms.txt` para localizar o componente → pegar a URL `.md`
2. Buscar a URL via `web_fetch` — documentação mais atualizada
3. Se falhar: `grep` + leitura por faixa de linhas em `dsgov-llms-full.txt`

## Como atualizar

```bash
# Baixar versões atualizadas
curl -o .claude/references/dsgov-llms.txt \
  https://webcomponents-ds.estaleiro.serpro.gov.br/llms.txt

curl -o .claude/references/dsgov-llms-full.txt \
  https://webcomponents-ds.estaleiro.serpro.gov.br/llms-full.txt

# Verificar versão no cabeçalho
head -5 .claude/references/dsgov-llms.txt

# Commitar com a versão
git add .claude/references/
git commit -m "docs: atualizar referências DSGOV para vX.Y.Z"
```

Versão atual dos arquivos: **2.0.0** (julho/2026)
