<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useStorage, type StoredAsset } from '../composables/useStorage';

const emit = defineEmits<{
  (e: 'add-to-canvas', dataUrl: string): void;
}>();

const { saveAsset, loadAllAssets, deleteAsset, clearAllAssets } = useStorage();
const assets = ref<StoredAsset[]>([]);
const dragOver = ref(false);
const activeTab = ref<'uploads' | 'stickers'>('uploads');
const isLoading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Built-in sticker emoji list
const stickers = [
  '😂', '🥰', '😭', '🤣', '😍', '🤩', '😎', '🥳',
  '😅', '😇', '🤔', '🙃', '😜', '🤪', '😤', '🥺',
  '😡', '🤯', '🥸', '🤗', '😏', '😒', '🙄', '😬',
  '🤭', '🫠', '😴', '🤤',
];

const loadAssets = async () => {
  isLoading.value = true;
  try {
    assets.value = await loadAllAssets();
  } finally {
    isLoading.value = false;
  }
};

const processImageFile = async (file: File) => {
  return new Promise<void>((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result) return resolve();
      const asset: StoredAsset = {
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        dataUrl: e.target.result as string,
        type: 'image',
        createdAt: Date.now(),
      };
      await saveAsset(asset);
      assets.value.unshift(asset);
      resolve();
    };
    reader.readAsDataURL(file);
  });
};

const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  dragOver.value = false;
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
  for (const file of files) {
    await processImageFile(file);
  }
};

const handleFileInput = async (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  for (const file of files) {
    if (file.type.startsWith('image/')) await processImageFile(file);
  }
  if (fileInput.value) fileInput.value.value = '';
};

const removeAsset = async (id: string) => {
  await deleteAsset(id);
  assets.value = assets.value.filter(a => a.id !== id);
};

const clearAll = async () => {
  await clearAllAssets();
  assets.value = [];
};

// Click sticker → render emoji to canvas
const addStickerToCanvas = (emoji: string) => {
  const size = 120;
  const cvs = document.createElement('canvas');
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext('2d')!;
  ctx.font = `${size * 0.75}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + 4);
  emit('add-to-canvas', cvs.toDataURL());
};

onMounted(loadAssets);
</script>

<template>
  <div class="asset-panel">
    <!-- Header -->
    <div class="panel-header">
      <h3 class="panel-title">Assets</h3>
      <span class="asset-count">{{ assets.length }}</span>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'uploads' }]" @click="activeTab = 'uploads'">
        Uploads
      </button>
      <button :class="['tab', { active: activeTab === 'stickers' }]" @click="activeTab = 'stickers'">
        Stickers
      </button>
    </div>

    <!-- Uploads Tab -->
    <template v-if="activeTab === 'uploads'">
      <!-- Upload Zone -->
      <div
        class="drop-zone"
        :class="{ 'drag-active': dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop="handleDrop"
        @click="fileInput?.click()"
      >
        <div class="drop-icon">📁</div>
        <div class="drop-text">Drop images or click</div>
        <input
          ref="fileInput" type="file" accept="image/*" multiple
          class="hidden-input"
          @change="handleFileInput"
        />
      </div>

      <!-- Asset Grid -->
      <div class="asset-grid">
        <div v-if="isLoading" class="empty-state">Loading…</div>
        <div v-else-if="assets.length === 0" class="empty-state">No uploads yet</div>

        <div
          v-for="asset in assets"
          :key="asset.id"
          class="asset-item"
          :title="asset.name"
          @click="emit('add-to-canvas', asset.dataUrl)"
        >
          <img :src="asset.dataUrl" class="asset-thumb" />
          <button
            class="remove-btn"
            title="Remove"
            @click.stop="removeAsset(asset.id)"
          >×</button>
        </div>
      </div>

      <!-- Footer -->
      <div class="panel-footer" v-if="assets.length > 0">
        <button class="clear-btn" @click="clearAll">🗑 Clear all</button>
      </div>
    </template>

    <!-- Stickers Tab -->
    <template v-if="activeTab === 'stickers'">
      <div class="sticker-grid">
        <button
          v-for="emoji in stickers"
          :key="emoji"
          class="sticker-btn"
          :title="emoji"
          @click="addStickerToCanvas(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.asset-panel {
  width: 200px;
  display: flex;
  flex-direction: column;
  background: #111827;
  border-left: 1px solid #1f2937;
  height: 100%;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  border-bottom: 1px solid #1f2937;
}
.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: #e5e7eb;
  margin: 0;
}
.asset-count {
  font-size: 11px;
  background: #374151;
  color: #9ca3af;
  padding: 2px 7px;
  border-radius: 10px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #1f2937;
}
.tab {
  flex: 1;
  padding: 8px 0;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  border-bottom: 2px solid transparent;
}
.tab.active {
  color: #a78bfa;
  border-bottom-color: #a78bfa;
}
.tab:hover:not(.active) {
  color: #d1d5db;
}

.drop-zone {
  margin: 10px 10px 6px;
  border: 1.5px dashed #374151;
  border-radius: 8px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.drop-zone:hover, .drop-zone.drag-active {
  background: #1f2937;
  border-color: #7c3aed;
}
.drop-icon { font-size: 20px; }
.drop-text { font-size: 10px; color: #6b7280; }
.hidden-input { display: none; }

.asset-grid {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  align-content: start;
}
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: #4b5563;
  font-size: 12px;
  padding: 20px 0;
}
.asset-item {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 1.5px solid #1f2937;
  background: #1f2937;
  aspect-ratio: 1;
  transition: border-color 0.15s;
}
.asset-item:hover {
  border-color: #7c3aed;
}
.asset-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.85);
  color: #fff;
  font-size: 11px;
  border: none;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.asset-item:hover .remove-btn {
  display: flex;
}

.panel-footer {
  padding: 6px 10px;
  border-top: 1px solid #1f2937;
}
.clear-btn {
  width: 100%;
  font-size: 11px;
  padding: 5px 0;
  background: transparent;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
}
.clear-btn:hover {
  background: #1f2937;
  color: #f87171;
  border-color: #f87171;
}

/* Sticker grid */
.sticker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 10px;
  overflow-y: auto;
  flex: 1;
}
.sticker-btn {
  font-size: 22px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: #1f2937;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}
.sticker-btn:hover {
  background: #2d2d44;
  border-color: #7c3aed;
  transform: scale(1.1);
}
</style>
