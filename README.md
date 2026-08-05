# Gestão HidroEscola
 
![Versão](https://img.shields.io/badge/versão-1.7.1-blue)
![Licença](https://img.shields.io/badge/licença-MIT-green)
![Plataforma](https://img.shields.io/badge/plataforma-Windows-0078D6?logo=windows&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-000000?logo=rust&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
 
Sistema desktop para gestão de escolas de hidroginástica — alunos, turmas, presença, mensalidades e relatórios. 100% offline.
 
## Stack
 
- Tauri 2.0 + Rust
- React 19 + TypeScript
- SQLite
## Instalação
 
```bash
git clone https://github.com/Gustavosoliv16/GestaoHidro.git
cd GestaoHidro
npm install
```
 
Pré-requisitos: [Node.js](https://nodejs.org/) 18+, [Rust](https://www.rust-lang.org/tools/install), [MSVC Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
 
## Uso
 
```bash
npm run tauri dev     # ambiente de desenvolvimento
npm run tauri build   # gerar instalador (MSI/NSIS)
```
 
Instaladores em `src-tauri/target/release/bundle/`.
 
## Dados
 
- Banco: `%APPDATA%\com.hidroescola.gestao\gestao_hidro.db`
- Backups: `Documentos\GestaoHidro_Backups\`
## Contribuição
 
Fork → branch → commit → PR.
 
## Licença
 
MIT
 
---
 
**Gustavo Oliveira** — [@Gustavosoliv16](https://github.com/Gustavosoliv16)