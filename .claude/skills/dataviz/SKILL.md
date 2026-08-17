---
name: dataviz
description: Use ao criar gráficos, dashboards ou qualquer visualização de dados. Ativa com "gráfico", "dashboard", "visualizar", "chart", "plot", "relatório visual". Incorpora princípios de Tufte, NYT Graphics e Linear. Escolhe a biblioteca pela stack e pelo propósito — Recharts (Next.js/React), ECharts (Angular), Chart.js (universal). Distingue storytelling (uma tese, um gráfico) de dashboard (exploração de dados).
---

# Dataviz — Visualização de Dados

> Baseado em: `indi256s/dataviz-skill`, `majiayu000/claude-skill-registry` (data-viz-2025),
> `danielrosehill/Claude-Data-Visualisation-And-Publishing-Plugin` e na skill `dataviz`
> embutida no Claude Code.
>
> Princípios: Edward Tufte (data-ink ratio), NYT Graphics (rigor + clareza),
> Linear design (estética dark minimalista).

---

## Primeira pergunta — storytelling ou dashboard?

```
Storytelling: um gráfico, uma tese, uma conclusão clara
  → Usuário vai ler e entender uma mensagem específica
  → Ex: "vendas cresceram 40% após a campanha de março"

Dashboard: exploração, múltiplos dados, decisão contínua
  → Usuário vai interagir, filtrar, comparar ao longo do tempo
  → Ex: painel de acompanhamento de KPIs operacionais
```

A diferença muda tudo: tipo de gráfico, quantidade de elementos,
nível de interatividade, paleta de cores, tamanho de texto.

---

## Escolha da biblioteca pela stack

| Stack | Biblioteca principal | Alternativa | Quando usar a alternativa |
|---|---|---|---|
| Next.js / React | **Recharts** | Nivo, D3 | Recharts não tem o tipo necessário |
| Angular | **ECharts** (`ngx-echarts`) | Chart.js | ECharts não suporta o caso de uso |
| Universal / Backend | **Chart.js** | D3 | Precisa de baixo nível ou SVG puro |
| Geoespacial | **Leaflet + D3** | deck.gl | Volume massivo de pontos (> 100k) |
| Científico / Python | **Plotly** | Matplotlib | Relatório estático, não web |

**Nunca escolher biblioteca por familiaridade** — escolher pela adequação ao
propósito (ver protocolo de decisão abaixo).

---

## Protocolo de decisão — qual gráfico usar

```
1. O que o usuário quer comunicar?
   ├─ Comparação de categorias → Barra (horizontal se > 5 categorias)
   ├─ Evolução no tempo → Linha (área se acumulado)
   ├─ Proporção do todo → Barra empilhada (evitar pizza para > 3 fatias)
   ├─ Correlação entre variáveis → Dispersão (scatter)
   ├─ Distribuição de valores → Histograma ou boxplot
   ├─ Fluxo entre estados → Sankey
   ├─ Hierarquia de valores → Treemap
   ├─ Desempenho vs. meta → Bullet chart
   └─ Dado único com contexto → Sparkline + KPI card

2. Quantas séries de dados?
   ├─ 1-5 séries: cor por série, legenda direta no gráfico (não lateral)
   ├─ 6+ séries: reconsiderar o gráfico — provavelmente duas vizualizações
   └─ Nunca mais de 5 categorias em pizza/donut

3. O dado muda no tempo ou é estático?
   ├─ Estático: sem animação de entrada excessiva
   └─ Tempo real / atualização: considerar streaming + animação de transição
```

---

## Princípios inegociáveis (Tufte + NYT Graphics)

**Data-ink ratio — todo elemento precisa ganhar seu lugar:**
```
❌ Remover: grid lines pesadas, bordas de barras, legendas laterais quando
   os dados podem ter label direta, sombras decorativas, 3D, gradientes
✅ Manter: label direta no ponto/barra/linha, eixos mínimos, tick marks sutis
```

