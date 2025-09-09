<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getAllTodos, getAllNotes, addTodo, createNote, type Todo, type Note } from '$lib/database';
  import Button from './Button.svelte';
  import Modal from './Modal.svelte';
  import Progress from './Progress.svelte';
  import Badge from './Badge.svelte';
  
  interface ExportData {
    version: string;
    timestamp: string;
    todos: Todo[];
    notes: Note[];
    metadata: {
      totalTodos: number;
      totalNotes: number;
      completedTodos: number;
    };
  }
  
  let showExportModal = $state(false);
  let showImportModal = $state(false);
  let exportProgress = $state(0);
  let importProgress = $state(0);
  let isExporting = $state(false);
  let isImporting = $state(false);
  let importFile: File | null = $state(null);
  let exportedData: ExportData | null = $state(null);
  
  const dispatch = createEventDispatcher();
  
  async function exportData() {
    isExporting = true;
    exportProgress = 0;
    
    try {
      // Simulate progress for better UX
      exportProgress = 20;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const todos = await getAllTodos();
      exportProgress = 40;
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const notes = await getAllNotes();
      exportProgress = 60;
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const data: ExportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        todos,
        notes,
        metadata: {
          totalTodos: todos.length,
          totalNotes: notes.length,
          completedTodos: todos.filter(t => t.done).length
        }
      };
      
      exportProgress = 80;
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `andtask-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      exportProgress = 100;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      dispatch('export-complete', { data });
    } catch (error) {
      console.error('Export failed:', error);
      dispatch('export-error', { error });
    } finally {
      isExporting = false;
      showExportModal = false;
      exportProgress = 0;
    }
  }
  
  async function handleImport() {
    if (!importFile) return;
    
    isImporting = true;
    importProgress = 0;
    
    try {
      const text = await importFile.text();
      importProgress = 20;
      
      const data: ExportData = JSON.parse(text);
      importProgress = 40;
      
      // Validate data structure
      if (!data.todos || !data.notes || !data.version) {
        throw new Error('Invalid backup file format');
      }
      
      // Import todos
      for (const todo of data.todos) {
        await addTodo({
          id: crypto.randomUUID(), // Generate new ID to avoid conflicts
          text: todo.text,
          done: todo.done
        });
        importProgress += (30 / data.todos.length);
      }
      
      // Import notes
      for (const note of data.notes) {
        await createNote(note.title || 'Imported Note', note.content);
        importProgress += (30 / data.notes.length);
      }
      
      importProgress = 100;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      dispatch('import-complete', { 
        imported: { 
          todos: data.todos.length, 
          notes: data.notes.length 
        } 
      });
    } catch (error) {
      console.error('Import failed:', error);
      dispatch('import-error', { error });
    } finally {
      isImporting = false;
      showImportModal = false;
      importProgress = 0;
      importFile = null;
    }
  }
  
  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      importFile = target.files[0];
    }
  }
</script>

<div class="data-manager">
  <div class="data-actions">
    <Button variant="secondary" onclick={() => showExportModal = true}>
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Export Data
    </Button>
    
    <Button variant="secondary" onclick={() => showImportModal = true}>
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
      </svg>
      Import Data
    </Button>
  </div>
</div>

<!-- Export Modal -->
<Modal 
  open={showExportModal} 
  title="Export Your Data" 
  description="Download a backup of all your todos and notes"
  persistent={isExporting}
  onClose={() => showExportModal = false}
>
  <div class="space-y-4">
    {#if isExporting}
      <div class="text-center py-8">
        <div class="mb-4">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
        </div>
        <h3 class="text-lg font-semibold mb-2">Exporting your data...</h3>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Please wait while we prepare your backup file</p>
        <Progress value={exportProgress} variant="primary" gradient animated />
      </div>
    {:else}
      <div class="text-center py-4">
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">This will create a JSON file containing all your todos and notes. You can use this file to restore your data later.</p>
        <div class="flex items-center justify-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Badge variant="info">Secure</Badge>
          <Badge variant="success">Complete Backup</Badge>
          <Badge variant="primary">JSON Format</Badge>
        </div>
      </div>
    {/if}
  </div>
  
  {#snippet footer()}
    {#if !isExporting}
      <Button variant="ghost" onclick={() => showExportModal = false}>Cancel</Button>
      <Button variant="primary" onclick={exportData}>Export Now</Button>
    {/if}
  {/snippet}
</Modal>

<!-- Import Modal -->
<Modal 
  open={showImportModal} 
  title="Import Data" 
  description="Restore your data from a backup file"
  persistent={isImporting}
  onClose={() => showImportModal = false}
>
  <div class="space-y-4">
    {#if isImporting}
      <div class="text-center py-8">
        <div class="mb-4">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
            </svg>
          </div>
        </div>
        <h3 class="text-lg font-semibold mb-2">Importing your data...</h3>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Please wait while we restore your todos and notes</p>
        <Progress value={importProgress} variant="success" gradient animated />
      </div>
    {:else}
      <div class="space-y-4">
        <div class="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-6 text-center">
          <input 
            type="file" 
            accept=".json" 
            onchange={handleFileChange}
            class="hidden" 
            id="import-file"
          />
          <label for="import-file" class="cursor-pointer">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
              </svg>
            </div>
            <p class="font-medium text-zinc-900 dark:text-zinc-100">Choose a backup file</p>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">JSON files only</p>
          </label>
        </div>
        
        {#if importFile}
          <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-sm font-medium text-green-800 dark:text-green-200">{importFile.name}</span>
              <Badge variant="success" size="sm">{(importFile.size / 1024).toFixed(1)} KB</Badge>
            </div>
          </div>
        {/if}
        
        <div class="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
          <div class="flex items-start gap-2">
            <svg class="w-4 h-4 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <div class="text-sm text-amber-800 dark:text-amber-200">
              <p class="font-medium">Import will add to existing data</p>
              <p>Your current todos and notes will not be deleted. New items will be added with fresh IDs to avoid conflicts.</p>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  {#snippet footer()}
    {#if !isImporting}
      <Button variant="ghost" onclick={() => showImportModal = false}>Cancel</Button>
      <Button variant="primary" disabled={!importFile} onclick={handleImport}>Import Data</Button>
    {/if}
  {/snippet}
</Modal>

<style>
  .data-manager {
    @apply w-full;
  }
  
  .data-actions {
    @apply flex items-center;
    gap: 0.75rem;
  }
  
  .hidden {
    display: none !important;
  }
</style>

