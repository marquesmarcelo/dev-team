# Guia de Configuração do Ambiente de Desenvolvimento

Guia passo a passo para montar o ambiente de desenvolvimento em
**Windows Server** com WSL2 + Ubuntu + Docker + VS Code + Claude Code.

Ao final deste guia você terá um ambiente completo para criar e executar
projetos gerados pelos agentes deste template.

---

## Pré-requisitos

- Windows Server 2019 ou 2022 (ou Windows 10/11 Pro/Enterprise 64-bit)
- Mínimo 8 GB de RAM (recomendado: 16 GB)
- 40 GB de espaço em disco disponível
- Acesso de administrador na máquina
- Conexão com a internet

---

## Passo 1 — Habilitar WSL e Hyper-V

Abra o **PowerShell como Administrador** e execute:

```powershell
# Habilitar WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Habilitar Plataforma de Máquina Virtual (necessário para WSL2)
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Habilitar Hyper-V (Windows Server)
Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart
```

> **Windows Server:** o comando `Install-WindowsFeature` reinicia a máquina
> automaticamente. Aguarde a reinicialização antes de continuar.

Após reiniciar, defina o WSL2 como versão padrão:

```powershell
wsl --set-default-version 2
```

---

## Passo 2 — Instalar o Windows Terminal (recomendado)

O Windows Terminal oferece abas, divisão de painéis e melhor suporte a
cores e fontes — muito melhor que o PowerShell padrão.

1. Baixe em: https://aka.ms/terminal
2. Ou via PowerShell:
```powershell
winget install Microsoft.WindowsTerminal
```

---

## Passo 3 — Instalar Ubuntu no WSL2

```powershell
# Listar distribuições disponíveis
wsl --list --online

# Instalar Ubuntu 24.04 LTS (recomendado)
wsl --install -d Ubuntu-24.04
```

Após a instalação, o Ubuntu abre automaticamente pedindo:
- **Username:** escolha um nome de usuário (ex: `dev`) — não use espaços
- **Password:** defina uma senha — ela será pedida para comandos `sudo`

Verifique que está no WSL2:
```powershell
wsl --list --verbose
# Deve mostrar: Ubuntu-24.04   Running   2
```

### Configuração inicial do Ubuntu

Dentro do terminal Ubuntu:

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar ferramentas essenciais
sudo apt install -y \
  curl wget git unzip zip \
  build-essential ca-certificates \
  gnupg lsb-release software-properties-common \
  jq tree htop

# Configurar Git
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
git config --global init.defaultBranch main
git config --global core.autocrlf input   # importante no WSL
```

---

## Passo 4 — Configurar memória e CPU do WSL2

Crie o arquivo `%USERPROFILE%\.wslconfig` no Windows para controlar
os recursos alocados ao WSL2:

```powershell
# Abrir o arquivo no bloco de notas (cria se não existir)
notepad $env:USERPROFILE\.wslconfig
```

Cole o conteúdo abaixo e ajuste conforme sua máquina:

```ini
[wsl2]
memory=8GB          # ajustar conforme RAM disponível (metade do total é um bom ponto de partida)
processors=4        # ajustar conforme CPUs disponíveis
swap=2GB
localhostForwarding=true
```

Após salvar, reinicie o WSL:
```powershell
wsl --shutdown
wsl
```

---

## Passo 5 — Instalar Docker no WSL2

> **Opção A (recomendada): Docker Engine diretamente no WSL2**
> Mais estável em Windows Server, sem necessidade de licença Docker Desktop.

Dentro do terminal Ubuntu:

```bash
# Adicionar repositório oficial do Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine + Compose
sudo apt update
sudo apt install -y \
  docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Adicionar seu usuário ao grupo docker (sem precisar de sudo)
sudo usermod -aG docker $USER
newgrp docker

# Iniciar o serviço Docker
sudo service docker start