**Honestidade visual:**
```
❌ Barras com eixo Y que não começa em zero (distorce diferenças)
❌ Dois eixos Y com escalas diferentes no mesmo gráfico
❌ 3D — sempre distorce percepção de valores
❌ Pizza com fatias pequenas que somem visualmente
✅ Linha pode ter eixo Y que não começa em zero (variação relativa é válida)
✅ Anotar exceções diretamente no gráfico quando relevante
```

**Máximo 5 categorias de cor distintas:**
```
Paleta padrão sugerida (acessível, funciona em dark e light):
  Primary:   #3B82F6  (azul)
  Secondary: #10B981  (verde)
  Tertiary:  #F59E0B  (âmbar)
  Quaternary:#EF4444  (vermelho — reservar para alertas/negativos)
  Quinary:   #8B5CF6  (violeta)
  Neutral:   #6B7280  (cinza — para série de referência/meta)
```

---

## Implementação por biblioteca

### Recharts (Next.js / React)

```bash
npm install recharts
```

```tsx
// Barra horizontal — preferida quando labels são longas
import { BarChart, Bar, XAxis, YAxis, Tooltip,
         ResponsiveContainer, Cell, LabelList } from 'recharts'

const data = [
  { nome: 'Categoria A', valor: 420 },
  { nome: 'Categoria B', valor: 380 },
  { nome: 'Categoria C', valor: 290 },
]

const CORES = ['#3B82F6', '#10B981', '#F59E0B']

export function GraficoBarras() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical"
                margin={{ left: 120, right: 40, top: 8, bottom: 8 }}>
        <XAxis type="number" axisLine={false} tickLine={false}
               tick={{ fill: '#6B7280', fontSize: 12 }} />
        <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false}
               tick={{ fill: '#374151', fontSize: 13 }} width={110} />
        <Tooltip
          contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}
          formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Total']} />
        <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={28}>
          {data.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
          <LabelList dataKey="valor" position="right"
                     formatter={(v: number) => v.toLocaleString('pt-BR')}
                     style={{ fill: '#374151', fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Linha com área — evolução no tempo
import { AreaChart, Area, CartesianGrid } from 'recharts'

export function GraficoLinha({ dados }: { dados: { mes: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradiente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="mes" axisLine={false} tickLine={false}
               tick={{ fill: '#6B7280', fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false}
               tick={{ fill: '#6B7280', fontSize: 12 }}
               tickFormatter={(v) => v.toLocaleString('pt-BR')} />
        <Tooltip formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Valor']} />
        <Area type="monotone" dataKey="valor"
              stroke="#3B82F6" strokeWidth={2}
              fill="url(#gradiente)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// KPI Card com Sparkline
import { LineChart, Line } from 'recharts'

export function KPICard({ titulo, valor, variacao, historico }: KPIProps) {
  const positivo = variacao >= 0
  return (
    <div className="border rounded-xl p-4 space-y-2">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-semibold">{valor.toLocaleString('pt-BR')}</p>
        <span className={`text-sm font-medium ${positivo ? 'text-emerald-600' : 'text-red-500'}`}>
          {positivo ? '▲' : '▼'} {Math.abs(variacao)}%
        </span>
      </div>
      <LineChart width={120} height={36} data={historico}>
        <Line type="monotone" dataKey="v" stroke={positivo ? '#10B981' : '#EF4444'}
              strokeWidth={1.5} dot={false} />
      </LineChart>
    </div>
  )
}
```

---

### ECharts (Angular via ngx-echarts)

```bash
npm install echarts ngx-echarts
```

```typescript
// app.config.ts
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts'

export const appConfig = {
  providers: [
    provideEcharts()
  ]
}
```

