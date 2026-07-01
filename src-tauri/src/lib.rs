// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;

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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, get_backup_folder])
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