# Verificar instalação
docker --version
docker compose version
```

**Iniciar Docker automaticamente com o WSL** (opcional mas recomendado):

```bash
# Adicionar ao final do ~/.bashrc ou ~/.profile
echo 'if [ "$(ps aux | grep dockerd | grep -v grep)" = "" ]; then
  sudo service docker start > /dev/null 2>&1
fi' >> ~/.bashrc
```

Para o comando `sudo service docker start` funcionar sem senha, adicione
uma regra no sudoers:

```bash
sudo visudo
# Adicionar a linha abaixo no final do arquivo:
# seu_usuario ALL=(ALL) NOPASSWD: /usr/sbin/service docker *
```

> **Opção B: Docker Desktop para Windows**
> Mais simples de instalar, mas requer licença para uso comercial em
> organizações com mais de 250 funcionários ou faturamento acima de
> US$ 10 milhões. Baixe em: https://www.docker.com/products/docker-desktop

---

## Passo 6 — Instalar Node.js via NVM

O Claude Code requer Node.js 18+. Instalar via NVM (Node Version Manager)
é a forma mais flexível — permite trocar de versão sem afetar o sistema.

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Recarregar o shell
source ~/.bashrc

# Instalar Node.js LTS mais recente
nvm install --lts
nvm use --lts
nvm alias default node

# Verificar
node --version    # deve ser 20.x ou superior
npm --version
```

---

## Passo 7 — Instalar Claude Code

```bash
# Instalar globalmente via npm
npm install -g @anthropic-ai/claude-code

# Verificar
claude --version
```

### Configurar a API Key da Anthropic

```bash
# Definir a variável de ambiente (adicionar ao ~/.bashrc para persistir)
echo 'export ANTHROPIC_API_KEY="sua-chave-aqui"' >> ~/.bashrc
source ~/.bashrc
```

Obter a API Key em: https://console.anthropic.com

### Primeiro uso

```bash
# Criar um diretório de projeto e iniciar o Claude Code
mkdir ~/projetos/meu-projeto
cd ~/projetos/meu-projeto
claude
```

---

## Passo 8 — Instalar Visual Studio Code

1. Baixe o VS Code para Windows em: https://code.visualstudio.com
2. Instale normalmente no Windows (não no WSL)
3. Durante a instalação, marque:
   - ✅ Adicionar ao PATH
   - ✅ Registrar como editor para arquivos suportados

### Extensão WSL (obrigatória)

No VS Code, instale a extensão **Remote - WSL** (ou o pacote **Remote Development**):

1. Abra o VS Code
2. `Ctrl+Shift+X` → buscar "Remote - WSL"
3. Instalar a extensão da Microsoft

### Abrir projeto do WSL no VS Code

```bash
# Dentro do terminal Ubuntu, no diretório do projeto:
code .
```

O VS Code abre conectado ao WSL — todos os terminais internos são Ubuntu,
o IntelliSense usa as versões Linux das ferramentas.

### Extensões recomendadas para este template

Instale no contexto WSL (`Ctrl+Shift+X` com o VS Code conectado ao WSL):

```
# Essenciais
ms-vscode-remote.remote-wsl
ms-azuretools.vscode-docker
eamodio.gitlens

# Frontend
bradlc.vscode-tailwindcss
esbenp.prettier-vscode
dbaeumer.vscode-eslint
christian-kohler.path-intellisense

# Backend Go
golang.go

# Backend Python
ms-python.python
ms-python.vscode-pylance

# Backend Java
vscjava.vscode-java-pack

# Backend PHP
bmewburn.vscode-intelephense-client
neilbrayfield.php-snippets

# Backend Node.js / NestJS
ms-vscode.vscode-node-pack

# Banco de dados
cweijan.vscode-postgresql-client2

# Utilitários
yzhang.markdown-all-in-one
mechatroner.rainbow-csv
humao.rest-client
redhat.vscode-yaml
```

Instalar todas de uma vez via terminal:

