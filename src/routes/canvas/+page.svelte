<script lang="ts">
  import { onMount } from "svelte";
  import { scale } from "svelte/transition";

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  let tool = $state("pen"); // pen, rectangle, circle, arrow, text
  let brushColor = $state("#10b981");
  let brushSize = $state(3);
  let drawing = $state(false);
  let startX = 0, startY = 0;
  let currentX = 0, currentY = 0;
  let elements: any[] = $state([]);
  let tempElement: any = null;

  function setComposite() {
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);

    canvas.width = w;
    canvas.height = h;

    ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setComposite();

    redrawCanvas();
  }

  function redrawCanvas() {
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;

    // Clear and fill white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Draw all elements
    elements.forEach(element => drawElement(element));

    // Draw temp element if drawing
    if (tempElement) {
      drawElement(tempElement);
    }
  }

  function drawElement(element: any) {
    if (!ctx) return;
    const context = ctx as CanvasRenderingContext2D;

    context.strokeStyle = element.color;
    context.lineWidth = element.size;
    context.fillStyle = element.color;

    switch (element.type) {
      case 'pen':
        context.beginPath();
        element.points.forEach((point: any, i: number) => {
          if (i === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.stroke();
        break;

      case 'rectangle':
        context.strokeRect(element.x, element.y, element.width, element.height);
        break;

      case 'circle':
        context.beginPath();
        const radius = Math.sqrt(element.width * element.width + element.height * element.height) / 2;
        context.arc(element.x + element.width/2, element.y + element.height/2, radius, 0, 2 * Math.PI);
        context.stroke();
        break;

      case 'arrow':
        drawArrow(element.x, element.y, element.x + element.width, element.y + element.height);
        break;
    }
  }

  function drawArrow(fromX: number, fromY: number, toX: number, toY: number) {
    if (!ctx) return;
    const context = ctx as CanvasRenderingContext2D;

    const headlen = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    // Draw line
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();

    // Draw arrowhead
    context.beginPath();
    context.moveTo(toX, toY);
    context.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    context.moveTo(toX, toY);
    context.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    context.stroke();
  }

  onMount(() => {
    setTimeout(() => {
      resizeCanvas();
      const ro = new ResizeObserver(() => resizeCanvas());
      if (canvas && canvas.parentElement) ro.observe(canvas.parentElement);
      window.addEventListener("pointerup", onPointerUp);

      return () => {
        ro.disconnect();
        window.removeEventListener("pointerup", onPointerUp);
      };
    }, 100);
  });

  function onPointerDown(e: PointerEvent) {
    if (!ctx || !canvas) return;
    e.preventDefault();
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    currentX = startX;
    currentY = startY;

    if (tool === 'pen') {
      tempElement = {
        type: 'pen',
        color: brushColor,
        size: brushSize,
        points: [{ x: startX, y: startY }]
      };
    } else {
      tempElement = {
        type: tool,
        color: brushColor,
        size: brushSize,
        x: startX,
        y: startY,
        width: 0,
        height: 0
      };
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!drawing || !ctx || !canvas) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    currentX = e.clientX - rect.left;
    currentY = e.clientY - rect.top;

    if (tool === 'pen' && tempElement) {
      tempElement.points.push({ x: currentX, y: currentY });
    } else if (tempElement) {
      tempElement.width = currentX - startX;
      tempElement.height = currentY - startY;
    }

    redrawCanvas();
  }

  function onPointerUp() {
    if (!drawing || !ctx || !canvas) return;
    drawing = false;

    if (tempElement) {
      elements.push({ ...tempElement });
      tempElement = null;
    }

    redrawCanvas();
    autosave();
  }

  function autosave() {
    if (!canvas) return;
    try {
      const data = JSON.stringify(elements);
      localStorage.setItem("andt_canvas_elements", data);
    } catch (e) {}
  }

  function clearCanvas() {
    elements = [];
    tempElement = null;
    redrawCanvas();
    localStorage.removeItem("andt_canvas_elements");
  }

  function loadCanvas() {
    try {
      const saved = localStorage.getItem("andt_canvas_elements");
      if (saved) {
        elements = JSON.parse(saved);
        redrawCanvas();
      }
    } catch (e) {}
  }

  function exportPNG() {
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = "canvas.png";
    a.click();
  }

  // Load saved elements on mount
  onMount(() => {
    setTimeout(() => {
      loadCanvas();
    }, 200);
  });
</script>

<div class="h-full flex flex-col gap-6" transition:scale={{ duration: 300, delay: 100 }}>
  <!-- Canvas Header -->
  <div class="card p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Canvas</h1>
        <p class="text-sm text-zinc-700 dark:text-zinc-400 mt-1">Draw algorithms, sketches, and ideas</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
          Creative Mode
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Tool Selection -->
      <div class="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all {tool === 'pen' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
          onclick={() => (tool = 'pen')}
        >
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
          </svg>
          Pen
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all {tool === 'rectangle' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
          onclick={() => (tool = 'rectangle')}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
          Rectangle
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all {tool === 'circle' ? 'bg-green-500 text-white shadow-lg shadow-green-500/25' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
          onclick={() => (tool = 'circle')}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Circle
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all {tool === 'arrow' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
          onclick={() => (tool = 'arrow')}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12,5 19,12 12,19"/>
          </svg>
          Arrow
        </button>
      </div>

      <!-- Color Picker -->
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-zinc-900 dark:text-zinc-300" for="brushColor">Color</label>
        <div class="relative">
          <input 
            id="brushColor" 
            type="color" 
            bind:value={brushColor} 
            class="w-10 h-10 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 cursor-pointer hover:scale-105 transition-transform shadow-lg"
          />
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        </div>
      </div>

      <!-- Brush Size -->
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-zinc-900 dark:text-zinc-300" for="brushSize">Size</label>
        <div class="flex items-center gap-2">
          <span class="text-xs text-zinc-800 dark:text-zinc-400">{brushSize}px</span>
          <input 
            id="brushSize" 
            type="range" 
            min="1" 
            max="32" 
            step="1" 
            bind:value={brushSize} 
            class="w-20 accent-purple-500"
          />
        </div>
      </div>

      <div class="flex-1"></div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 border border-red-200 dark:border-red-800/50"
          onclick={clearCanvas}
        >
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          Clear
        </button>
        <button
          class="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
          onclick={exportPNG}
        >
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
          Export PNG
        </button>
      </div>
    </div>
  </div>

  <!-- Canvas Container -->
  <div class="flex-1 card p-6 relative">
    <div class="w-full h-full rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 relative overflow-hidden" style="min-height: 500px;">
      <canvas
        bind:this={canvas}
        class="w-full h-full block touch-none cursor-crosshair"
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        style="background: white;"
      ></canvas>
    </div>
    
    <!-- Canvas Overlay Instructions -->
    {#if !drawing}
      <div class="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
        <div class="bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2">
          <p class="text-xs text-zinc-800 dark:text-zinc-400">
            Click and drag to draw • Right-click for context menu
          </p>
        </div>
        <div class="bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2">
          <p class="text-xs text-zinc-700 dark:text-zinc-500">
            Auto-saved to localStorage
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>
