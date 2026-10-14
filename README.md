# ⚡ Radar de Ofertas - Monitor Diário de E-commerce Brasil

Aplicação completa, modular e autônoma de monitoramento e agregação de ofertas diárias dos maiores e-commerces brasileiros (**Mercado Livre**, **Magazine Luiza**, **Americanas** e **Kabum**).

O sistema extrai dados promocionais sem APIs de terceiros e publica os resultados em um painel web estático hospedado no **GitHub Pages**, com automação diária via **GitHub Actions**.

---

## 🏛️ Arquitetura da Solução

```text
PROJETO NOTBOOK/
├── .github/
│   └── workflows/
│       └── scraper.yml         # Automação diária (Cron job + auto commit)
├── src/
│   ├── scrapers/
│   │   ├── mercadolivre.js     # Scraper Mercado Livre
│   │   ├── magalu.js           # Scraper Magazine Luiza
│   │   ├── americanas.js       # Scraper Americanas
│   │   └── kabum.js            # Scraper Kabum
│   ├── utils/
│   │   ├── browser.js          # Puppeteer Stealth + Anti-bot bypass
│   │   └── formatters.js       # Higienização e padronização monetária (BRL)
│   └── index.js                # Orquestrador com isolamento try/catch
├── index.html                  # Dashboard web moderno e acessível
├── styles.css                  # CSS Grid Mobile-First, tokens e shimmer
├── app.js                      # Lógica do frontend (4 estados visuais e filtros)
├── ofertas.json                # Base consolidada de dados com timestamp
├── package.json                # Dependências do projeto
├── PROJECT_STATE.md            # Registro contínuo de estado do projeto
└── README.md                   # Documentação completa
```

---

## 🚀 Funcionalidades

### 1. Backend Web Scraper (Node.js + Puppeteer Stealth)
- **Bypass Anti-Bot**: Utiliza `puppeteer-extra-plugin-stealth`, User-Agents aleatórios e headers realistas em português brasileiro.
- **Tolerância a Falhas**: Cada loja roda em bloco isolado (`try/catch`). Se o layout de uma loja mudar, as demais continuam sendo extraídas normalmente.
- **Top 10 Produtos por Loja**: Extrai nome, preço atual, preço original, percentual de desconto, foto e link direto.
- **Consolidação em JSON**: Gera o arquivo `ofertas.json` com estatísticas e timestamp formatado.

### 2. Frontend Resiliente (HTML5, CSS3 & JavaScript Vanilla)
- **Mobile-First Estrito**: Ergonomia de toque de no mínimo 48x48px em botões e controles.
- **4 Estados Visuais Tratados**:
  1. *Carregamento*: Skeletons com efeito *shimmer* animado.
  2. *Sucesso*: Cards em CSS Grid responsivo com badges coloridas por loja e botão "Ver na Loja".
  3. *Erro Amigável*: Mensagem explicativa com botão "Tentar Novamente".
  4. *Estado Vazio*: Exibido quando a busca ou filtros não encontram produtos, com botão para limpar filtros.
- **Interatividade**: Busca em tempo real, filtros rápidos por loja e ordenação por menor/maior preço ou nome.

### 3. Automação (GitHub Actions)
- **Cron Job**: Executa automaticamente todos os dias à meia-noite (03:00 UTC / 00:00 BRT).
- **Disparo Manual**: Suporte a `workflow_dispatch` para rodar sob demanda pelo painel do GitHub.
- **Git Commit Automático**: Faz commit direto de `ofertas.json` na branch principal sem loop de CI (`[skip ci]`).

---

## 🛠️ Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior instalada.

### Passo 1: Instalar dependências
```bash
npm install
```

### Passo 2: Executar o Scraper
```bash
npm run scrape
```
O script acessará as 4 lojas em modo headless e atualizará o arquivo `ofertas.json`.

### Passo 3: Visualizar o Dashboard
Abra o arquivo `index.html` em seu navegador ou inicie um servidor HTTP local:
```bash
npx serve .
```
Acesse `http://localhost:3000`.

---

## 🌐 Configuração do GitHub Pages & Actions

1. Crie um repositório no GitHub e faça o push de todos os arquivos:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit do radar de ofertas"
   git branch -M main
   git remote add origin https://github.com/suporte-dash/Filtro_ofertas.git
   git push -u origin main
   ```

2. **Permissão de Escrita no GitHub Actions**:
   - No GitHub, acesse: **Settings** > **Actions** > **General**.
   - Na seção **Workflow permissions**, selecione: **Read and write permissions**.
   - Clique em **Save**.

3. **Ativar o GitHub Pages**:
   - Acesse: **Settings** > **Pages**.
   - Em **Build and deployment > Source**, selecione **Deploy from a branch**.
   - Em **Branch**, selecione `main` e pasta `/ (root)`.
   - Clique em **Save**.

Pronto! Seu monitor de ofertas estará no ar e se atualizará diariamente de forma 100% autônoma.