```bash
code --install-extension ms-vscode-remote.remote-wsl
code --install-extension ms-azuretools.vscode-docker
code --install-extension eamodio.gitlens
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension golang.go
code --install-extension ms-python.python
code --install-extension vscjava.vscode-java-pack
code --install-extension cweijan.vscode-postgresql-client2
code --install-extension yzhang.markdown-all-in-one
code --install-extension humao.rest-client
```

---

## Por que não instalar Go, Python, Java, PHP ou Node localmente?

Todo o código da aplicação roda **dentro de containers Docker** — backend,
frontend, banco de dados, testes. Você não precisa das linguagens instaladas
na máquina host.

```
Desenvolvedor (WSL2 + VS Code)
        ↓  docker compose up
Container backend (Go / Python / Java / PHP / Node)
Container postgres
Container frontend (Next.js / Angular)
```

O `docker compose -f docker-compose.dev.yml up` já cuida de tudo:
compilação, hot-reload, migrations e seed. Qualquer comando de teste
ou migração é executado dentro do container via `docker compose run`.

A única exceção é o **Node.js**, instalado no Passo 6 — necessário para
rodar o Claude Code na máquina host, não para desenvolver a aplicação.

---

## Passo 9 — Verificação final

Execute o checklist abaixo para confirmar que tudo está funcionando:

```bash
# WSL2 e Ubuntu
lsb_release -a                    # deve mostrar Ubuntu 24.04

# Docker
docker run hello-world            # deve baixar e executar o container de teste
docker compose version            # deve mostrar Docker Compose v2.x

# Node.js e Claude Code
node --version                    # v20.x ou superior
claude --version                  # Claude Code instalado

# Git
git --version
git config --global user.name     # seu nome configurado

# VS Code conectado ao WSL
code --version                    # VS Code acessível do terminal WSL
```

---

## Estrutura de diretórios recomendada

```
~/projetos/
├── template-sdd/        ← este template (clonar do GitHub)
├── projeto-alpha/       ← projeto criado a partir do template
├── projeto-beta/
└── ...
```

```bash
# Clonar o template
cd ~/projetos
git clone https://github.com/<usuario>/template-sdd.git

# Criar novo projeto a partir do template
cp -r template-sdd/ meu-novo-projeto/
cd meu-novo-projeto/
git init
claude   # iniciar os agentes
```

---

## Solução de problemas comuns

### Docker não inicia

```bash
# Verificar status
sudo service docker status

# Ver logs de erro
sudo journalctl -u docker --no-pager | tail -20

# Reiniciar
sudo service docker restart
```

### WSL sem acesso à internet

```powershell
# No PowerShell Windows (administrador)
wsl --shutdown
netsh winsock reset
netsh int ip reset all
ipconfig /flushdns
# Reiniciar o Windows
```

### VS Code não conecta ao WSL

```bash
# No terminal Ubuntu, reinstalar o servidor WSL do VS Code
rm -rf ~/.vscode-server
code .   # reconecta e reinstala automaticamente
```

### Permissão negada no Docker

```bash
# Verificar se o usuário está no grupo docker
groups $USER   # deve listar 'docker'

# Se não estiver, adicionar e reiniciar a sessão WSL
sudo usermod -aG docker $USER
# Fechar e reabrir o terminal WSL
```

### Claude Code sem resposta / erro de API

```bash
# Verificar se a API key está configurada
echo $ANTHROPIC_API_KEY   # deve mostrar a chave

# Se vazio, configurar novamente
export ANTHROPIC_API_KEY="sua-chave"
echo 'export ANTHROPIC_API_KEY="sua-chave"' >> ~/.bashrc
```

---

## Próximos passos

Com o ambiente configurado, siga o `GUIA_DE_USO_AGENTS.md` para
criar seu primeiro projeto com os agentes:

1. Entre no diretório do projeto: `cd ~/projetos/meu-projeto`
2. Inicie o Claude Code: `claude`
3. Diga: `"Use o analista-requisitos"`
