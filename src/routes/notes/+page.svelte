<script lang="ts">
  import { onMount } from "svelte";
  import { marked } from "marked";
  import { scale } from "svelte/transition";
  import { getAllNotes, createNote, updateNote, deleteNote, type Note } from "$lib/database";

  let notes = $state<Note[]>([]);
  let selectedNote = $state<Note | null>(null);
  let content = $state("");
  let title = $state("");
  let isPreviewMode = $state(false);
  let lastSaved = $state<Date | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);
  let charCount = $derived(content.length);

  onMount(async () => {
    await loadNotes();
  });

  async function loadNotes() {
    try {
      loading = true;
      console.log('Loading notes...');
      notes = await getAllNotes();
      console.log('Loaded notes:', notes);
      if (notes.length > 0 && !selectedNote) {
        selectNote(notes[0]);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load notes:', error);
      alert('Failed to load notes: ' + message);
    } finally {
      loading = false;
    }
  }

  function selectNote(note: Note) {
    selectedNote = note;
    content = note.content;
    title = note.title || "";
    lastSaved = note.updated_at ? new Date(note.updated_at) : new Date();
  }

  async function createNewNote() {
    try {
      console.log('Creating new note...');
      const newNote = await createNote("Untitled Note", "# New Note\n\nStart writing here...");
      console.log('Created note:', newNote);
      await loadNotes(); // Reload to get fresh data
      // Select the newly created note
      const createdNote = notes.find(n => n.id === newNote.id);
      if (createdNote) {
        selectNote(createdNote);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to create note:', error);
      alert('Failed to create note: ' + message);
    }
  }

  async function saveCurrentNote() {
    if (!selectedNote) return;
    try {
      saving = true;
      const currentId = selectedNote.id;
      await updateNote(currentId, title || "Untitled Note", content);
      // Keep local state in sync
      selectedNote = { ...selectedNote, title: title || "Untitled Note", content, updated_at: new Date().toISOString() };
      lastSaved = new Date();

      // Update the note in the notes array
      const noteIndex = notes.findIndex(n => n.id === currentId);
      if (noteIndex >= 0) {
        notes[noteIndex] = { ...selectedNote } as Note;
      }
    } catch (error: unknown) {
      console.error('Failed to save note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      saving = false;
    }
  }

  async function deleteCurrentNote() {
    console.log('🔴 DELETE BUTTON CLICKED!');

    if (!selectedNote) {
      console.log('❌ No note selected');
      alert('No note selected');
      return;
    }

    console.log('✅ Note is selected, proceeding with deletion...');

    try {
      const toDeleteId = selectedNote.id;
      console.log('🗑️ Deleting note with ID:', toDeleteId);

      // Delete from database
      await deleteNote(toDeleteId);
      console.log('✅ Deleted from database');

      // Remove from UI
      notes = notes.filter(n => n.id !== toDeleteId);
      console.log('✅ Updated notes list:', notes);

      if (notes.length > 0) {
        selectNote(notes[0]);
        console.log('✅ Selected first remaining note');
      } else {
        selectedNote = null;
        content = "";
        title = "";
        console.log('✅ No notes left, cleared selection');
      }

      console.log('✅ Delete operation completed successfully');

    } catch (error: unknown) {
      console.error('❌ Failed to delete note:', error);
      alert('Failed to delete note: ' + (error as Error).message);
    }
  }

  // Remove auto-save - we'll use manual save button instead

  function insertMarkdown(syntax: string) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let replacement = '';
    switch (syntax) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'heading':
        replacement = `# ${selectedText || 'Heading'}`;
        break;
      case 'link':
        replacement = `[${selectedText || 'link text'}](url)`;
        break;
      case 'code':
        replacement = `\`${selectedText || 'code'}\``;
        break;
      case 'list':
        replacement = `- ${selectedText || 'list item'}`;
        break;
    }
    
    content = content.substring(0, start) + replacement + content.substring(end);
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + replacement.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }
</script>

<div class="h-full flex gap-6">
  <!-- Notes Sidebar -->
  <div class="w-80 flex flex-col gap-4">
    <!-- Header -->
    <div class="card p-4">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Notes</h1>
        <button
          class="btn-primary text-sm px-3 py-2"
          onclick={createNewNote}
          disabled={loading}
        >
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
          </svg>
          New Note
        </button>
      </div>
      <p class="text-sm text-zinc-800 dark:text-zinc-400">Write with Markdown support</p>
    </div>

    <!-- Notes List -->
    <div class="flex-1 card p-4 overflow-hidden">
      {#if loading}
        <div class="space-y-3">
          {#each Array(5) as _}
            <div class="p-3 rounded-lg border skeleton h-16"></div>
          {/each}
        </div>
      {:else if notes.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center">
            <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <h3 class="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">No notes yet</h3>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">Create your first note to get started</p>
        </div>
      {:else}
        <div class="space-y-2 h-full overflow-y-auto">
          {#each notes as note (note.id)}
            <button
              class="w-full text-left p-3 rounded-lg border transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 {selectedNote?.id === note.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-zinc-200 dark:border-zinc-700'}"
              onclick={() => selectNote(note)}
            >
              <h3 class="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">{note.title || 'Untitled Note'}</h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{note.content.substring(0, 100) || 'No content'}</p>
              <div class="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : 'Just created'}
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Editor Area -->
  <div class="flex-1 flex flex-col gap-4">
    {#if selectedNote}
      <!-- Note Header -->
      <div class="card p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex-1">
            <input
              type="text"
              placeholder="Note title..."
              bind:value={title}
              class="text-lg font-semibold bg-transparent outline-none w-full text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <div class="flex items-center gap-4 mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {wordCount} words
              </div>
              <div class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                {charCount} chars
              </div>
              {#if saving}
                <div class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <svg class="w-3 h-3 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
                  </svg>
                  Saving...
                </div>
              {:else if lastSaved}
                <div class="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  Saved
                </div>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- View Toggle -->
            <div class="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
              <button
                class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200"
                class:bg-white={!isPreviewMode}
                class:dark:bg-zinc-700={!isPreviewMode}
                class:shadow-sm={!isPreviewMode}
                class:text-zinc-900={!isPreviewMode}
                class:dark:text-zinc-100={!isPreviewMode}
                class:text-zinc-600={isPreviewMode}
                class:dark:text-zinc-400={isPreviewMode}
                onclick={() => isPreviewMode = false}
              >
                Edit
              </button>
              <button
                class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200"
                class:bg-white={isPreviewMode}
                class:dark:bg-zinc-700={isPreviewMode}
                class:shadow-sm={isPreviewMode}
                class:text-zinc-900={isPreviewMode}
                class:dark:text-zinc-100={isPreviewMode}
                class:text-zinc-600={!isPreviewMode}
                class:dark:text-zinc-400={!isPreviewMode}
                onclick={() => isPreviewMode = true}
              >
                Preview
              </button>
            </div>

            <!-- Save Button -->
            <button
              class="text-sm px-3 py-2 rounded-lg transition-all bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25"
              onclick={saveCurrentNote}
              disabled={saving}
            >
              {#if saving}
                <svg class="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
                </svg>
              {:else}
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"/>
                </svg>
              {/if}
              Save
            </button>

            <!-- Delete Button -->
            <button
              class="text-sm px-3 py-2 rounded-lg transition-all bg-red-500 hover:bg-red-600 text-white"
              onclick={deleteCurrentNote}
              aria-label="Delete note"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

    <!-- Markdown Toolbar -->
    {#if !isPreviewMode}
      <div class="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg animate-fade-in">
        <button
          class="btn-secondary !px-2 !py-1 text-xs"
          onclick={() => insertMarkdown('heading')}
          title="Heading"
          aria-label="Insert heading"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8a1 1 0 00.553.894l2 1A1 1 0 0018 9V7a1 1 0 00-1.447-.894l-2 1z"/>
          </svg>
        </button>
        <button
          class="btn-secondary !px-2 !py-1 text-xs font-bold"
          onclick={() => insertMarkdown('bold')}
          title="Bold"
          aria-label="Insert bold"
        >
          B
        </button>
        <button
          class="btn-secondary !px-2 !py-1 text-xs italic"
          onclick={() => insertMarkdown('italic')}
          title="Italic"
        >
          I
        </button>
        <button
          class="btn-secondary !px-2 !py-1 text-xs font-mono"
          onclick={() => insertMarkdown('code')}
          title="Code"
        >
          &lt;/&gt;
        </button>
        <button
          class="btn-secondary !px-2 !py-1 text-xs"
          onclick={() => insertMarkdown('link')}
          title="Link"
          aria-label="Insert link"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"/>
          </svg>
        </button>
        <button
          class="btn-secondary !px-2 !py-1 text-xs"
          onclick={() => insertMarkdown('list')}
          title="List"
          aria-label="Insert list"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    {/if}

    <!-- Editor/Preview Content -->
    {#if isPreviewMode}
      <!-- Preview Only -->
      <div class="card h-full">
        <div class="h-full overflow-auto prose prose-zinc dark:prose-invert max-w-none">
          {#if content.trim()}
            {@html marked.parse(content)}
          {:else}
            <div class="flex items-center justify-center h-full text-center">
              <div>
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center">
                  <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No content yet</h3>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">Switch to edit mode to start writing</p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Split Editor/Preview -->
      <div class="grid md:grid-cols-2 gap-6 h-full">
        <!-- Editor -->
        <div class="card flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-medium text-zinc-900 dark:text-zinc-100">Editor</h3>
            <div class="text-xs text-zinc-500 dark:text-zinc-400">
              Markdown supported
            </div>
          </div>
          <textarea
            class="flex-1 w-full resize-none bg-transparent outline-none font-mono text-sm leading-relaxed placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            placeholder="# Your thoughts here...\n\nStart typing in **Markdown** format."
            bind:value={content}
          ></textarea>
        </div>

        <!-- Live Preview -->
        <div class="card flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-medium text-zinc-900 dark:text-zinc-100">Preview</h3>
            <div class="text-xs text-zinc-500 dark:text-zinc-400">
              Live rendering
            </div>
          </div>
          <div class="flex-1 overflow-auto prose prose-zinc dark:prose-invert max-w-none">
            {#if content.trim()}
              {@html marked.parse(content)}
            {:else}
              <div class="flex items-center justify-center h-full text-center opacity-50">
                <div>
                  <svg class="w-12 h-12 mx-auto mb-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">Preview will appear here</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
    {:else}
      <!-- No Note Selected -->
      <div class="flex-1 card flex items-center justify-center">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Select a note to edit</h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">Choose a note from the sidebar or create a new one</p>
        </div>
      </div>
    {/if}
  </div>
</div>
