<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as fabric from 'fabric';
import ToolPanel from './components/ToolPanel.vue';
import EditorCanvas from './components/EditorCanvas.vue';
import AssetLibrary from './components/AssetLibrary.vue';
import TimelineEditor from './components/TimelineEditor.vue';
import { useCanvas } from './composables/useCanvas';
import { useFrames } from './composables/useFrames';
import { GifGenerator } from './utils/gifGenerator';
import { checkCompliance } from './utils/complianceChecker';

const canvasHolder = useCanvas();
const framesHolder = useFrames();
const {
  activeTool, brushColor, brushSize, fillColor, strokeColor,
  fontSize, fontFamily, textColor, isTransparentBg,
  setCanvas, setTool, undo, redo, canUndo, canRedo,
  addImageToCanvas, setBgTransparent, clearCanvas, deleteSelected,
  updateBrush, exportPng, getCanvasJSON, loadCanvasJSON,
} = canvasHolder;

const {
  frames, addFrame, deleteFrame, duplicateFrame,
  reorderFrames, updateDelay, setAllDelays,
} = framesHolder;

// Preview state
const isPreviewOpen = ref(false);
const previewCurrentUrl = ref<string | null>(null);
let previewAnimation: ReturnType<typeof setTimeout> | null = null;

// Export state
const isExporting = ref(false);
const exportProgress = ref(0);
const exportError = ref<string | null>(null);
const complianceWarnings = ref<string[]>([]);

// ── Canvas setup ──────────────────────────────────────────────────────────────
const onCanvasReady = (canvas: fabric.Canvas) => {
  setCanvas(canvas);
};

// ── Frame management ──────────────────────────────────────────────────────────
const captureFrame = () => {
  if (frames.value.length >= 10) return;
  const dataUrl = exportPng();
  const json = getCanvasJSON();
  addFrame(dataUrl, json);
};

const onSelectFrame = async (id: string) => {
  const frame = frames.value.find(f => f.id === id);
  if (!frame) return;
  await loadCanvasJSON(frame.fabricJson);
};

// ── Asset added to canvas ─────────────────────────────────────────────────────
const onAddToCanvas = (dataUrl: string) => {
  addImageToCanvas(dataUrl);
};

// ── Background toggle ─────────────────────────────────────────────────────────
const toggleBg = () => {
  setBgTransparent(!isTransparentBg.value);
};

// ── Preview ───────────────────────────────────────────────────────────────────
const startPreview = () => {
  if (frames.value.length === 0) return;
  isPreviewOpen.value = true;
  let idx = 0;
  const loop = () => {
    if (!isPreviewOpen.value) return;
    const frame = frames.value[idx % frames.value.length];
    if (!frame) return;
    previewCurrentUrl.value = frame.dataUrl;
    previewAnimation = setTimeout(() => {
      idx++;
      loop();
    }, frame.delay);
  };
  loop();
};

const stopPreview = () => {
  isPreviewOpen.value = false;
  previewCurrentUrl.value = null;
  if (previewAnimation) clearTimeout(previewAnimation);
};

// ── Export ────────────────────────────────────────────────────────────────────
const exportEmoji = async () => {
  exportError.value = null;
  complianceWarnings.value = [];

  if (frames.value.length === 0) {
    // Static PNG export
    const dataUrl = exportPng();
    const link = document.createElement('a');
    link.download = 'emoji.png';
    link.href = dataUrl;
    link.click();
    return;
  }

  // Compliance check
  const compliance = checkCompliance(frames.value);
  if (compliance.warnings.length > 0) {
    complianceWarnings.value = compliance.warnings;
  }

  isExporting.value = true;
  exportProgress.value = 0;

  try {
    const gif = new GifGenerator({
      width: 240,
      height: 240,
      quality: 8,
      workers: 2,
      onProgress: (p: number) => { exportProgress.value = Math.round(p * 100); },
    });

    for (const frame of frames.value) {
      const img = new Image();
      img.src = frame.dataUrl;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      gif.addFrame(img, frame.delay);
    }

    const blob = await gif.render();
    const sizeKB = blob.size / 1024;
    if (sizeKB > 500) {
      complianceWarnings.value.push(`GIF size ${sizeKB.toFixed(0)}KB exceeds WeChat 500KB limit.`);
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'emoji.gif';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e: unknown) {
    exportError.value = e instanceof Error ? e.message : 'Export failed';
  } finally {
    isExporting.value = false;
  }
};

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
const handleKeyDown = (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault();
    undo();
  } else if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
    e.preventDefault();
    redo();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteSelected();
  }
};

