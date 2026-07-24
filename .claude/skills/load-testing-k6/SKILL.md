---
name: load-testing-k6
description: Use ao construir ou rodar testes de carga com k6. Cobre estrutura de script, thresholds objetivos, execução via Docker, e integração com a observabilidade Prometheus já existente no projeto.
---

# Teste de carga: k6

## Por que k6
Script de teste em JavaScript (sem precisar aprender ferramenta nova de
UI), execução leve (escrito em Go por baixo), thresholds que falham o
processo automaticamente quando o limite não é atingido (essencial para
rodar em pipeline de CI, não só manualmente), e suporta exportar métricas
direto para Prometheus — o que já é a stack de observabilidade deste
projeto.

## Estrutura de script
```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    carga_normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },  // sobe até 50 usuários simultâneos
        { duration: '1m', target: 50 },   // mantém
        { duration: '30s', target: 0 },   // desce
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],   // p95 abaixo de 300ms — FALHA o processo se não atingir
    http_req_failed: ['rate<0.01'],     // taxa de erro abaixo de 1%
  },
};

export default function () {
  const res = http.get('http://backend:8080/api/v1/processos');
  check(res, { 'status é 200': (r) => r.status === 200 });
  sleep(1);
}
```

## Execução via Docker (sem instalar nada na máquina)
```bash
docker run --rm -i --network=host grafana/k6 run - < load-tests/processos/listagem.js
```
Em `docker-compose.yml`, adicionar como serviço sob demanda (perfil
separado, não sobe com `docker compose up -d` normal):
```yaml
services:
  k6:
    image: grafana/k6
    profiles: ["load-test"]
    networks:
      - default
    volumes:
      - ./load-tests:/scripts
```
Executa com: `docker compose --profile load-test run k6 run /scripts/processos/listagem.js`

## Saída e thresholds
- `thresholds` no script já fazem o processo retornar código de saída
  diferente de zero se o limite não for atingido — isso é o que torna o
  teste de carga "passa/falha" objetivo, não leitura manual de número.
- Para enviar resultado direto ao Prometheus já existente no projeto:
  `k6 run --out experimental-prometheus-rw script.js` (requer endpoint
  remote-write do Prometheus configurado).

## Cenários comuns
- **Carga normal (smoke/load):** simula tráfego esperado do dia a dia —
  use para validar que o sistema aguenta o uso normal.
- **Carga de pico (stress):** sobe além do esperado para encontrar o
  ponto de quebra — use só quando o dono do produto quiser saber o limite
  real, não como padrão de toda feature.
- **Carga sustentada (soak):** mantém carga moderada por tempo longo (ex:
  30 min+) para detectar vazamento de memória/degradação — usar com
  moderação, é mais caro de rodar.

## Interpretação de resultado
- `p(95)` e `p(99)` importam mais que a média — a média esconde os piores
  casos que afetam usuários reais.
- Taxa de erro (`http_req_failed`) acima do limite é mais grave que
  latência alta — geralmente indica saturação real, não só lentidão.
