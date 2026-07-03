// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_backup_folder() -> Result<String, String> {
    // Obtém o diretório de documentos do usuário
    let documents_dir = dirs::document_dir()
        .ok_or_else(|| "Não foi possível encontrar o diretório de documentos".to_string())?;

    // Cria o caminho para a pasta de backups
    let backup_dir = documents_dir.join("GestaoHidro_Backups");

    // Cria a pasta se não existir
    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("Erro ao criar pasta de backups: {}", e))?;
    }

    // Retorna o caminho como string
    backup_dir
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Caminho inválido".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, get_backup_folder, listar_backups, restaurar_backup])
        .setup(|_app| {
            // Cria a pasta de backups ao iniciar o app
            if let Ok(backup_dir) = get_backup_folder() {
                println!("Pasta de backups: {}", backup_dir);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use serde::Serialize;

#[derive(Serialize)]
struct BackupInfo {
    nome: String,
    caminho: String,
    tamanho_kb: u64,
    data_modificacao: String,
}

#[tauri::command]
fn listar_backups() -> Result<Vec<BackupInfo>, String> {
    let documents_dir = dirs::document_dir()
        .ok_or_else(|| "Não foi possível encontrar o diretório de documentos".to_string())?;

    let backup_dir = documents_dir.join("GestaoHidro_Backups");

    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups: Vec<BackupInfo> = Vec::new();

    let entries = fs::read_dir(&backup_dir)
        .map_err(|e| format!("Erro ao ler pasta de backups: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("db") {
                if let Ok(metadata) = entry.metadata() {
                    let nome = path.file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_string();

                    let tamanho_kb = metadata.len() / 1024;

                    let data_modificacao = metadata.modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);

                    let data_str = format!("{}", data_modificacao);

                    backups.push(BackupInfo {
                        nome,
                        caminho: path.to_str().unwrap_or("").to_string(),
                        tamanho_kb,
                        data_modificacao: data_str,
                    });
                }
            }
        }
    }

    // Ordenar por data de modificacao (mais recente primeiro)
    backups.sort_by(|a, b| b.data_modificacao.cmp(&a.data_modificacao));

    Ok(backups)
}

#[tauri::command]
fn restaurar_backup(caminhoBackup: String, app: tauri::AppHandle) -> Result<String, String> {
    if !std::path::Path::new(&caminhoBackup).exists() {
         return Err("Arquivo de backup não encontrado".to_string());
     }
    
    // Obter o diretorio de dados do app (onde o banco esta)
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Erro ao obter diretorio de dados: {}", e))?;

    let db_path = app_data_dir.join("gestao_hidro.db");

    // Criar backup de seguranca do banco atual antes de restaurar
    if db_path.exists() {
        let backup_seguranca = app_data_dir.join("gestao_hidro_backup_antes_restauracao.db");
        fs::copy(&db_path, &backup_seguranca)
            .map_err(|e| format!("Erro ao criar backup de seguranca: {}", e))?;
    }

    // Copiar o arquivo de backup sobre o banco
    fs::copy(&caminhoBackup, &db_path)
        .map_err(|e| format!("Erro ao restaurar backup: {}", e))?;

    Ok("Backup restaurado com sucesso. Reinicie o aplicativo para aplicar as mudanças.".to_string())
}