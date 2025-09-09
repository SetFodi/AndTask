<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  // Redirect to dashboard on mount
  onMount(() => {
    goto('/dashboard', { replaceState: true });
  });
</script>

<div class="loading-container">
  <div class="loading-spinner"></div>
  <p>Loading AndTask...</p>
</div>

<style>
  .loading-container {
    @apply flex flex-col items-center justify-center h-screen;
    color: var(--text-1);
  }
  
  .loading-spinner {
    @apply w-8 h-8 border-2 border-t-2 rounded-full animate-spin mb-4;
    border-color: var(--border-color);
    border-top-color: var(--accent);
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
