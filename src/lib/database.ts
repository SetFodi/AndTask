import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

// Initialize database connection
export async function initDB(): Promise<Database> {
  if (db) return db;
  
  try {
    db = await Database.load('sqlite:andtask.db');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Todo operations
export interface Todo {
  id: string;
  text: string;
  done: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function getAllTodos(): Promise<Todo[]> {
  const database = await initDB();
  const result = await database.select<Todo[]>('SELECT * FROM todos ORDER BY created_at DESC');
  return result;
}

export async function addTodo(todo: Omit<Todo, 'created_at' | 'updated_at'>): Promise<void> {
  const database = await initDB();
  await database.execute(
    'INSERT INTO todos (id, text, done) VALUES (?, ?, ?)',
    [todo.id, todo.text, todo.done]
  );
  
  // Update FTS index
  await database.execute(
    'INSERT INTO search_fts (item_type, item_id, content) VALUES (?, ?, ?)',
    ['todo', todo.id, todo.text]
  );
}

export async function updateTodo(todo: Todo): Promise<void> {
  const database = await initDB();
  await database.execute(
    'UPDATE todos SET text = ?, done = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [todo.text, todo.done, todo.id]
  );
  
  // Update FTS index
  await database.execute(
    'UPDATE search_fts SET content = ? WHERE item_type = ? AND item_id = ?',
    [todo.text, 'todo', todo.id]
  );
}

export async function deleteTodo(id: string): Promise<void> {
  const database = await initDB();
  await database.execute('DELETE FROM todos WHERE id = ?', [id]);
  await database.execute('DELETE FROM search_fts WHERE item_type = ? AND item_id = ?', ['todo', id]);
}

// Notes operations  
export interface Note {
  id: number;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export async function getAllNotes(): Promise<Note[]> {
  const database = await initDB();
  const result = await database.select<Note[]>('SELECT * FROM notes ORDER BY updated_at DESC');
  return result;
}

export async function getNote(): Promise<Note | null> {
  const database = await initDB();
  const result = await database.select<Note[]>('SELECT * FROM notes ORDER BY id DESC LIMIT 1');
  return result.length > 0 ? result[0] : null;
}

export async function createNote(title: string, content: string): Promise<Note> {
  const database = await initDB();
  const result = await database.execute(
    'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [title, content]
  );

  const noteId = result.lastInsertId;

  // Add to FTS index
  await database.execute(
    'INSERT INTO search_fts (item_type, item_id, title, content) VALUES (?, ?, ?, ?)',
    ['note', noteId.toString(), title, content]
  );

  // Return the created note
  const created = await database.select<Note[]>('SELECT * FROM notes WHERE id = ?', [noteId]);
  return created[0];
}

export async function updateNote(id: number, title: string, content: string): Promise<void> {
  const database = await initDB();

  await database.execute(
    'UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title, content, id]
  );

  // Update FTS index
  await database.execute(
    'UPDATE search_fts SET title = ?, content = ? WHERE item_type = ? AND item_id = ?',
    [title, content, 'note', id.toString()]
  );
}

export async function deleteNote(id: number): Promise<void> {
  const database = await initDB();

  await database.execute('DELETE FROM notes WHERE id = ?', [id]);
  await database.execute('DELETE FROM search_fts WHERE item_type = ? AND item_id = ?', ['note', id.toString()]);
}

export async function saveNote(content: string): Promise<void> {
  const database = await initDB();
  
  // Check if note exists
  const existing = await getNote();
  
  if (existing) {
    await database.execute(
      'UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content, existing.id]
    );
    
    // Update FTS index
    await database.execute(
      'UPDATE search_fts SET content = ? WHERE item_type = ? AND item_id = ?',
      [content, 'note', existing.id.toString()]
    );
  } else {
    const result = await database.execute(
      'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      ['Untitled Note', content]
    );
    const noteId = result.lastInsertId;

    // Add to FTS index
    await database.execute(
      'INSERT INTO search_fts (item_type, item_id, title, content) VALUES (?, ?, ?, ?)',
      ['note', noteId.toString(), 'Untitled Note', content]
    );
  }
}



// Search operations
export interface SearchResult {
  type: 'todo' | 'note';
  id: string;
  title: string;
  content: string;
  rank: number;
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  
  const database = await initDB();
  const result = await database.select<{
    item_type: string;
    item_id: string;
    content: string;
    rank: number;
  }[]>(
    `SELECT item_type, item_id, content, bm25(search_fts) as rank 
     FROM search_fts 
     WHERE search_fts MATCH ? 
     ORDER BY rank 
     LIMIT 50`,
    [query]
  );
  
  return result.map(row => ({
    type: row.item_type as 'todo' | 'note',
    id: row.item_id,
    title: row.content.substring(0, 50) + (row.content.length > 50 ? '...' : ''),
    content: row.content,
    rank: row.rank
  }));
}
