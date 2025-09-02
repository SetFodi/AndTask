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
  try {
    const result = await database.select<Note[]>('SELECT * FROM notes ORDER BY updated_at DESC');
    console.log('getAllNotes result:', result);
    return result;
  } catch (error) {
    console.error('getAllNotes error:', error);
    // If title column doesn't exist, try without it
    try {
      const result = await database.select<any[]>('SELECT id, content, created_at, updated_at FROM notes ORDER BY updated_at DESC');
      return result.map(note => ({
        ...note,
        title: note.content.split('\n')[0].replace('#', '').trim() || 'Untitled Note'
      }));
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

export async function getNote(): Promise<Note | null> {
  const database = await initDB();
  const result = await database.select<Note[]>('SELECT * FROM notes ORDER BY id DESC LIMIT 1');
  return result.length > 0 ? result[0] : null;
}

export async function createNote(title: string, content: string): Promise<Note> {
  const database = await initDB();
  console.log('Creating note with title:', title, 'content:', content);

  // Always use fallback approach since title column doesn't exist yet
  const result = await database.execute(
    'INSERT INTO notes (content, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [content]
  );

  const noteId = result.lastInsertId;
  console.log('Created note with ID:', noteId);

  // Add to FTS index (without title for now)
  try {
    await database.execute(
      'INSERT INTO search_fts (item_type, item_id, content) VALUES (?, ?, ?)',
      ['note', noteId.toString(), content]
    );
  } catch (ftsError) {
    console.warn('FTS insert failed:', ftsError);
  }

  // Return the created note with title added
  const created = await database.select<any[]>('SELECT * FROM notes WHERE id = ?', [noteId]);
  const note = {
    ...created[0],
    title: title
  };
  console.log('Retrieved created note:', note);
  return note;
}

export async function updateNote(id: number, title: string, content: string): Promise<void> {
  const database = await initDB();

  // Update without title column for now
  await database.execute(
    'UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [content, id]
  );

  // Update FTS index (without title for now)
  await database.execute(
    'UPDATE search_fts SET content = ? WHERE item_type = ? AND item_id = ?',
    [content, 'note', id.toString()]
  );
}

export async function deleteNote(id: number): Promise<void> {
  const database = await initDB();
  console.log('Deleting note from database with ID:', id);

  await database.execute('DELETE FROM notes WHERE id = ?', [id]);
  console.log('Deleted from notes table');

  try {
    await database.execute('DELETE FROM search_fts WHERE item_type = ? AND item_id = ?', ['note', id.toString()]);
    console.log('Deleted from search_fts table');
  } catch (ftsError) {
    console.warn('Failed to delete from FTS table:', ftsError);
  }
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
