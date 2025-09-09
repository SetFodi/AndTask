<script lang="ts">
  import { onMount } from 'svelte';
  import { getAllTodos, getAllNotes, type Todo, type Note } from '$lib/database';
  import Badge from '$lib/components/Badge.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import Button from '$lib/components/Button.svelte';
  import DataManager from '$lib/components/DataManager.svelte';
  
  let todos = $state<Todo[]>([]);
  let notes = $state<Note[]>([]);
  let loading = $state(true);
  
  // Analytics state
  let totalTasks = $derived(todos.length);
  let completedTasks = $derived(todos.filter(t => t.done).length);
  let pendingTasks = $derived(todos.filter(t => !t.done).length);
  let completionRate = $derived(totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0);
  
  let totalNotes = $derived(notes.length);
  let totalWords = $derived(notes.reduce((acc, note) => acc + (note.content?.split(/\\s+/).length || 0), 0));
  let averageWordsPerNote = $derived(totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0);
  
  // Date calculations for activity
  let today = $derived(new Date().toDateString());
  let thisWeek = $derived(() => {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return weekStart.toDateString();
  });
  
  let todaysTasks = $derived(todos.filter(t => {
    if (!t.created_at) return false;
    return new Date(t.created_at).toDateString() === today;
  }));
  
  let thisWeeksTasks = $derived(todos.filter(t => {
    if (!t.created_at) return false;
    const taskDate = new Date(t.created_at);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return taskDate >= weekStart;
  }));
  
  onMount(async () => {
    try {
      const [todosData, notesData] = await Promise.all([
        getAllTodos(),
        getAllNotes()
      ]);
      todos = todosData;
      notes = notesData;
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      loading = false;
    }
  });
  
  function formatDate(dateStr?: string) {
    if (!dateStr) return 'Unknown';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(dateStr));
  }
  
  // Sample productivity data for charts
  let weeklyProgress = $derived([
    { day: 'Mon', completed: Math.floor(Math.random() * 10) + 5 },
    { day: 'Tue', completed: Math.floor(Math.random() * 10) + 3 },
    { day: 'Wed', completed: Math.floor(Math.random() * 10) + 7 },
    { day: 'Thu', completed: Math.floor(Math.random() * 10) + 4 },
    { day: 'Fri', completed: Math.floor(Math.random() * 10) + 8 },
    { day: 'Sat', completed: Math.floor(Math.random() * 10) + 2 },
    { day: 'Sun', completed: Math.floor(Math.random() * 10) + 1 }
  ]);
</script>

