<script lang="ts">
  import { onMount } from "svelte";
  import { scale } from "svelte/transition";

  let svgElement: SVGSVGElement | null = null;
  let tool = $state("pen");
  let brushColor = $state("#10b981");
  let brushSize = $state(3);
  let isDrawing = $state(false);
  let currentPath = $state("");
  let paths = $state<string[]>([]);
  let shapes = $state<any[]>([]);
  let startX = 0;
  let startY = 0;
  let tempShape = $state<any>(null);
  let history = $state<{paths: string[], shapes: any[]}[]>([]);
  let historyIndex = $state(-1);
  let showGrid = $state(false);

  function getMousePos(e: MouseEvent) {
    if (!svgElement) return { x: 0, y: 0 };
    const rect = svgElement.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function calculateArrowHead(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const headLength = 12;

    const x3 = x2 - headLength * Math.cos(angle - Math.PI / 6);
    const y3 = y2 - headLength * Math.sin(angle - Math.PI / 6);
    const x4 = x2 - headLength * Math.cos(angle + Math.PI / 6);
    const y4 = y2 - headLength * Math.sin(angle + Math.PI / 6);

    return `${x2},${y2} ${x3},${y3} ${x4},${y4}`;
  }

  function startDrawing(e: MouseEvent) {
    isDrawing = true;
    const pos = getMousePos(e);
    startX = pos.x;
    startY = pos.y;

    if (tool === 'pen') {
      currentPath = `M ${pos.x} ${pos.y}`;
    } else if (tool === 'rectangle') {
      tempShape = {
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: brushColor,
        strokeWidth: brushSize
      };
    } else if (tool === 'circle') {
      tempShape = {
        type: 'circle',
        cx: pos.x,
        cy: pos.y,
        r: 0,
        stroke: brushColor,
        strokeWidth: brushSize
      };
    } else if (tool === 'arrow') {
      tempShape = {
        type: 'arrow',
        x1: pos.x,
        y1: pos.y,
        x2: pos.x,
        y2: pos.y,
        stroke: brushColor,
        strokeWidth: brushSize
      };
    }

    console.log("🎨 Started drawing at", pos, "with tool:", tool);
  }

  function draw(e: MouseEvent) {
    if (!isDrawing) return;

    const pos = getMousePos(e);

    if (tool === 'pen') {
      currentPath += ` L ${pos.x} ${pos.y}`;
    } else if (tool === 'rectangle' && tempShape) {
      tempShape.width = pos.x - startX;
      tempShape.height = pos.y - startY;
    } else if (tool === 'circle' && tempShape) {
      const dx = pos.x - startX;
      const dy = pos.y - startY;
      tempShape.r = Math.sqrt(dx * dx + dy * dy);
    } else if (tool === 'arrow' && tempShape) {
      tempShape.x2 = pos.x;
      tempShape.y2 = pos.y;
      tempShape.arrowHead = calculateArrowHead(tempShape.x1, tempShape.y1, tempShape.x2, tempShape.y2);
    }

    console.log("🖊️ Drawing at", pos);
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;

    if (tool === 'pen' && currentPath) {
      paths = [...paths, currentPath];
      currentPath = "";
      saveToHistory();
      console.log("✅ Added path, total paths:", paths.length);
    } else if (tempShape) {
      shapes = [...shapes, tempShape];
      tempShape = null;
      saveToHistory();
      console.log("✅ Added shape, total shapes:", shapes.length);
    }

    console.log("🛑 Stopped drawing");
  }

  function saveToHistory() {
    // Remove any future history if we're not at the end
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }

    // Add current state to history
    history = [...history, { paths: [...paths], shapes: [...shapes] }];
    historyIndex = history.length - 1;

    // Limit history to 50 steps
    if (history.length > 50) {
      history = history.slice(-50);
      historyIndex = history.length - 1;
    }
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      const state = history[historyIndex];
      paths = [...state.paths];
      shapes = [...state.shapes];
      console.log("↶ Undo - step", historyIndex);
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      const state = history[historyIndex];
      paths = [...state.paths];
      shapes = [...state.shapes];
      console.log("↷ Redo - step", historyIndex);
    }
  }

  function setTool(newTool: string) {
    tool = newTool;
    console.log("🔧 Tool changed to:", tool);
  }

  function setBrushColor(color: string) {
    brushColor = color;
    console.log("🎨 Color changed to:", color);
  }

  function setBrushSize(size: number) {
    brushSize = size;
    console.log("📏 Size changed to:", size);
  }

  // These functions are no longer needed since shapes are drawn interactively






  function clearCanvas() {
    paths = [];
    shapes = [];
    currentPath = "";
    tempShape = null;
    saveToHistory();
    console.log("🧹 Canvas cleared");
  }

  function toggleGrid() {
    showGrid = !showGrid;
    console.log("🔲 Grid toggled:", showGrid);
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
        case 'g':
          e.preventDefault();
          toggleGrid();
          break;
      }
    }

    // Tool shortcuts
    switch (e.key) {
      case '1':
        setTool('pen');
        break;
      case '2':
        setTool('rectangle');
        break;
      case '3':
        setTool('circle');
        break;
      case '4':
        setTool('arrow');
        break;
    }
  }

  function exportPNG() {
    if (!svgElement) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const dataURL = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = 'canvas.png';
      a.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;

    console.log("💾 Exporting canvas as PNG");
  }

  onMount(() => {
    console.log("🚀 Canvas component mounted");

    // Initialize history with empty state
    saveToHistory();

    if (svgElement) {
      svgElement.addEventListener('mousedown', startDrawing);
      svgElement.addEventListener('mousemove', draw);
      svgElement.addEventListener('mouseup', stopDrawing);
      svgElement.addEventListener('mouseleave', stopDrawing);
      console.log("✅ Event listeners attached to SVG");
    }

    // Add keyboard shortcuts
    window.addEventListener('keydown', handleKeydown);

    return () => {
      if (svgElement) {
        svgElement.removeEventListener('mousedown', startDrawing);
        svgElement.removeEventListener('mousemove', draw);
        svgElement.removeEventListener('mouseup', stopDrawing);
        svgElement.removeEventListener('mouseleave', stopDrawing);
      }
      window.removeEventListener('keydown', handleKeydown);
      console.log("🧹 Event listeners removed");
    };
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
          onclick={() => setTool('pen')}
        >
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
          </svg>
          Pen
          <span class="text-xs opacity-60 ml-1">1</span>
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all {tool === 'rectangle' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
          onclick={() => setTool('rectangle')}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
          Rectangle
          <span class="text-xs opacity-60 ml-1">2</span>
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all {tool === 'circle' ? 'bg-green-500 text-white shadow-lg shadow-green-500/25' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
          onclick={() => setTool('circle')}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Circle
          <span class="text-xs opacity-60 ml-1">3</span>
        </button>
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all {tool === 'arrow' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
          onclick={() => setTool('arrow')}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12,5 19,12 12,19"/>
          </svg>
          Arrow
          <span class="text-xs opacity-60 ml-1">4</span>
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
            onchange={() => setBrushColor(brushColor)}
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
            oninput={() => setBrushSize(brushSize)}
            class="w-20 accent-purple-500"
          />
        </div>
      </div>

      <div class="flex-1"></div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Undo/Redo -->
        <div class="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
          <button
            class="text-sm px-2 py-1.5 rounded transition-all {historyIndex > 0 ? 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'}"
            onclick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
          <button
            class="text-sm px-2 py-1.5 rounded transition-all {historyIndex < history.length - 1 ? 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'}"
            onclick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>

        <!-- Grid Toggle -->
        <button
          class="text-sm px-3 py-2 rounded-lg transition-all {showGrid ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
          onclick={toggleGrid}
          title="Toggle Grid (Ctrl+G)"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
        </button>

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
      <svg
        bind:this={svgElement}
        class="w-full h-full border border-zinc-300 dark:border-zinc-600 rounded-lg shadow-lg bg-white cursor-crosshair"
        style="min-height: 500px;"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Grid Pattern Definition -->
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
          </pattern>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="white" />

        <!-- Grid (optional) -->
        {#if showGrid}
          <rect width="100%" height="100%" fill="url(#grid)" />
        {/if}

        <!-- Draw all completed paths -->
        {#each paths as path}
          <path
            d={path}
            stroke={brushColor}
            stroke-width={brushSize}
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/each}

        <!-- Draw current path being drawn -->
        {#if currentPath && isDrawing}
          <path
            d={currentPath}
            stroke={brushColor}
            stroke-width={brushSize}
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}

        <!-- Draw all shapes -->
        {#each shapes as shape}
          {#if shape.type === 'rectangle'}
            <rect
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              stroke={shape.stroke}
              stroke-width={shape.strokeWidth}
              fill="none"
            />
          {:else if shape.type === 'circle'}
            <circle
              cx={shape.cx}
              cy={shape.cy}
              r={shape.r}
              stroke={shape.stroke}
              stroke-width={shape.strokeWidth}
              fill="none"
            />
          {:else if shape.type === 'arrow'}
            <g>
              <line
                x1={shape.x1}
                y1={shape.y1}
                x2={shape.x2}
                y2={shape.y2}
                stroke={shape.stroke}
                stroke-width={shape.strokeWidth}
              />
              <!-- Dynamic arrowhead based on direction -->
              {#if shape.arrowHead}
                <polygon
                  points={shape.arrowHead}
                  fill={shape.stroke}
                />
              {/if}
            </g>
          {/if}
        {/each}

        <!-- Draw temporary shape while drawing -->
        {#if tempShape && isDrawing}
          {#if tempShape.type === 'rectangle'}
            <rect
              x={tempShape.x}
              y={tempShape.y}
              width={tempShape.width}
              height={tempShape.height}
              stroke={tempShape.stroke}
              stroke-width={tempShape.strokeWidth}
              fill="none"
              opacity="0.7"
            />
          {:else if tempShape.type === 'circle'}
            <circle
              cx={tempShape.cx}
              cy={tempShape.cy}
              r={tempShape.r}
              stroke={tempShape.stroke}
              stroke-width={tempShape.strokeWidth}
              fill="none"
              opacity="0.7"
            />
          {:else if tempShape.type === 'arrow'}
            <g opacity="0.7">
              <line
                x1={tempShape.x1}
                y1={tempShape.y1}
                x2={tempShape.x2}
                y2={tempShape.y2}
                stroke={tempShape.stroke}
                stroke-width={tempShape.strokeWidth}
              />
              <!-- Dynamic arrowhead for temp shape -->
              {#if tempShape.arrowHead}
                <polygon
                  points={tempShape.arrowHead}
                  fill={tempShape.stroke}
                />
              {/if}
            </g>
          {/if}
        {/if}
      </svg>
    </div>
    
    <!-- Canvas Overlay Instructions -->
    {#if !isDrawing}
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
