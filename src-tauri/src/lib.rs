use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        // Initialize database tables
        Migration {
            version: 1,
            description: "create_todos_table",
            sql: "CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                done BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_notes_table", 
            sql: "CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_concerns_table",
            sql: "CREATE TABLE IF NOT EXISTS concerns (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
                status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_fts_virtual_table",
            sql: "CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
                item_type,
                item_id,
                title,
                content,
                tokenize = 'porter'
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_title_to_notes",
            sql: "ALTER TABLE notes ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Note';",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:andtask.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
