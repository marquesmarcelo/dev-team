---
name: kubernetes
description: Use ao gerar manifests Kubernetes, configuração ArgoCD e pipeline GitLab CI/CD para o projeto. Cobre estrutura Kustomize (base + overlays por ambiente), ApplicationSet do ArgoCD central multi-cluster, e .gitlab-ci.yml com modelo GitOps. Agnóstico de stack de aplicação.
---

# Kubernetes + ArgoCD + GitLab CI/CD

> Padrões universais do projeto estão em `CLAUDE.md`. Esta skill cobre
> apenas o que é específico da infraestrutura Kubernetes e do pipeline CI/CD.

## Modelo adotado: GitOps com ArgoCD central

```
GitLab CI (pipeline)
  ├── lint → test → sonarqube → build → push imagem → Harbor
  └── atualiza tag da imagem no repo Git (commit automático)
              ↓
ArgoCD central (detecta mudança no Git)
  ├── App dev     → sincroniza no cluster dev
  ├── App staging → sincroniza no cluster staging
  └── App prod    → sincroniza no cluster prod (manual)
```

**Importante:** o pipeline CI/CD **nunca** roda `kubectl apply` diretamente.
Ele só atualiza a tag da imagem no arquivo `deploy/k8s/overlays/<env>/image.yaml`
via commit — o ArgoCD detecta a mudança e aplica no cluster correspondente.
Isso resolve o problema de rede: o runner não precisa alcançar o cluster,
o ArgoCD (dentro do cluster) é que puxa do Git.

---

## Variáveis de ambiente obrigatórias

Configurar no GitLab: **Settings → CI/CD → Variables**.

```bash
# Registry Harbor
REGISTRY_URL         = registry.empresa.com       # URL do servidor Harbor
REGISTRY_USER        = ci-bot                     # usuário de serviço
REGISTRY_TOKEN       = <token>                    # token de acesso (masked)

# ArgoCD central
ARGOCD_SERVER        = argocd.empresa.com         # URL do ArgoCD central
ARGOCD_TOKEN         = <token>                    # token de serviço do ArgoCD (masked)

# Ambientes (já têm default — sobrescrever se necessário)
ENV_DEV              = dev                        # nome do ambiente dev
ENV_STAGING          = staging                    # nome do ambiente staging
ENV_PROD             = prod                       # nome do ambiente produção
```

Adicionar ao `.env.example` do projeto (sem valores reais):
```
REGISTRY_URL=
REGISTRY_USER=
REGISTRY_TOKEN=
ARGOCD_SERVER=
ARGOCD_TOKEN=
ENV_DEV=dev
ENV_STAGING=staging
ENV_PROD=prod
```

---

## Estrutura de pastas gerada

```
deploy/
├── k8s/
│   ├── base/                     ← manifests genéricos, sem valores de ambiente
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   ├── configmap.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── dev/
│       │   ├── kustomization.yaml  ← herda base, aplica patches dev
│       │   ├── image.yaml          ← tag da imagem (atualizada pelo CI)
│       │   └── patches/
│       │       └── resources.yaml  ← recursos menores para dev
│       ├── staging/
│       │   ├── kustomization.yaml
│       │   ├── image.yaml
│       │   └── patches/
│       └── prod/
│           ├── kustomization.yaml
│           ├── image.yaml
│           └── patches/
│               └── replicas.yaml   ← mais réplicas em produção
├── argocd/
│   └── applicationset.yaml         ← ApplicationSet multi-ambiente no ArgoCD central
└── .gitlab-ci.yml                  ← na raiz do projeto
```

---

## base/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: backend:latest    # tag substituída pelo Kustomize overlay
          ports:
            - containerPort: 3001
          envFrom:
            - secretRef:
                name: app-secrets
            - configMapRef:
                name: app-config
          livenessProbe:
            httpGet:
              path: /healthz       # Go/Python/PHP — ajustar por stack
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
```

> Probes: ajustar o path conforme a stack (Java usa `/actuator/health/liveness`
> e `/actuator/health/readiness`). Ver `CLAUDE.md` seção "Observabilidade".

---

## base/ingress.yaml (NGINX — parametrizado para Traefik no futuro)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend
  annotations:
    kubernetes.io/ingress.class: "nginx"   # trocar para "traefik" quando migrar
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
    - host: PLACEHOLDER_HOST               # substituído pelo overlay
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 3001
```

---

## overlays/dev/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: ${ENV_DEV}-${PROJECT_NAME}    # ex: dev-meu-sistema

resources:
  - ../../base

namePrefix: dev-

images:
  - name: backend
    newName: ${REGISTRY_URL}/${PROJECT_NAME}/backend
    newTag: latest    # sobrescrito pelo CI em cada deploy

