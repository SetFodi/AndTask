<script lang="ts">
  let { children } = $props();
  import "../app.css";
  import { onMount, tick } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { searchContent } from "$lib/database";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let dark = $state(false);
  let paletteOpen = $state(false);
  let query = $state("");
  let selected = $state(0);
  let results = $state<any[]>([]);
  let inputEl = $state<HTMLInputElement | null>(null);

  // Parallax state
  let px1 = $state(0), py1 = $state(0);
  let px2 = $state(0), py2 = $state(0);

  const win = getCurrentWindow();
  async function minimize() {
    try { await win.minimize(); } catch (e) { console.error('minimize failed', e); }
  }
  async function toggleFullscreen() {
    try {
      const fs = await win.isFullscreen();
      await win.setFullscreen(!fs);
    } catch (e) { console.error('fullscreen toggle failed', e); }
  }
  async function closeWindow() {
    try { await win.close(); } catch (e) { console.error('close failed', e); }
  }

  // Base navigation items used for default palette view and filtering
  const baseNavItems = [
    { id: "nav-dashboard", type: "nav", title: "Go to Dashboard", path: "/dashboard" },
    { id: "nav-todo", type: "nav", title: "Go to Todo", path: "/todo" },
    { id: "nav-notes", type: "nav", title: "Go to Notes", path: "/notes" },
    { id: "nav-canvas", type: "nav", title: "Go to Canvas", path: "/canvas" },
  ];

  function applyTheme() {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }

  function handleMouseMove(e: MouseEvent) {
    const { innerWidth: w, innerHeight: h } = window;
    const rx = (e.clientX - w / 2) / w;
    const ry = (e.clientY - h / 2) / h;
    px1 = rx * 12; py1 = ry * 12; // subtle
    px2 = rx * -20; py2 = ry * -20; // counter-move
  }

  onMount(() => {
    const saved = localStorage.getItem("theme");
    if (saved) dark = saved === "dark";
    else dark = matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme();

    const hotkey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape" && paletteOpen) {
        e.preventDefault();
        closePalette();
      }
    };
    window.addEventListener("keydown", hotkey);
    return () => window.removeEventListener("keydown", hotkey);
  });

  $effect(() => applyTheme());

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      // When no query, show default navigation entries
      results = baseNavItems;
      return;
    }

    try {
      // Navigation results (filtered)
      const navItems = baseNavItems.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Database FTS search
      const dbResults = await searchContent(searchQuery);

      // Combine results
      results = [
        ...navItems,
        ...dbResults.map(r => ({
          id: r.id,
          type: r.type,
          title: r.title,
          text: r.content,
          path: r.type === 'todo' ? '/todo' :
                r.type === 'note' ? '/notes' :
                r.type === 'concern' ? '/concerns' : '/'
        }))
      ];

      selected = 0;
    } catch (error) {
      console.error('Search failed:', error);
      results = [];
    }
  }

  // Removed legacy Fuse.js-based index; FTS is used instead.

  function openPalette() {
    paletteOpen = true;
    query = "";
    selected = 0;
    // Show default nav items when opening
    results = baseNavItems;
    tick().then(() => inputEl?.focus());
  }

  function closePalette() {
    paletteOpen = false;
  }

  function choose(idx: number) {
    const it = results[idx];
    if (!it) return;
    if (it.path) {
      goto(it.path);
      closePalette();
    }
  }

  $effect(() => {
    if (query.trim()) performSearch(query);
    else results = baseNavItems;
  });
</script>