// ── Tool Panel event handlers ─────────────────────────────────────────────────
const onBrushColorChange = (v: string) => { brushColor.value = v; updateBrush(); };
const onBrushSizeChange = (v: number) => { brushSize.value = v; updateBrush(); };
const onFillColorChange = (v: string) => { fillColor.value = v; };
const onStrokeColorChange = (v: string) => { strokeColor.value = v; };
const onFontSizeChange = (v: number) => { fontSize.value = v; };
const onTextColorChange = (v: string) => { textColor.value = v; };

onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
</script>

<template>
  <div id="app-root">
    <!-- ─── Header ─────────────────────────────────────────────────────── -->
    <header class="app-header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">🎭</span>
          <span class="logo-text">WeChat <em>Emoji</em> Creator</span>
        </div>
      </div>

      <div class="header-center">
        <!-- Undo/Redo -->
        <button class="hdr-btn" :disabled="!canUndo()" title="Undo (Ctrl+Z)" @click="undo">
          ↩ Undo
        </button>
        <button class="hdr-btn" :disabled="!canRedo()" title="Redo (Ctrl+Y)" @click="redo">
          ↪ Redo
        </button>
      </div>

      <div class="header-right">
        <!-- Warnings -->
        <div v-if="complianceWarnings.length > 0" class="warnings-badge" :title="complianceWarnings.join('\n')">
          ⚠️ {{ complianceWarnings.length }} warning{{ complianceWarnings.length > 1 ? 's' : '' }}
        </div>

        <!-- Preview -->
        <button
          class="hdr-btn"
          :disabled="frames.length === 0"
          :class="{ 'hdr-btn-active': isPreviewOpen }"
          @click="isPreviewOpen ? stopPreview() : startPreview()"
        >
          {{ isPreviewOpen ? '⏹ Stop' : '▶ Preview' }}
        </button>

        <!-- Export -->
        <button class="hdr-btn export-btn" :disabled="isExporting" @click="exportEmoji">
          <span v-if="isExporting" class="spinning">⟳</span>
          <span v-else>⬇</span>
          <span>{{ isExporting ? `${exportProgress}%` : (frames.length ? 'Export GIF' : 'Export PNG') }}</span>
        </button>
      </div>
    </header>

    <!-- ─── Export Progress ────────────────────────────────────────────── -->
    <div v-if="isExporting" class="export-progress-bar">
      <div class="export-progress-fill" :style="{ width: exportProgress + '%' }" />
    </div>

    <!-- ─── Export Error ───────────────────────────────────────────────── -->
    <div v-if="exportError" class="export-error" @click="exportError = null">
      ❌ {{ exportError }} (click to dismiss)
    </div>

    <!-- ─── Main Layout ────────────────────────────────────────────────── -->
    <div class="app-body">
      <!-- Left: Tool Panel -->
      <ToolPanel
        :active-tool="activeTool"
        :brush-color="brushColor"
        :brush-size="brushSize"
        :fill-color="fillColor"
        :stroke-color="strokeColor"
        :font-size="fontSize"
        :text-color="textColor"
        :is-transparent-bg="isTransparentBg"
        @set-tool="setTool"
        @update:brushColor="onBrushColorChange"
        @update:brushSize="onBrushSizeChange"
        @update:fillColor="onFillColorChange"
        @update:strokeColor="onStrokeColorChange"
        @update:fontSize="onFontSizeChange"
        @update:textColor="onTextColorChange"
        @toggle-bg="toggleBg"
        @clear="clearCanvas"
        @delete-selected="deleteSelected"
      />

      <!-- Center: Canvas + Timeline -->
      <div class="canvas-column">
        <div class="canvas-area">
          <EditorCanvas
            :active-tool="activeTool"
            :brush-color="brushColor"
            :brush-size="brushSize"
            :fill-color="fillColor"
            :stroke-color="strokeColor"
            :font-size="fontSize"
            :font-family="fontFamily"
            :text-color="textColor"
            :is-transparent-bg="isTransparentBg"
            @canvas-ready="onCanvasReady"
          />
        </div>

        <!-- Timeline -->
        <div class="timeline-area">
          <TimelineEditor
            :frames="frames"
            @add-frame="captureFrame"
            @delete-frame="deleteFrame"
            @duplicate-frame="duplicateFrame"
            @reorder-frames="reorderFrames"
            @update-delay="updateDelay"
            @set-all-delays="setAllDelays"
            @select-frame="onSelectFrame"
            @play="startPreview"
          />
        </div>
      </div>

      <!-- Right: Asset Library -->
      <AssetLibrary @add-to-canvas="onAddToCanvas" />
    </div>

    <!-- ─── Preview Overlay ────────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="isPreviewOpen" class="preview-overlay" @click.self="stopPreview">
        <div class="preview-card">
          <div class="preview-header">
            <span>Animation Preview</span>
            <button class="preview-close" @click="stopPreview">✕</button>
          </div>
          <div class="preview-canvas-wrap checkered">
            <img v-if="previewCurrentUrl" :src="previewCurrentUrl" class="preview-img" />
          </div>
          <div class="preview-info">
            {{ frames.length }} frames · {{ (frames.reduce((a,f)=>a+f.delay,0)/1000).toFixed(1) }}s total
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
/* Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; }

html, body, #app {
  margin: 0; padding: 0;
  width: 100%; height: 100%;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
  background: #0a0a14;
  color: #e2e8f0;
}
</style>

<style scoped>
#app-root {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ── Header ── */
.app-header {
  height: 52px;
  background: #111827;
  border-bottom: 1px solid #1f2937;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 12px;
  flex-shrink: 0;
  z-index: 10;
}