patches:
  - path: patches/resources.yaml

configMapGenerator:
  - name: app-config
    literals:
      - ENV=development
      - LOG_LEVEL=debug

storageClassName: ${STORAGE_CLASS_NAME:-default}   # parametrizável, default "default"
```

---

## overlays/dev/patches/resources.yaml (recursos menores em dev)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: backend
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "200m"
              memory: "256Mi"
```

---

## deploy/argocd/applicationset.yaml

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: ${PROJECT_NAME}
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            cluster: https://rancher-dev.empresa.com/k8s/clusters/c-xxxxx
            namespace: dev-${PROJECT_NAME}
            syncPolicy: automated    # dev sincroniza automaticamente
          - env: staging
            cluster: https://rancher-staging.empresa.com/k8s/clusters/c-yyyyy
            namespace: staging-${PROJECT_NAME}
            syncPolicy: automated
          - env: prod
            cluster: https://rancher-prod.empresa.com/k8s/clusters/c-zzzzz
            namespace: prod-${PROJECT_NAME}
            syncPolicy: none         # prod sincroniza manualmente (botão no ArgoCD)

  template:
    metadata:
      name: "{{env}}-${PROJECT_NAME}"
    spec:
      project: default
      source:
        repoURL: ${GITLAB_REPO_URL}
        targetRevision: main
        path: "deploy/k8s/overlays/{{env}}"
      destination:
        server: "{{cluster}}"
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

> Substituir as URLs dos clusters com os valores reais do Rancher.
> Ver URL do kubeconfig em: Rancher → Cluster → Kubeconfig → `server:`.

---

## .gitlab-ci.yml

```yaml
# Variáveis com defaults — sobrescrever no GitLab CI/CD Settings se necessário
variables:
  ENV_DEV:      "dev"
  ENV_STAGING:  "staging"
  ENV_PROD:     "prod"
  STORAGE_CLASS_NAME: "default"
  PROJECT_NAME: "${CI_PROJECT_NAME}"
  IMAGE_BACKEND: "${REGISTRY_URL}/${CI_PROJECT_NAME}/backend"
  IMAGE_FRONTEND: "${REGISTRY_URL}/${CI_PROJECT_NAME}/frontend"

stages:
  - lint
  - test
  - sonarqube
  - build
  - security
  - push
  - deploy-dev
  - deploy-staging
  - deploy-prod

# ─── Lint ───────────────────────────────────────────────────────────────────
lint:
  stage: lint
  script:
    - docker compose -f docker-compose.yaml run --rm backend <comando-lint>
    - docker compose -f docker-compose.yaml run --rm frontend npm run lint
  only: [merge_requests, main, staging]

# ─── Testes ─────────────────────────────────────────────────────────────────
test:
  stage: test
  script:
    - docker compose -f docker-compose.yaml run --rm backend <comando-teste>
  coverage: '/coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  only: [merge_requests, main, staging]

# ─── SonarQube ──────────────────────────────────────────────────────────────
sonarqube:
  stage: sonarqube
  image: sonarsource/sonar-scanner-cli
  variables:
    SONAR_HOST_URL: "${SONAR_HOST_URL}"
    SONAR_TOKEN: "${SONAR_TOKEN}"
  script:
    - sonar-scanner
  allow_failure: false   # Quality Gate bloqueia o pipeline se falhar
  only: [main, staging]

# ─── Build ──────────────────────────────────────────────────────────────────
build:
  stage: build
  script:
    - docker build -t ${IMAGE_BACKEND}:${CI_COMMIT_SHA} ./backend
    - docker build -t ${IMAGE_FRONTEND}:${CI_COMMIT_SHA} ./frontend
  only: [main, staging]

# ─── Segurança de dependências ───────────────────────────────────────────────
security-scan:
  stage: security
  script:
    - docker compose run --rm backend <govulncheck ou npm audit>
  allow_failure: false
  only: [main, staging]

# ─── Push para Harbor ────────────────────────────────────────────────────────
push:
  stage: push
  script:
    - echo "${REGISTRY_TOKEN}" | docker login ${REGISTRY_URL} -u ${REGISTRY_USER} --password-stdin
    - docker push ${IMAGE_BACKEND}:${CI_COMMIT_SHA}
    - docker push ${IMAGE_FRONTEND}:${CI_COMMIT_SHA}
    - docker tag ${IMAGE_BACKEND}:${CI_COMMIT_SHA} ${IMAGE_BACKEND}:latest
    - docker push ${IMAGE_BACKEND}:latest
  only: [main, staging]

# ─── Deploy dev (GitOps: atualiza tag no Git → ArgoCD sincroniza) ────────────
deploy-dev:
  stage: deploy-dev
  script:
    - |
      # Atualizar tag da imagem no overlay dev
      sed -i "s/newTag:.*/newTag: ${CI_COMMIT_SHA}/" \
        deploy/k8s/overlays/${ENV_DEV}/image.yaml
      git config user.email "ci@empresa.com"
      git config user.name "GitLab CI"
      git add deploy/k8s/overlays/${ENV_DEV}/image.yaml
      git commit -m "ci(${ENV_DEV}): deploy ${CI_COMMIT_SHA:0:8}"
      git push https://ci-token:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git HEAD:main
    # ArgoCD (modo automated) detecta o commit e sincroniza automaticamente
    # Para verificar o status:
    - argocd app wait ${ENV_DEV}-${PROJECT_NAME} --timeout 120
  environment:
    name: development
    url: https://${ENV_DEV}.${PROJECT_NAME}.empresa.com
  only: [main]

# ─── Deploy staging ──────────────────────────────────────────────────────────
deploy-staging:
  stage: deploy-staging
  script:
    - |
      sed -i "s/newTag:.*/newTag: ${CI_COMMIT_SHA}/" \
        deploy/k8s/overlays/${ENV_STAGING}/image.yaml
      git add deploy/k8s/overlays/${ENV_STAGING}/image.yaml
      git commit -m "ci(${ENV_STAGING}): deploy ${CI_COMMIT_SHA:0:8}"
      git push https://ci-token:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git HEAD:main
    - argocd app wait ${ENV_STAGING}-${PROJECT_NAME} --timeout 180
  environment:
    name: staging
    url: https://${ENV_STAGING}.${PROJECT_NAME}.empresa.com
  only: [main]

# ─── Deploy prod (manual — botão no GitLab ou sync no ArgoCD) ────────────────
deploy-prod:
  stage: deploy-prod
  when: manual                 # nunca automático em produção
  script:
    - |
      sed -i "s/newTag:.*/newTag: ${CI_COMMIT_SHA}/" \
        deploy/k8s/overlays/${ENV_PROD}/image.yaml
      git add deploy/k8s/overlays/${ENV_PROD}/image.yaml
      git commit -m "ci(${ENV_PROD}): deploy ${CI_COMMIT_SHA:0:8}"
      git push https://ci-token:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git HEAD:main
    # ArgoCD prod está em syncPolicy: none → requer sync manual no ArgoCD UI
    # OU usar argocd CLI para sincronizar:
    # - argocd app sync ${ENV_PROD}-${PROJECT_NAME} --timeout 300
  environment:
    name: production
    url: https://${PROJECT_NAME}.empresa.com
  only: [main]
```

