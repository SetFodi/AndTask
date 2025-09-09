<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { scale, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  interface Props {
    open?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    persistent?: boolean;
    showCloseButton?: boolean;
    title?: string;
    description?: string;
    children?: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
  }
  
  let {
    open = false,
    size = 'md',
    persistent = false,
    showCloseButton = true,
    title,
    description,
    children,
    footer,
    onClose
  }: Props & { onClose?: () => void } = $props();
  
  const dispatch = createEventDispatcher();
  let modalElement: HTMLDivElement = $state()!;
  let previouslyFocused: HTMLElement | null = null;
  
  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && !persistent) {
      handleClose();
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !persistent) {
      handleClose();
    }
  }
  
  function handleClose() {
    dispatch('close');
    onClose?.();
  }
  
  function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }
  
  $effect(() => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      
      // Focus management
      setTimeout(() => {
        const firstFocusable = modalElement?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        firstFocusable?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    }
  });
  
  onMount(() => {
    return () => {
      document.body.style.overflow = '';
    };
  });
  
  const sizeClasses = $derived({
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-none mx-4'
  }[size]);
</script>

<svelte:window onkeydown={open ? handleEscape : undefined} />

{#if open}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={handleBackdropClick}
    onkeydown={trapFocus}
    transition:fly={{ y: -50, duration: 300, easing: quintOut }}
  >
    <div
      bind:this={modalElement}
      class="modal-content {sizeClasses}"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      transition:scale={{ start: 0.9, duration: 300, easing: quintOut }}
    >
      <!-- Header -->
      {#if title || showCloseButton}
        <header class="modal-header">
          <div class="modal-title-section">
            {#if title}
              <h2 id="modal-title" class="modal-title">{title}</h2>
            {/if}
            {#if description}
              <p id="modal-description" class="modal-description">{description}</p>
            {/if}
          </div>
          
          {#if showCloseButton}
            <button
              class="modal-close"
              onclick={handleClose}
              aria-label="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          {/if}
        </header>
      {/if}
      
      <!-- Body -->
      <div class="modal-body">
        {@render children?.()}
      </div>
      
      <!-- Footer -->
      {#if footer}
        <footer class="modal-footer">
          {@render footer?.()}
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  @reference "../../app.css";
  .modal-backdrop {
    @apply fixed z-50 flex items-center justify-center p-4;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  
  .modal-content {
    @apply relative w-full overflow-hidden;
    max-height: 90vh;
    background: var(--surface-a);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
  }
  
  
  .modal-header {
    @apply flex items-start justify-between;
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .modal-title-section {
    @apply flex-1;
    margin-right: 1rem;
  }
  
  .modal-title {
    @apply text-xl font-semibold;
    margin-bottom: 0.25rem;
    color: var(--text-1);
  }
  
  .modal-description {
    @apply text-sm;
    color: var(--text-2);
  }
  
  .modal-close {
    @apply p-2 rounded-lg transition-all duration-200;
    color: var(--text-3);
    background: transparent;
    border: none;
    cursor: pointer;
  }
  
  .modal-close:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(html.dark) .modal-close:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  
  .modal-body {
    @apply flex-1 overflow-y-auto;
    padding: 1.5rem;
    color: var(--text-1);
  }
  
  .modal-footer {
    @apply flex items-center justify-end;
    padding: 1rem 1.5rem 1.5rem 1.5rem;
    border-top: 1px solid var(--border-color);
    gap: 0.75rem;
  }
  
  /* Size variants */
  .max-w-none {
    width: calc(100vw - 2rem);
    height: calc(100vh - 2rem);
  }
  
  /* Animation enhancements */
  .modal-content {
    animation: modalSlideIn 0.3s ease-out;
  }
  
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  /* Focus styles */
  .modal-content:focus {
    outline: none;
  }
  
  .modal-close:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
