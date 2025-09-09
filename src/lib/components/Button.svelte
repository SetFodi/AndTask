<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: boolean;
    fullWidth?: boolean;
    ripple?: boolean;
    children?: import('svelte').Snippet;
  }
  
  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon = false,
    fullWidth = false,
    ripple = true,
    children,
    onclick,
    ...restProps
  }: Props & { onclick?: () => void } = $props();
  
  const dispatch = createEventDispatcher();
  let buttonElement: HTMLButtonElement;
  
  function handleClick(event: MouseEvent) {
    if (disabled || loading) return;
    
    if (ripple) {
      createRipple(event);
    }
    
    dispatch('click', event);
    onclick?.();
  }
  
  function createRipple(event: MouseEvent) {
    const button = buttonElement;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    
    const rippleElement = button.querySelector('.ripple');
    if (rippleElement) {
      rippleElement.remove();
    }
    
    button.appendChild(circle);
    
    // Remove ripple after animation
    setTimeout(() => {
      circle.remove();
    }, 600);
  }
  
  $: classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    icon && 'btn-icon',
    fullWidth && 'btn-full-width',
    loading && 'btn-loading',
    disabled && 'btn-disabled'
  ].filter(Boolean).join(' ');
</script>

<button
  bind:this={buttonElement}
  class={classes}
  {disabled}
  onclick={handleClick}
  {...restProps}
>
  {#if loading}
    <svg class="btn-spinner" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32">
        <animate attributeName="stroke-dashoffset" dur="1s" values="32;0;32" repeatCount="indefinite"/>
        <animate attributeName="stroke-dasharray" dur="1s" values="0 32;16 16;0 32" repeatCount="indefinite"/>
      </circle>
    </svg>
  {/if}
  
  {@render children?.()}
</button>

<style>
  .btn {
    @apply relative inline-flex items-center justify-center font-medium transition-all duration-300 outline-none overflow-hidden;
    border-radius: var(--radius-md);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  
  /* Size variants */
  .btn-sm {
    @apply px-3 py-1.5 text-sm;
    min-height: 32px;
  }
  
  .btn-md {
    @apply px-4 py-2 text-sm;
    min-height: 40px;
  }
  
  .btn-lg {
    @apply px-6 py-3 text-base;
    min-height: 48px;
  }
  
  .btn-icon {
    @apply p-2;
    min-width: 40px;
    aspect-ratio: 1;
  }
  
  .btn-icon.btn-sm {
    @apply p-1.5;
    min-width: 32px;
  }
  
  .btn-icon.btn-lg {
    @apply p-3;
    min-width: 48px;
  }
  
  .btn-full-width {
    @apply w-full;
  }
  
  /* Variant styles */
  .btn-primary {
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    color: var(--accent-contrast);
    border: 1px solid transparent;
    box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  
  .btn-primary:hover:not(.btn-disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  
  .btn-primary:active:not(.btn-disabled) {
    transform: translateY(-1px) scale(1.01);
  }
  
  .btn-secondary {
    background: var(--surface-elevated);
    color: var(--text-1);
    border: 1px solid var(--border-color);
  }
  
  .btn-secondary:hover:not(.btn-disabled) {
    background: var(--surface-a);
    border-color: var(--border-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  .btn-ghost {
    background: transparent;
    color: var(--text-2);
    border: 1px solid transparent;
  }
  
  .btn-ghost:hover:not(.btn-disabled) {
    background: var(--surface-elevated);
    color: var(--text-1);
    border-color: var(--border-color);
  }
  
  .btn-danger {
    background: linear-gradient(135deg, var(--error) 0%, #dc2626 100%);
    color: white;
    border: 1px solid transparent;
  }
  
  .btn-danger:hover:not(.btn-disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
  }
  
  .btn-success {
    background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
    color: white;
    border: 1px solid transparent;
  }
  
  .btn-success:hover:not(.btn-disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
  }
  
  /* States */
  .btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  
  .btn-loading {
    color: transparent;
  }
  
  .btn-spinner {
    @apply absolute inset-0 m-auto;
    width: 20px;
    height: 20px;
  }
  
  /* Ripple effect */
  :global(.ripple) {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
  }
  
  :global(.btn-primary .ripple) {
    background: rgba(255, 255, 255, 0.4);
  }
  
  :global(.btn-danger .ripple) {
    background: rgba(255, 255, 255, 0.3);
  }
  
  :global(.btn-success .ripple) {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