```typescript
// dataviz.component.ts
import { Component } from '@angular/core'
import { NgxEchartsDirective } from 'ngx-echarts'
import type { EChartsOption } from 'echarts'

@Component({
  standalone: true,
  imports: [NgxEchartsDirective],
  template: `
    <div echarts [options]="opcoes" style="height: 300px"></div>
  `
})
export class GraficoBarrasComponent {
  opcoes: EChartsOption = {
    grid: { left: 120, right: 40, top: 8, bottom: 24, containLabel: false },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#F3F4F6' } },
    },
    yAxis: {
      type: 'category',
      data: ['Categoria A', 'Categoria B', 'Categoria C'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#374151', fontSize: 13 },
    },
    series: [{
      type: 'bar',
      data: [420, 380, 290],
      barWidth: 28,
      itemStyle: { borderRadius: [0, 4, 4, 0],
                   color: (p) => ['#3B82F6','#10B981','#F59E0B'][p.dataIndex] },
      label: { show: true, position: 'right', color: '#374151', fontSize: 12,
               formatter: (p) => Number(p.value).toLocaleString('pt-BR') },
    }],
    tooltip: { trigger: 'item' },
  }
}
```

---

## Dashboard — estrutura e boas práticas

```
┌─────────────────────────────────────────────────────┐
│  Filtros globais: período, unidade, status          │ ← sempre no topo
├───────────┬───────────┬───────────┬─────────────────┤
│ KPI Total │ KPI Delta │ KPI Meta  │  KPI Alerta     │ ← 3-4 KPI cards
├───────────┴───────────┴───────────┴─────────────────┤
│                                                      │
│  Gráfico principal — evolução temporal (2/3 largura) │ ← destaque
│                                                      │
├─────────────────────────────────────────────────────┤
│  Gráfico detalhe A        │  Gráfico detalhe B       │ ← 1/2 largura cada
└─────────────────────────────────────────────────────┘
```

**Regras de dashboard:**
- Máx 6-8 visualizações por tela — mais que isso é análise, não dashboard
- KPI cards sempre no topo — número grande, delta percentual, sparkline
- Gráfico principal ocupa mais espaço que os detalhes
- Filtros globais afetam todos os gráficos simultaneamente
- Loading skeleton de mesma forma que o gráfico real (não spinner)
- Responsivo: em mobile empilhar verticalmente, ocultar gráficos secundários

---

## Anti-padrões de dataviz (evitar sempre)

```
❌ Pizza com mais de 3-4 fatias — usar barra horizontal
❌ Gráficos 3D — sempre distorcem percepção
❌ Dois eixos Y no mesmo gráfico — confunde, usar dois gráficos
❌ Mais de 5 cores distintas na mesma visualização
❌ Animação de entrada longa (> 800ms) — distrai sem informar
❌ Gradiente decorativo nas barras — não adiciona informação
❌ Legenda lateral quando label direta é possível
❌ Eixo Y truncado em barras — distorce proporções
❌ Precisão falsa: 5 casas decimais em dado que tem 2 significativas
❌ Título que descreve o gráfico ("Barras de vendas") em vez de contar a história ("Vendas cresceram 40% em março")
```

---

## Acessibilidade em gráficos

```tsx
// Sempre incluir alternativa textual
<figure role="img" aria-label="Gráfico de barras: vendas por categoria em 2026">
  <ResponsiveContainer>...</ResponsiveContainer>
  <figcaption className="sr-only">
    Categoria A liderou com 420 unidades, seguida de B (380) e C (290).
  </figcaption>
</figure>

// Não depender só de cor para diferenciar séries
// Usar: cor + traço diferente (pontilhado, contínuo) + forma do marcador
```

---

## Checklist antes de entregar

- [ ] Tipo de gráfico adequado ao dado e à mensagem?
- [ ] Eixo Y parte de zero (se barra)?
- [ ] Máx 5 categorias de cor?
- [ ] Labels diretas no gráfico (sem legenda lateral quando possível)?
- [ ] Grid lines sutis ou removidas?
- [ ] Sem 3D, sombra decorativa ou gradiente desnecessário?
- [ ] Responsivo (`ResponsiveContainer` / `width: 100%`)?
- [ ] Loading skeleton enquanto dados carregam?
- [ ] `aria-label` na `<figure>`?
- [ ] Título conta a história, não descreve o gráfico?