<div class=\"dashboard-container\">
  <div class=\"dashboard-header\">
    <div>
      <h1 class=\"dashboard-title\">Dashboard</h1>
      <p class=\"dashboard-subtitle\">Your productivity overview and insights</p>
    </div>
    <div class=\"dashboard-actions\">
      <Badge variant=\"success\" dot pulse>Live</Badge>
      <Button variant=\"ghost\" size=\"sm\">
        <svg class=\"w-4 h-4 mr-2\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
          <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15\"/>
        </svg>
        Refresh
      </Button>
    </div>
  </div>

  {#if loading}
    <div class=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8\">
      {#each Array(4) as _}
        <div class=\"card h-32\">
          <div class=\"skeleton h-4 w-16 mb-2\"></div>
          <div class=\"skeleton h-8 w-24 mb-2\"></div>
          <div class=\"skeleton h-3 w-20\"></div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Stats Cards -->
    <div class=\"stats-grid\">
      <div class=\"stat-card hover-lift\">
        <div class=\"stat-header\">
          <div class=\"stat-icon stat-icon-primary\">
            <svg class=\"w-6 h-6\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
              <path fill-rule=\"evenodd\" d=\"M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z\" clip-rule=\"evenodd\"/>
            </svg>
          </div>
          <Badge variant=\"primary\" size=\"sm\">Tasks</Badge>
        </div>
        <div class=\"stat-value\">{totalTasks}</div>
        <div class=\"stat-subtitle\">Total tasks created</div>
        <div class=\"stat-progress\">
          <Progress value={completionRate} variant=\"success\" size=\"sm\" />
        </div>
      </div>

      <div class=\"stat-card hover-lift\">
        <div class=\"stat-header\">
          <div class=\"stat-icon stat-icon-success\">
            <svg class=\"w-6 h-6\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
              <path fill-rule=\"evenodd\" d=\"M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z\" clip-rule=\"evenodd\"/>
            </svg>
          </div>
          <Badge variant=\"success\" size=\"sm\">Completed</Badge>
        </div>
        <div class=\"stat-value\">{completedTasks}</div>
        <div class=\"stat-subtitle\">{completionRate.toFixed(1)}% completion rate</div>
        <div class=\"stat-progress\">
          <Progress value={completedTasks} max={totalTasks} variant=\"success\" size=\"sm\" />
        </div>
      </div>

      <div class=\"stat-card hover-lift\">
        <div class=\"stat-header\">
          <div class=\"stat-icon stat-icon-info\">
            <svg class=\"w-6 h-6\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
              <path d=\"M9 2a1 1 0 000 2h2a1 1 0 100-2H9z\"/>
              <path fill-rule=\"evenodd\" d=\"M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2v1a2 2 0 012-2 2 2 0 012 2v6a4 4 0 01-4 4H6a4 4 0 01-4-4V5z\" clip-rule=\"evenodd\"/>
            </svg>
          </div>
          <Badge variant=\"info\" size=\"sm\">Notes</Badge>
        </div>
        <div class=\"stat-value\">{totalNotes}</div>
        <div class=\"stat-subtitle\">{totalWords.toLocaleString()} total words</div>
        <div class=\"stat-meta\">~{averageWordsPerNote} words per note</div>
      </div>

      <div class=\"stat-card hover-lift\">
        <div class=\"stat-header\">
          <div class=\"stat-icon stat-icon-warning\">
            <svg class=\"w-6 h-6\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
              <path fill-rule=\"evenodd\" d=\"M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z\" clip-rule=\"evenodd\"/>
            </svg>
          </div>
          <Badge variant=\"warning\" size=\"sm\">Today</Badge>
        </div>
        <div class=\"stat-value\">{todaysTasks.length}</div>
        <div class=\"stat-subtitle\">Tasks created today</div>
        <div class=\"stat-meta\">{thisWeeksTasks.length} this week</div>
      </div>
    </div>

    <!-- Activity Charts -->
    <div class=\"grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8\">
      <!-- Weekly Progress Chart -->
      <div class=\"card\">
        <div class=\"chart-header\">
          <h3 class=\"chart-title\">Weekly Activity</h3>
          <Badge variant=\"primary\" outline size=\"sm\">Last 7 days</Badge>
        </div>
        <div class=\"chart-container\">
          {#each weeklyProgress as day, i}
            <div class=\"chart-bar-container\">
              <div 
                class=\"chart-bar\" 
                style=\"height: {(day.completed / 15) * 100}%; animation-delay: {i * 100}ms\"
              ></div>
              <div class=\"chart-label\">{day.day}</div>
              <div class=\"chart-value\">{day.completed}</div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class=\"card\">
        <div class=\"chart-header\">
          <h3 class=\"chart-title\">Recent Activity</h3>
          <Badge variant=\"info\" outline size=\"sm\">Live feed</Badge>
        </div>
        <div class=\"activity-feed\">
          {#each todos.slice(0, 5) as todo}
            <div class=\"activity-item animate-slide-up\" style=\"animation-delay: {Math.random() * 500}ms\">
              <div class=\"activity-icon {todo.done ? 'activity-icon-success' : 'activity-icon-pending'}\">
                {#if todo.done}
                  <svg class=\"w-3 h-3\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
                    <path fill-rule=\"evenodd\" d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\" clip-rule=\"evenodd\"/>
                  </svg>
                {:else}
                  <svg class=\"w-3 h-3\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
                    <path fill-rule=\"evenodd\" d=\"M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z\" clip-rule=\"evenodd\"/>
                  </svg>
                {/if}
              </div>
              <div class=\"activity-content\">
                <div class=\"activity-title\">{todo.text}</div>
                <div class=\"activity-meta\">{formatDate(todo.created_at)} • {todo.done ? 'Completed' : 'Pending'}</div>
              </div>
              <Badge variant={todo.done ? 'success' : 'warning'} size=\"sm\">{todo.done ? 'Done' : 'Todo'}</Badge>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Quick Actions -->
      <div class="card">
        <div class="quick-actions-header">
          <h3 class="chart-title">Quick Actions</h3>
          <p class="chart-subtitle">Jump to your most used features</p>
        </div>
        <div class="quick-actions-grid">
          <Button variant="primary" size="lg" onclick={() => window.location.href = '/todo'}>
            <svg class="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
            </svg>
            Add Task
          </Button>
          
          <Button variant="secondary" size="lg" onclick={() => window.location.href = '/notes'}>
            <svg class="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2v1a2 2 0 012-2 2 2 0 012 2v6a4 4 0 01-4 4H6a4 4 0 01-4-4V5z" clip-rule="evenodd"/>
            </svg>
            Write Note
          </Button>
          
          <Button variant="ghost" size="lg" onclick={() => window.location.href = '/canvas'}>
            <svg class="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
            </svg>
            Open Canvas
          </Button>
        </div>
      </div>
      
      <!-- Data Management -->
      <div class="card">
        <div class="quick-actions-header">
          <h3 class="chart-title">Data Management</h3>
          <p class="chart-subtitle">Backup and restore your data securely</p>
        </div>
        <div class="space-y-4">
          <div class="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-zinc-900 dark:text-zinc-100">Secure Local Storage</p>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">All data stays on your device</p>
            </div>
          </div>
          
          <DataManager 
            onExportComplete={() => console.log('Export completed')} 
            onImportComplete={(event) => {
              console.log('Import completed:', event.detail);
              // Refresh dashboard data
              location.reload();
            }}
          />
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard-container {
    @apply max-w-7xl mx-auto space-y-8;
  }
  
  .dashboard-header {
    @apply flex items-start justify-between mb-8;
  }
  
  .dashboard-title {
    @apply text-3xl font-bold mb-2;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }
  
  .dashboard-subtitle {
    @apply text-base;
    color: var(--text-2);
  }
  
  .dashboard-actions {
    @apply flex items-center gap-3;
  }
  
  .stats-grid {
    @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8;
  }
  
  .stat-card {
    @apply card relative overflow-hidden;
    background: linear-gradient(135deg, var(--surface-a) 0%, var(--surface-elevated) 100%);
  }
  
  .stat-header {
    @apply flex items-center justify-between mb-4;
  }
  
  .stat-icon {
    @apply w-10 h-10 rounded-xl flex items-center justify-center;
  }
  
  .stat-icon-primary {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
  }
  
  .stat-icon-success {
    background: color-mix(in srgb, var(--success) 15%, transparent);
    color: var(--success);
  }
  
  .stat-icon-info {
    background: color-mix(in srgb, #3b82f6 15%, transparent);
    color: #3b82f6;
  }
  
  .stat-icon-warning {
    background: color-mix(in srgb, var(--warning) 15%, transparent);
    color: var(--warning);
  }
  
  .stat-value {
    @apply text-3xl font-bold mb-1;
    color: var(--text-1);
  }
  
  .stat-subtitle {
    @apply text-sm mb-3;
    color: var(--text-2);
  }
  
  .stat-meta {
    @apply text-xs mt-2;
    color: var(--text-3);
  }
  
  .stat-progress {
    @apply mt-3;
  }
  
  .chart-header {
    @apply flex items-center justify-between mb-6;
  }
  
  .chart-title {
    @apply text-lg font-semibold;
    color: var(--text-1);
  }
  
  .chart-subtitle {
    @apply text-sm;
    color: var(--text-2);
  }
  
  .chart-container {
    @apply flex items-end justify-between gap-2 h-32;
  }
  
  .chart-bar-container {
    @apply flex-1 flex flex-col items-center;
  }
  
  .chart-bar {
    @apply w-full rounded-t-md mb-2 transition-all duration-500 ease-out;
    background: linear-gradient(180deg, var(--accent) 0%, var(--accent-hover) 100%);
    animation: chartBarGrow 0.8s ease-out both;
    min-height: 4px;
  }
  
  .chart-label {
    @apply text-xs font-medium mb-1;
    color: var(--text-2);
  }
  
  .chart-value {
    @apply text-xs font-mono;
    color: var(--text-3);
  }
  
  .activity-feed {
    @apply space-y-4 max-h-80 overflow-y-auto;
  }
  
  .activity-item {
    @apply flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5;
  }
  
  .activity-icon {
    @apply w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0;
  }
  
  .activity-icon-success {
    background: var(--success-light);
    color: var(--success);
  }
  
  .activity-icon-pending {
    background: var(--warning-light);
    color: var(--warning);
  }
  
  .activity-content {
    @apply flex-1 min-w-0;
  }
  
  .activity-title {
    @apply font-medium truncate;
    color: var(--text-1);
  }
  
  .activity-meta {
    @apply text-xs mt-1;
    color: var(--text-3);
  }
  
  .quick-actions-header {
    @apply mb-6;
  }
  
  .quick-actions-grid {
    @apply grid grid-cols-1 gap-3;
  }
  
  @media (min-width: 1024px) {
    .quick-actions-grid {
      grid-template-columns: repeat(1, 1fr);
    }
  }
  
  @keyframes chartBarGrow {
    from {
      height: 0;
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