<div class="flex h-screen relative overflow-hidden parallax-wrap" role="presentation" aria-hidden="true" onmousemove={handleMouseMove}>
  <!-- Animated background with subtle parallax -->
  <div class="absolute inset-0 parallax-layer" style={`--px:${px1}px; --py:${py1}px;`}></div>
  <div class="absolute inset-0 parallax-layer" style={`--px:${px2}px; --py:${py2}px;`}></div>

  <!-- macOS-style window controls -->
  <div class="absolute top-0 left-0 right-0 h-8 px-3 flex items-center z-20 titlebar-drag">
    <div class="flex gap-2 no-drag">
      <button class="no-drag w-3 h-3 rounded-full bg-red-500/90 hover:bg-red-500 transition-colors" onclick={closeWindow} aria-label="Close"></button>
      <button class="no-drag w-3 h-3 rounded-full bg-amber-500/90 hover:bg-amber-500 transition-colors" onclick={minimize} aria-label="Minimize"></button>
      <button class="no-drag w-3 h-3 rounded-full bg-green-500/90 hover:bg-green-500 transition-colors" onclick={toggleFullscreen} aria-label="Toggle Fullscreen"></button>
    </div>
  </div>

  <!-- Sidebar -->
  <aside class="relative z-10 w-20 md:w-64 p-4 md:p-6 flex flex-col">
    <div class="glass rounded-2xl p-4 md:p-6 h-full flex flex-col animate-slide-up">
      <!-- Logo -->
      <div class="mb-8 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="hidden md:block">
          <h1 class="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AndTask</h1>
          <p class="text-xs text-zinc-700 dark:text-zinc-400">Productivity Suite</p>
        </div>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 space-y-2">
        <a href="/dashboard" class="sidebar-link group {$page.url.pathname === '/dashboard' ? 'active' : ''}">
          <div class="w-5 h-5 text-zinc-500 group-hover:text-indigo-500 transition-colors">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
          </div>
          <span class="hidden md:block font-medium">Dashboard</span>
        </a>
        
        <a href="/todo" class="sidebar-link group {$page.url.pathname === '/todo' ? 'active' : ''}">
          <div class="w-5 h-5 text-zinc-500 group-hover:text-blue-500 transition-colors">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
          </div>
          <span class="hidden md:block font-medium">Todo</span>
        </a>
        
        <a href="/notes" class="sidebar-link group {$page.url.pathname === '/notes' ? 'active' : ''}">
          <div class="w-5 h-5 text-zinc-500 group-hover:text-green-500 transition-colors">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2v1a2 2 0 012-2 2 2 0 012 2v6a4 4 0 01-4 4H6a4 4 0 01-4-4V5z" clip-rule="evenodd"/>
            </svg>
          </div>
          <span class="hidden md:block font-medium">Notes</span>
        </a>

        <a href="/canvas" class="sidebar-link group {$page.url.pathname === '/canvas' ? 'active' : ''}">
          <div class="w-5 h-5 text-zinc-500 group-hover:text-purple-500 transition-colors">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
            </svg>
          </div>
          <span class="hidden md:block font-medium">Canvas</span>
        </a>
      </nav>
    </div>
  </aside>
  
  <!-- Main Content -->
  <div class="flex-1 flex flex-col relative z-10">
    <!-- Header -->
    <header class="p-4 md:p-6 pb-0">
      <div class="glass rounded-2xl p-4 flex items-center justify-between animate-slide-up" style="animation-delay: 0.1s">
        <div class="flex items-center gap-4">
          <div class="hidden md:flex flex-col">
            <h2 class="font-semibold text-zinc-900 dark:text-zinc-100">Welcome back</h2>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">Let's get productive today</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button
            class="btn-secondary flex items-center gap-2 text-sm"
            onclick={() => (dark = !dark)}
          >
            {#if dark}
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
              </svg>
              <span class="hidden sm:inline">Light</span>
            {:else}
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
              </svg>
              <span class="hidden sm:inline">Dark</span>
            {/if}
          </button>
          
          <button
            class="btn-primary flex items-center gap-2 text-sm"
            onclick={openPalette}
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
            </svg>
            <span class="hidden sm:inline font-mono text-xs">⌘K</span>
          </button>
        </div>
      </div>
    </header>
    
    <!-- Main Content Area -->
    <main class="flex-1 p-4 md:p-6 pt-4 overflow-auto">
      {#key $page.url.pathname}
        <div class="animate-fade-in" style="animation-delay: 0.2s">
          {@render children()}
        </div>
      {/key}
    </main>
  </div>
</div>

{#if paletteOpen}
  <div
    class="fixed inset-0 z-50 bg-black/20 backdrop-blur-xl animate-fade-in"
    role="button"
    tabindex="0"
    aria-label="Close command palette overlay"
    onclick={(e) => { if (e.target === e.currentTarget) closePalette(); }}
    onkeydown={(e) => { if (e.key === 'Escape') closePalette(); }}
  >
    <div class="flex items-start justify-center min-h-screen pt-24 px-4">
      <div class="glass rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in">
        <!-- Search Header -->
        <div class="p-6 border-b border-white/10 dark:border-zinc-800/50">
          <div class="flex items-center gap-4">
            <div class="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
              <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
              </svg>
            </div>
            <input
              bind:this={inputEl}
              bind:value={query}
              placeholder="Search todos, notes, concerns... or navigate"
              class="flex-1 bg-transparent outline-none text-lg placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              onkeydown={(e) => {
                if (e.key === "Escape") return closePalette();
                if (e.key === "ArrowDown") { e.preventDefault(); selected = Math.min(selected + 1, results.length - 1); }
                if (e.key === "ArrowUp") { e.preventDefault(); selected = Math.max(selected - 1, 0); }
                if (e.key === "Enter") { e.preventDefault(); choose(selected); }
              }}
            />
            <div class="px-2 py-1 text-xs font-mono bg-zinc-100/50 dark:bg-zinc-800/50 rounded">
              ESC
            </div>
          </div>
        </div>
        
        <!-- Results -->
        <div class="max-h-96 overflow-auto">
          {#if results.length === 0}
            <div class="p-8 text-center">
              <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <svg class="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">No results found</p>
              <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Try searching for todos, notes, or concerns</p>
            </div>
          {:else}
            <div class="p-2">
              {#each results as r, i}
                <button
                  class="w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-4 group {i === selected 
                    ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 ring-1 ring-blue-500/30' 
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
                  onmouseenter={() => (selected = i)}
                  onclick={() => choose(i)}
                >
                  <div class="p-2 rounded-lg transition-colors {
                    r.type === 'nav' ? 'bg-blue-500/20' :
                    r.type === 'todo' ? 'bg-green-500/20' :
                    r.type === 'note' ? 'bg-amber-500/20' :
                    r.type === 'concern' ? 'bg-red-500/20' : ''
                  }">
                    {#if r.type === 'nav'}
                      <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                    {:else if r.type === 'todo'}
                      <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                    {:else if r.type === 'note'}
                      <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2v1a2 2 0 012-2 2 2 0 012 2v6a4 4 0 01-4 4H6a4 4 0 01-4-4V5z" clip-rule="evenodd"/>
                      </svg>
                    {:else}
                      <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{r.title}</div>
                    {#if r.text && r.text !== r.title}
                      <div class="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-1">{r.text}</div>
                    {/if}
                  </div>
                  <div class="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wide font-medium">
                    {r.type}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
