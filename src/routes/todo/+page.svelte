<script lang="ts">
  import { onMount } from "svelte";
  import { dndzone } from "svelte-dnd-action";
  import { scale } from "svelte/transition";
  import { getAllTodos, addTodo, updateTodo, deleteTodo, type Todo } from "$lib/database";
  import Button from "$lib/components/Button.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Progress from "$lib/components/Progress.svelte";

  let newText = $state("");
  let todos = $state<Todo[]>([]);
  let selectedIndex = $state(0);
  let listEl = $state<HTMLUListElement | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      todos = await getAllTodos();
    } catch (error) {
      console.error('Failed to load todos:', error);
      // Keep empty list when DB fails; no mock data
      todos = [];
    } finally {
      loading = false;
    }
  });

  async function addTodoHandler() {
    const t = newText.trim();
    if (!t) return;

    const todo: Todo = { id: crypto.randomUUID(), text: t, done: false };

    try {
      await addTodo(todo);
      todos = [todo, ...todos];
      newText = "";
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  }

  async function toggle(id: string) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updatedTodo = { ...todo, done: !todo.done };

    try {
      await updateTodo(updatedTodo);
      todos = todos.map((t) => (t.id === id ? updatedTodo : t));
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  }

  async function remove(id: string) {
    try {
      await deleteTodo(id);
      todos = todos.filter((t) => t.id !== id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }

  function handleFinalize(e: CustomEvent) {
    todos = e.detail.items as Todo[];
  }

  $effect(() => {
    if (todos.length === 0) selectedIndex = 0;
    else selectedIndex = Math.min(Math.max(0, selectedIndex), todos.length - 1);
  });

  function onListKeydown(e: KeyboardEvent) {
    if (todos.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, todos.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "x") {
      e.preventDefault();
      toggle(todos[selectedIndex].id);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const id = todos[selectedIndex].id;
      remove(id);
    } else if (e.key.toLowerCase() === "n") {
      e.preventDefault();
      inputEl?.focus();
    }
  }
</script>

<div class="max-w-4xl mx-auto space-y-6">
  <!-- Header Section -->
  <div class="card animate-slide-up">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Todo Manager</h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">Organize your tasks with drag & drop</p>
      </div>
      <div class="flex items-center gap-3">
        <Badge variant="success" dot>{todos.filter(t => t.done).length} done</Badge>
        <Badge variant="primary" dot>{todos.filter(t => !t.done).length} active</Badge>
        <Badge variant="info" outline size="sm">{Math.round((todos.filter(t => t.done).length / Math.max(todos.length, 1)) * 100)}% complete</Badge>
      </div>
    </div>

    <!-- Quick Add Form -->
    <div class="flex items-center gap-3">
      <div class="flex-1 relative">
        <input
          class="input-glass w-full pr-12"
          placeholder="Add a new todo... (Press Enter)"
          bind:value={newText}
          bind:this={inputEl}
          onkeydown={(e) => e.key === "Enter" && addTodoHandler()}
        />
        <div class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 dark:text-zinc-500">
          ↵
        </div>
      </div>
      <Button variant="primary" onclick={addTodoHandler}>
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
        </svg>
        Add Task
      </Button>
    </div>
  </div>

  <!-- Progress Overview -->
  {#if todos.length > 0}
    <div class="glass rounded-lg p-4 animate-fade-in" style="animation-delay: 0.1s">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Overall Progress</span>
        <Badge variant="success" size="sm">{todos.filter(t => t.done).length} of {todos.length} completed</Badge>
      </div>
      <Progress 
        value={todos.filter(t => t.done).length} 
        max={todos.length} 
        variant="success" 
        size="md"
        gradient
        animated
        showValue
      >
        Task Completion
      </Progress>
    </div>
  {/if}
  
  <!-- Keyboard Shortcuts Help -->
  {#if todos.length > 0}
    <div class="glass rounded-lg p-3 text-xs text-zinc-600 dark:text-zinc-400 animate-fade-in" style="animation-delay: 0.2s">
      <div class="flex items-center gap-4">
        <span class="font-medium">Keyboard:</span>
        <span><kbd class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">↑↓</kbd> Navigate</span>
        <span><kbd class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">Space</kbd> Toggle</span>
        <span><kbd class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">Del</kbd> Remove</span>
        <span><kbd class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">N</kbd> New todo</span>
      </div>
    </div>
  {/if}

  <!-- Todo List -->
  <div class="card animate-slide-up hover-tilt" style="animation-delay: 0.2s">
    {#if loading}
      <ul class="space-y-3">
        {#each Array(4) as _, i}
          <li class="relative overflow-hidden rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white/60 dark:bg-zinc-900/60 p-4">
            <div class="flex items-center gap-4">
              <div class="w-6 h-6 rounded-full skeleton"></div>
              <div class="flex-1">
                <div class="h-4 w-1/2 skeleton mb-2"></div>
                <div class="h-3 w-1/3 skeleton"></div>
              </div>
              <div class="w-6 h-6 rounded-lg skeleton"></div>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <ul
        class="space-y-3 outline-none"
        use:dndzone={{ items: todos, flipDurationMs: 200 }}
        onfinalize={handleFinalize}
        tabindex="0"
        role="listbox"
        aria-label="Todo list"
        onkeydown={onListKeydown}
        bind:this={listEl}
      >
        {#each todos as t, i (t.id)}
          <li
            class={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
              t.done
                ? "border-green-200/50 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/30"
                : "border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80"
            } ${i === selectedIndex ? "ring-2 ring-blue-500/30 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" : ""}`}
            role="option"
            aria-selected={i===selectedIndex}
          >
            <div class="flex items-center gap-4 p-4">
              <!-- Status Toggle -->
              <button
                class="relative flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200 group-hover:scale-110 active:animate-pop"
                class:border-zinc-300={!t.done}
                class:dark:border-zinc-600={!t.done}
                class:border-green-500={t.done}
                class:bg-green-500={t.done}
                onclick={() => toggle(t.id)}
                aria-label={t.done ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {#if t.done}
                  <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                {/if}
              </button>

              <!-- Task Text -->
              <div class="flex-1 min-w-0">
                <div class="font-medium transition-all duration-200"
                  class:text-zinc-900={!t.done}
                  class:dark:text-zinc-100={!t.done}
                  class:text-green-700={t.done}
                  class:dark:text-green-300={t.done}
                  class:line-through={t.done}
                  class:opacity-75={t.done}
                >
                  {t.text}
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  class="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200 active:animate-pop"
                  onclick={() => remove(t.id)}
                  aria-label="Delete todo"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Drag Handle -->
            <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

            <!-- Completion Animation Overlay -->
            {#if t.done}
              <div class="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 pointer-events-none shimmer"></div>
            {/if}
          </li>
        {/each}
      </ul>

      {#if todos.length === 0}
        <div class="text-center py-12 animate-fade-in">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No todos yet</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Create your first task to get started</p>
          <Button variant="primary" onclick={() => inputEl?.focus()}>
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
            </svg>
            Add Your First Todo
          </Button>
        </div>
      {/if}
      {/if}

  </div>
</div>
