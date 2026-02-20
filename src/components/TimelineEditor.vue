<script setup lang="ts">
import { ref } from 'vue';
import type { Frame } from '../composables/useFrames';

const props = defineProps<{
  frames: Frame[];
}>();

const emit = defineEmits<{
  (e: 'add-frame'): void;
  (e: 'delete-frame', id: string): void;
  (e: 'duplicate-frame', id: string): void;
  (e: 'reorder-frames', fromIndex: number, toIndex: number): void;
  (e: 'update-delay', id: string, delay: number): void;
  (e: 'set-all-delays', delay: number): void;
  (e: 'select-frame', id: string): void;
  (e: 'play'): void;
}>();

const selectedFrameId = ref<string | null>(null);
const globalDelay = ref(100);

// Drag-to-reorder state
const dragFromIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const selectFrame = (id: string) => {
  selectedFrameId.value = id;
  emit('select-frame', id);
};

const onDragStart = (index: number) => {
  dragFromIndex.value = index;
};

const onDragOver = (e: DragEvent, index: number) => {
  e.preventDefault();
  dragOverIndex.value = index;
};

const onDrop = (toIndex: number) => {
  if (dragFromIndex.value === null || dragFromIndex.value === toIndex) {
    dragFromIndex.value = null;
    dragOverIndex.value = null;
    return;
  }
  emit('reorder-frames', dragFromIndex.value, toIndex);
  dragFromIndex.value = null;
  dragOverIndex.value = null;
};

const onDragEnd = () => {
  dragFromIndex.value = null;
  dragOverIndex.value = null;
};

const applyGlobalDelay = () => {
  emit('set-all-delays', globalDelay.value);
};

const totalDuration = () => props.frames.reduce((s, f) => s + f.delay, 0);
</script>

<template>
  <div class="timeline">
    <!-- Toolbar Row -->
    <div class="timeline-toolbar">
      <div class="frame-counter">
        <span :class="{ warn: frames.length >= 8 }">
          {{ frames.length }}/10 frames
        </span>
        <span class="duration">{{ (totalDuration() / 1000).toFixed(1) }}s</span>
      </div>

      <div class="timeline-controls">
        <label class="global-delay-label">All delay</label>
        <input
          type="number"
          v-model.number="globalDelay"
          min="10" max="2000" step="10"
          class="global-delay-input"
          @change="applyGlobalDelay"
        />
        <span class="ms-label">ms</span>

        <button
          class="ctrl-btn play-btn"
          :disabled="frames.length === 0"
          @click="emit('play')"
        >▶ Play</button>

        <button
          class="ctrl-btn add-btn"
          :disabled="frames.length >= 10"
          @click="emit('add-frame')"
          title="Capture current canvas as new frame"
        >+ Frame</button>
      </div>
    </div>

    <!-- Frame Strip -->
    <div class="frame-strip">
      <div v-if="frames.length === 0" class="empty-strip">
        Draw something then click "+ Frame" to capture it
      </div>

      <div
        v-for="(frame, index) in frames"
        :key="frame.id"
        :class="[
          'frame-card',
          { 'selected': selectedFrameId === frame.id },
          { 'drag-over': dragOverIndex === index && dragFromIndex !== index },
        ]"
        draggable="true"
        @click="selectFrame(frame.id)"
        @dragstart="onDragStart(index)"
        @dragover="onDragOver($event, index)"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <!-- Frame Number -->
        <div class="frame-number">{{ index + 1 }}</div>

        <!-- Thumbnail -->
        <div class="frame-thumb-wrap checkered">
          <img :src="frame.dataUrl" class="frame-thumb" />
        </div>

        <!-- Delay Input -->
        <div class="frame-delay">
          <input
            type="number"
            :value="frame.delay"
            min="10" max="5000" step="10"
            class="delay-input"
            @click.stop
            @change="emit('update-delay', frame.id, Number(($event.target as HTMLInputElement).value))"
          />
          <span class="ms">ms</span>
        </div>

        <!-- Hover Actions -->
        <div class="frame-actions">
          <button
            class="frame-action-btn"
            title="Duplicate frame"
            @click.stop="emit('duplicate-frame', frame.id)"
          >⧉</button>
          <button
            class="frame-action-btn delete"
            title="Delete frame"
            @click.stop="emit('delete-frame', frame.id)"
          >×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f172a;
  border-top: 1px solid #1e293b;
}

.timeline-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #1e293b;
  gap: 8px;
  flex-shrink: 0;
}

.frame-counter {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}
.frame-counter span.warn {
  color: #f59e0b;
}
.duration {
  font-size: 11px;
  color: #4b5563;
  font-weight: 400;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.global-delay-label {
  font-size: 11px;
  color: #6b7280;
}
.global-delay-input {
  width: 52px;
  font-size: 11px;
  padding: 3px 5px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #e2e8f0;
  text-align: center;
}
.ms-label {
  font-size: 11px;
  color: #6b7280;
  margin-right: 6px;
}

.ctrl-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.play-btn {
  background: #1d4ed8;
  color: #fff;
  border-color: #2563eb;
}
.play-btn:hover:not(:disabled) {
  background: #2563eb;
}
.add-btn {
  background: #374151;
  color: #e5e7eb;
  border-color: #4b5563;
}
.add-btn:hover:not(:disabled) {
  background: #4b5563;
}

/* Strip */
.frame-strip {
  flex: 1;
  overflow-x: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}
.empty-strip {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #374151;
}

.frame-card {
  flex-shrink: 0;
  position: relative;
  cursor: pointer;
  border-radius: 8px;
  border: 2px solid #1e293b;
  background: #1e293b;
  transition: border-color 0.15s, transform 0.1s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
}
.frame-card:hover {
  border-color: #4b5563;
}
.frame-card.selected {
  border-color: #7c3aed;
}
.frame-card.drag-over {
  border-color: #06b6d4;
  transform: scale(1.05);
}

.frame-number {
  font-size: 10px;
  color: #6b7280;
  font-weight: 700;
}

.frame-thumb-wrap {
  width: 72px;
  height: 72px;
  border-radius: 4px;
  overflow: hidden;
}
.checkered {
  background-image:
    linear-gradient(45deg, #374151 25%, transparent 25%),
    linear-gradient(-45deg, #374151 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #374151 75%),
    linear-gradient(-45deg, transparent 75%, #374151 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}
.frame-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.frame-delay {
  display: flex;
  align-items: center;
  gap: 2px;
}
.delay-input {
  width: 42px;
  font-size: 10px;
  text-align: center;
  padding: 2px 4px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #94a3b8;
}
.ms {
  font-size: 9px;
  color: #4b5563;
}

.frame-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: none;
  gap: 2px;
}
.frame-card:hover .frame-actions {
  display: flex;
}
.frame-action-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #374151;
  color: #e5e7eb;
  line-height: 1;
}
.frame-action-btn:hover {
  background: #4b5563;
}
.frame-action-btn.delete:hover {
  background: #dc2626;
  color: #fff;
}
</style>
