<script lang="ts">
  interface Props {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md' | 'lg';
    dot?: boolean;
    pulse?: boolean;
    outline?: boolean;
    removable?: boolean;
    children?: import('svelte').Snippet;
  }
  
  let {
    variant = 'default',
    size = 'md',
    dot = false,
    pulse = false,
    outline = false,
    removable = false,
    children,
    onRemove
  }: Props & { onRemove?: () => void } = $props();
  
  function handleRemove() {
    onRemove?.();
  }
  
  $: classes = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    dot && 'badge-dot',
    pulse && 'badge-pulse',
    outline && 'badge-outline',
    removable && 'badge-removable'
  ].filter(Boolean).join(' ');
</script>

<span class={classes}>
  {#if dot}
    <span class="badge-dot-indicator"></span>
  {/if}
  
  {@render children?.()}
  
  {#if removable}
    <button class="badge-remove" onclick={handleRemove} aria-label="Remove">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  {/if}
</span>

<style>
  .badge {
    @apply inline-flex items-center justify-center font-medium rounded-full transition-all duration-200;
    white-space: nowrap;
    user-select: none;
  }
  
  /* Size variants */
  .badge-sm {
    @apply px-2 py-0.5 text-xs;
    min-height: 20px;
  }
  
  .badge-md {
    @apply px-2.5 py-1 text-xs;
    min-height: 24px;
  }
  
  .badge-lg {
    @apply px-3 py-1.5 text-sm;
    min-height: 28px;
  }
  
  .badge-dot {
    @apply px-1.5;
  }
  
  .badge-dot-indicator {
    @apply w-2 h-2 rounded-full mr-1.5 flex-shrink-0;
    background: currentColor;
  }
  
  /* Color variants */
  .badge-default {
    background: var(--surface-elevated);
    color: var(--text-2);
    border: 1px solid var(--border-color);
  }
  
  .badge-primary {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  }
  
  .badge-success {
    background: var(--success-light);
    color: var(--success);
    border: 1px solid color-mix(in srgb, var(--success) 25%, transparent);
  }
  
  .badge-warning {
    background: var(--warning-light);
    color: var(--warning);
    border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
  }
  
  .badge-error {
    background: var(--error-light);
    color: var(--error);
    border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
  }
  
  .badge-info {
    background: color-mix(in srgb, #3b82f6 15%, transparent);
    color: #3b82f6;
    border: 1px solid color-mix(in srgb, #3b82f6 25%, transparent);
  }
  
  /* Outline variants */
  .badge-outline.badge-primary {
    background: transparent;
    border-color: var(--accent);
  }
  
  .badge-outline.badge-success {
    background: transparent;
    border-color: var(--success);
  }
  
  .badge-outline.badge-warning {
    background: transparent;
    border-color: var(--warning);
  }
  
  .badge-outline.badge-error {
    background: transparent;
    border-color: var(--error);
  }
  
  .badge-outline.badge-info {
    background: transparent;
    border-color: #3b82f6;
  }
  
  /* Pulse animation */
  .badge-pulse {
    animation: badgePulse 2s infinite;
  }
  
  .badge-pulse .badge-dot-indicator {
    animation: dotPulse 2s infinite;
  }
  
  /* Removable */
  .badge-removable {
    @apply pr-1;
  }
  
  .badge-remove {
    @apply ml-1 p-0.5 rounded-full transition-colors duration-200 hover:bg-black/10 dark:hover:bg-white/10;
    background: transparent;
    border: none;
    cursor: pointer;
    color: currentColor;
    opacity: 0.7;
  }
  
  .badge-remove:hover {
    opacity: 1;
  }
  
  @keyframes badgePulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.9;
    }
  }
  
  @keyframes dotPulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(0.8);
    }
  }
</style>