---

## Secrets do Kubernetes

Criar os secrets antes do primeiro deploy (uma vez por cluster):

```bash
# Secret para credenciais da aplicação (banco, Redis, etc.)
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL="postgres://..." \
  --from-literal=REDIS_URL="redis://..." \
  --namespace=dev-${PROJECT_NAME}

# Harbor pull secret (se o cluster não tiver configurado globalmente)
kubectl create secret docker-registry harbor-pull-secret \
  --docker-server=${REGISTRY_URL} \
  --docker-username=${REGISTRY_USER} \
  --docker-password=${REGISTRY_TOKEN} \
  --namespace=dev-${PROJECT_NAME}
```

> Se o Kubernetes já tem credencial global para o Harbor (como você confirmou),
> o `imagePullSecret` no Deployment não é necessário.

---

## Migração NGINX → Traefik

Quando migrar o Ingress controller, apenas altere a anotação em `base/ingress.yaml`:
```yaml
# De:
kubernetes.io/ingress.class: "nginx"
# Para:
kubernetes.io/ingress.class: "traefik"
```
E remova as anotações específicas do NGINX. O Kustomize propaga para todos os overlays automaticamente.

---

## Checklist de entrega

- [ ] `deploy/k8s/base/` com Deployment, Service, Ingress, ConfigMap
- [ ] `deploy/k8s/overlays/dev/`, `staging/`, `prod/` com Kustomize
- [ ] Probes ajustadas para a stack (`/healthz` vs `/actuator/health/liveness`)
- [ ] `deploy/argocd/applicationset.yaml` com URLs dos clusters Rancher
- [ ] `.gitlab-ci.yml` na raiz com as 9 fases
- [ ] `.env.example` atualizado com `REGISTRY_URL`, `REGISTRY_USER`, `REGISTRY_TOKEN`, `ARGOCD_SERVER`, `ARGOCD_TOKEN`
- [ ] `storageClassName` parametrizado (default: "default")
- [ ] Secrets de aplicação documentados (nunca no repositório)
- [ ] Deploy prod: `when: manual` no GitLab + `syncPolicy: none` no ArgoCD