.header-left, .header-right, .header-center {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-left { min-width: 220px; }
.header-right { min-width: 220px; justify-content: flex-end; }

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-icon { font-size: 22px; }
.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #e5e7eb;
  letter-spacing: -0.02em;
}
.logo-text em {
  font-style: normal;
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hdr-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #d1d5db;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.hdr-btn:hover:not(:disabled) {
  background: #374151;
  color: #fff;
}
.hdr-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.hdr-btn-active {
  background: #374151;
  border-color: #6b7280;
}

.export-btn {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  border-color: #6d28d9;
  color: #fff;
}
.export-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
}

.warnings-badge {
  font-size: 11px;
  padding: 4px 8px;
  background: #78350f;
  color: #fcd34d;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

/* Progress bar */
.export-progress-bar {
  height: 3px;
  background: #1f2937;
  flex-shrink: 0;
}
.export-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #60a5fa);
  transition: width 0.3s ease;
}

.export-error {
  background: #450a0a;
  color: #fca5a5;
  font-size: 12px;
  padding: 6px 16px;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Body ── */
.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ── Canvas Column ── */
.canvas-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0d1117;
}

.canvas-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  background-image:
    radial-gradient(circle at 1px 1px, #1f2937 1px, transparent 0);
  background-size: 24px 24px;
  position: relative;
  overflow: hidden;
}

.timeline-area {
  height: 148px;
  flex-shrink: 0;
}

/* ── Preview overlay ── */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.preview-card {
  background: #111827;
  border: 1px solid #374151;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 300px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.preview-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 700;
  color: #e5e7eb;
}
.preview-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #374151;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-close:hover { background: #4b5563; color: #fff; }

.preview-canvas-wrap {
  width: 240px;
  height: 240px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #374151;
}
.checkered {
  background-image:
    linear-gradient(45deg, #374151 25%, transparent 25%),
    linear-gradient(-45deg, #374151 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #374151 75%),
    linear-gradient(-45deg, transparent 75%, #374151 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}
.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.preview-info {
  font-size: 12px;
  color: #6b7280;
}

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Spinning icon */
.spinning {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
