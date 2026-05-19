# 🌿 Refúgio da Serra - Full Stack Application

![Banner do Projeto](frontend/logo_site.png)

## Sobre o Projeto
O **Refúgio da Serra** é uma aplicação completa de turismo sustentável focada na região da Serra, Espírito Santo. O objetivo do projeto é conectar viajantes à natureza e cultura local, proporcionando uma experiência de reserva simplificada e um gerenciamento eficiente para o administrador.

**Contexto Educativo:** 🎓
Este projeto foi iniciado durante o meu **último ano do Ensino Médio** como um estudo autodidata de desenvolvimento web e evoluiu para uma aplicação Full Stack, onde pude aplicar conceitos de banco de dados, segurança de APIs e design de interface.

## Arquitetura do Sistema

O projeto está organizado em um monorepo para facilitar a manutenção e a visualização da integração entre as camadas:

### Frontend (Interface do Usuário)
Localizado em `/frontend`, foi desenvolvido para ser imersivo e responsivo.
- **Tecnologias:** HTML5, CSS3 e JavaScript (Vanilla).
- **Destaques:**
    - Filtros dinâmicos de pacotes.
    - Modo Noturno (Dark Mode).
    - Animações de scroll (Reveal effect).
    - Modal de reservas integrado à API.
    - Design focado em experiência do usuário (UX).

### Backend (Servidor e API)
Localizado em `/backend`, é o coração da aplicação, focado em performance e segurança.
- **Tecnologias:** Node.js, Express e PostgreSQL.
- **Segurança Implementada:**
    - **JWT (JSON Web Tokens):** Autenticação segura para o painel administrativo.
    - **Anti-Bot/IP Blacklist:** Sistema automático de detecção e bloqueio de IPs suspeitos.
    - **Rate Limiting:** Proteção contra ataques de força bruta no login.
    - **Helmet & CORS:** Proteção de headers e controle de origens permitidas.
- **Banco de Dados:** Persistência real de dados para Newsletter, Contatos e Reservas.

---

## Como Executar o Projeto

### 1. Backend
```bash
cd backend
npm install
# Crie um arquivo .env baseado no .env.example
npm start
```

### 2. Frontend
Basta abrir o arquivo `Refugio_da_Serra.html` no navegador ou hospedar via GitHub Pages.

---

## 🗺️ Roadmap & Evoluções
- [ ] **IA Integration:** Implementação de um chatbot inteligente para guiar os usuários.
- [ la IA no Admin:** Análise de sentimento automática para feedbacks de clientes.
- [ ] **Admin Dashboard:** Gráficos de crescimento de reservas e leads.

---
Desenvolvido por [Alejandro P. Silva](https://github.com/AlejandroPSilva) 🚀
# Refugio-da-Serra-FullStack
# Refugio-da-Serra-FullStack
