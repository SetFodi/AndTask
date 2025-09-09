<script lang="ts">
  import { spring } from 'svelte/motion';
  
  interface Props {
    value?: number;
    max?: number;
    variant?: 'default' | 'success' | 'warning' | 'error';
    size?: 'sm' | 'md' | 'lg';
    indeterminate?: boolean;
    showValue?: boolean;
    animated?: boolean;
    gradient?: boolean;
    striped?: boolean;
    children?: import('svelte').Snippet;
  }
  
  let {
    value = 0,
    max = 100,
    variant = 'default',
    size = 'md',
    indeterminate = false,
    showValue = false,
    animated = true,
    gradient = false,
    striped = false,
    children
  }: Props = $props();
  
  const animatedValue = spring(0, { stiffness: 0.1, damping: 0.8 });
  
  $: if (animated) {
    animatedValue.set(value);
  }
  
  $: percentage = Math.min(Math.max((animated ? $animatedValue : value) / max * 100, 0), 100);
  $: displayValue = Math.round(percentage);
  
  $: classes = [
    'progress',
    `progress-${variant}`,
    `progress-${size}`,
    indeterminate && 'progress-indeterminate',
    gradient && 'progress-gradient',
    striped && 'progress-striped'
  ].filter(Boolean).join(' ');
</script>

<div class="progress-container">
  {#if showValue && !indeterminate}
    <div class="progress-label">
      {@render children?.()}
      <span class="progress-value">{displayValue}%</span>
    </div>
  {:else if children}
    <div class="progress-label">
      {@render children?.()}
    </div>
  {/if}
  
  <div class={classes} role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin="0" aria-valuemax={max}>
    <div class="progress-track">
      {#if !indeterminate}
        <div class="progress-fill" style="width: {percentage}%"></div>
      {:else}
        <div class="progress-indeterminate-fill"></div>
      {/if}
    </div>
  </div>
</div>

<style>
  .progress-container {
    @apply w-full;
  }
  
  .progress-label {
    @apply flex justify-between items-center mb-2 text-sm font-medium;
    color: var(--text-2);
  }
  
  .progress-value {
    @apply font-mono;
    color: var(--text-1);
  }
  
  .progress {
    @apply w-full relative overflow-hidden;
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border-color);
  }
  
  .progress-track {
    @apply relative w-full h-full overflow-hidden;
    border-radius: inherit;
  }
  
  .progress-fill {
    @apply h-full transition-all duration-500 ease-out relative overflow-hidden;
    border-radius: inherit;
    background: var(--accent);
  }
  
  .progress-indeterminate-fill {
    @apply h-full absolute top-0 left-0;
    width: 30%;
    background: var(--accent);
    border-radius: inherit;
    animation: progressIndeterminate 2s ease-in-out infinite;
  }
  
  /* Size variants */
  .progress-sm {
    height: 6px;
  }
  
  .progress-md {
    height: 8px;
  }
  
  .progress-lg {
    height: 12px;
  }
  
  /* Color variants */
  .progress-success .progress-fill,
  .progress-success .progress-indeterminate-fill {
    background: var(--success);
  }
  
  .progress-warning .progress-fill,
  .progress-warning .progress-indeterminate-fill {
    background: var(--warning);
  }
  
  .progress-error .progress-fill,
  .progress-error .progress-indeterminate-fill {
    background: var(--error);
  }
  
  /* Gradient variant */
  .progress-gradient .progress-fill {
    background: linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%);
  }
  
  .progress-gradient.progress-success .progress-fill {
    background: linear-gradient(90deg, var(--success) 0%, #059669 100%);
  }
  
  .progress-gradient.progress-warning .progress-fill {
    background: linear-gradient(90deg, var(--warning) 0%, #d97706 100%);
  }
  
  .progress-gradient.progress-error .progress-fill {
    background: linear-gradient(90deg, var(--error) 0%, #dc2626 100%);
  }
  
  /* Striped variant */
  .progress-striped .progress-fill {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 12px 12px;
    animation: progressStripes 1s linear infinite;
  }
  
  /* Shine effect */
  .progress-fill::after {
    content: '';
    @apply absolute inset-0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: progressShine 2s ease-in-out infinite;
  }
  
  .progress-indeterminate .progress-fill::after {
    display: none;
  }
  
  @keyframes progressIndeterminate {
    0% {
      left: -30%;
    }
    100% {
      left: 100%;
    }
  }
  
  @keyframes progressStripes {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 12px 0;
    }
  }
  
  @keyframes progressShine {
    0% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
