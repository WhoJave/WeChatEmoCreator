<script setup lang="ts">
import type { ToolType } from '../composables/useCanvas';

const props = defineProps<{
  activeTool: ToolType;
  brushColor: string;
  brushSize: number;
  fillColor: string;
  strokeColor: string;
  fontSize: number;
  textColor: string;
  isTransparentBg: boolean;
}>();

const emit = defineEmits<{
  (e: 'set-tool', tool: ToolType): void;
  (e: 'update:brushColor', value: string): void;
  (e: 'update:brushSize', value: number): void;
  (e: 'update:fillColor', value: string): void;
  (e: 'update:strokeColor', value: string): void;
  (e: 'update:fontSize', value: number): void;
  (e: 'update:textColor', value: string): void;
  (e: 'toggle-bg'): void;
  (e: 'clear'): void;
  (e: 'delete-selected'): void;
}>();

interface Tool {
  id: ToolType;
  label: string;
  icon: string;
}

const tools: Tool[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pencil', label: 'Pencil', icon: '✏️' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'rect', label: 'Rectangle', icon: '▭' },
  { id: 'circle', label: 'Ellipse', icon: '◯' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
];
</script>

<template>
  <div class="tool-panel">
    <!-- Tool Buttons -->
    <div class="tools-section">
      <button
        v-for="tool in tools"
        :key="tool.id"
        :title="tool.label"
        :class="['tool-btn', { active: activeTool === tool.id }]"
        @click="emit('set-tool', tool.id)"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
        <span class="tool-label">{{ tool.label }}</span>
      </button>
    </div>

    <div class="divider" />

    <!-- Contextual Options -->
    <div class="options-section">
      <!-- Pencil / Eraser options -->
      <template v-if="activeTool === 'pencil' || activeTool === 'eraser'">
        <div class="option-group">
          <label class="opt-label">Color</label>
          <input
            type="color"
            :value="brushColor"
            class="color-picker"
            @input="emit('update:brushColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="option-group">
          <label class="opt-label">Size</label>
          <input
            type="range" min="1" max="40" :value="brushSize"
            class="slider"
            @input="emit('update:brushSize', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="opt-value">{{ brushSize }}px</span>
        </div>
      </template>

      <!-- Text options -->
      <template v-if="activeTool === 'text'">
        <div class="option-group">
          <label class="opt-label">Color</label>
          <input
            type="color"
            :value="textColor"
            class="color-picker"
            @input="emit('update:textColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="option-group">
          <label class="opt-label">Size</label>
          <input
            type="range" min="8" max="80" :value="fontSize"
            class="slider"
            @input="emit('update:fontSize', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="opt-value">{{ fontSize }}px</span>
        </div>
      </template>

      <!-- Shape options -->
      <template v-if="activeTool === 'rect' || activeTool === 'circle'">
        <div class="option-group">
          <label class="opt-label">Fill</label>
          <input
            type="color"
            :value="fillColor"
            class="color-picker"
            @input="emit('update:fillColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="option-group">
          <label class="opt-label">Stroke</label>
          <input
            type="color"
            :value="strokeColor"
            class="color-picker"
            @input="emit('update:strokeColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </template>

      <!-- Select options -->
      <template v-if="activeTool === 'select'">
        <button class="action-btn danger" title="Delete selected" @click="emit('delete-selected')">
          🗑 Delete
        </button>
      </template>
    </div>

    <div class="divider" />

    <!-- Canvas Actions -->
    <div class="actions-section">
      <button
        :class="['action-btn', { 'active-bg': isTransparentBg }]"
        title="Toggle transparent background"
        @click="emit('toggle-bg')"
      >
        {{ isTransparentBg ? '🔲' : '⬜' }}
        <span class="tool-label">BG</span>
      </button>
      <button class="action-btn danger" title="Clear canvas" @click="emit('clear')">
        <span>🧹</span>
        <span class="tool-label">Clear</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tool-panel {
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #1a1a2e;
  border-right: 1px solid #2d2d44;
  padding: 8px 0;
  gap: 4px;
  height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
}

.tools-section, .actions-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  padding: 0 6px;
}

.options-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
}

.tool-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 7px 4px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 10px;
}
.tool-btn:hover {
  background: #2d2d44;
  color: #fff;
}
.tool-btn.active {
  background: #7c3aed;
  color: #fff;
  border-color: #9d61f5;
}
.tool-icon {
  font-size: 16px;
  line-height: 1;
}
.tool-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  opacity: 0.8;
}

.divider {
  width: 50px;
  height: 1px;
  background: #2d2d44;
  margin: 4px 0;
  flex-shrink: 0;
}

.option-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}
.opt-label {
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.opt-value {
  font-size: 9px;
  color: #9ca3af;
}
.color-picker {
  width: 36px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}
.slider {
  width: 54px;
  accent-color: #7c3aed;
}

.action-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 7px 4px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
}
.action-btn:hover {
  background: #2d2d44;
  color: #fff;
}
.action-btn.danger:hover {
  background: #3b1a1a;
  color: #f87171;
}
.action-btn.active-bg {
  color: #7c3aed;
}
</style>
