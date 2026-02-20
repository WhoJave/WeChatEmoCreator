<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as fabric from 'fabric';
import type { ToolType } from '../composables/useCanvas';

interface Props {
  activeTool: ToolType;
  brushColor: string;
  brushSize: number;
  fillColor: string;
  strokeColor: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  isTransparentBg: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'canvas-ready', canvas: fabric.Canvas): void;
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
let canvas: fabric.Canvas | null = null;

// Shape drawing state
let shapeStartX = 0;
let shapeStartY = 0;
let activeShape: fabric.Rect | fabric.Ellipse | null = null;
let isDrawingShape = false;

const removeShapeListeners = () => {
  canvas?.off('mouse:down');
  canvas?.off('mouse:move');
  canvas?.off('mouse:up');
};

const applyTool = (tool: ToolType) => {
  if (!canvas) return;
  removeShapeListeners();
  canvas.isDrawingMode = false;
  canvas.selection = tool === 'select';
  canvas.defaultCursor = 'default';
  canvas.getObjects().forEach(o => { o.selectable = tool === 'select'; });

  switch (tool) {
    case 'pencil':
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = props.brushColor;
      canvas.freeDrawingBrush.width = props.brushSize;
      break;

    case 'eraser':
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = props.isTransparentBg ? 'rgba(0,0,0,0)' : (canvas.backgroundColor as string || '#ffffff');
      canvas.freeDrawingBrush.width = props.brushSize * 2;
      break;

    case 'text':
      canvas.defaultCursor = 'text';
      canvas.on('mouse:down', (opt) => {
        if (!canvas) return;
        // Don't add text if clicking existing object
        if (opt.target) return;
        const pointer = canvas.getPointer(opt.e);
        const itext = new fabric.IText('', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: props.fontFamily,
          fontSize: props.fontSize,
          fill: props.textColor,
        });
        canvas.add(itext);
        canvas.setActiveObject(itext);
        itext.enterEditing();
      });
      break;

    case 'rect':
    case 'circle':
      canvas.defaultCursor = 'crosshair';
      canvas.on('mouse:down', (opt) => {
        if (!canvas || isDrawingShape || opt.target) return;
        isDrawingShape = true;
        const pointer = canvas.getPointer(opt.e);
        shapeStartX = pointer.x;
        shapeStartY = pointer.y;

        if (tool === 'rect') {
          activeShape = new fabric.Rect({
            left: pointer.x, top: pointer.y, width: 0, height: 0,
            fill: props.fillColor, stroke: props.strokeColor, strokeWidth: 2,
            selectable: false,
          });
        } else {
          activeShape = new fabric.Ellipse({
            left: pointer.x, top: pointer.y, rx: 0, ry: 0,
            fill: props.fillColor, stroke: props.strokeColor, strokeWidth: 2,
            selectable: false,
          });
        }
        canvas.add(activeShape);
      });

      canvas.on('mouse:move', (opt) => {
        if (!isDrawingShape || !activeShape || !canvas) return;
        const p = canvas.getPointer(opt.e);
        const w = Math.abs(p.x - shapeStartX);
        const h = Math.abs(p.y - shapeStartY);
        const left = Math.min(p.x, shapeStartX);
        const top = Math.min(p.y, shapeStartY);
        if (activeShape instanceof fabric.Rect) {
          activeShape.set({ left, top, width: w, height: h });
        } else if (activeShape instanceof fabric.Ellipse) {
          activeShape.set({ left, top, rx: w / 2, ry: h / 2 });
        }
        canvas.renderAll();
      });

      canvas.on('mouse:up', () => {
        if (!isDrawingShape) return;
        isDrawingShape = false;
        if (activeShape) {
          activeShape.set({ selectable: false });
          activeShape = null;
        }
      });
      break;
  }
};

watch(() => props.activeTool, applyTool);

watch(() => [props.brushColor, props.brushSize], () => {
  if (canvas?.freeDrawingBrush && (props.activeTool === 'pencil' || props.activeTool === 'eraser')) {
    canvas.freeDrawingBrush.color = props.activeTool === 'eraser'
      ? (props.isTransparentBg ? 'rgba(0,0,0,0)' : (canvas.backgroundColor as string || '#ffffff'))
      : props.brushColor;
    canvas.freeDrawingBrush.width = props.activeTool === 'eraser' ? props.brushSize * 2 : props.brushSize;
  }
});

onMounted(() => {
  if (!canvasEl.value) return;
  canvas = new fabric.Canvas(canvasEl.value, {
    width: 240,
    height: 240,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
  });
  applyTool(props.activeTool);
  emit('canvas-ready', canvas);
});

onUnmounted(() => {
  canvas?.dispose();
});

// Expose for parent shortcut handlers (delete key etc.)
defineExpose({
  getCanvas: () => canvas,
});
</script>

<template>
  <div class="canvas-wrapper">
    <div :class="['canvas-border', { 'transparent-bg': isTransparentBg }]">
      <canvas ref="canvasEl" width="240" height="240" />
    </div>
    <div class="canvas-info">
      240 × 240 px
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.canvas-border {
  border: 2px solid #4b5563;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
  position: relative;
}

.canvas-border.transparent-bg {
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}

.canvas-info {
  font-size: 11px;
  color: #6b7280;
  letter-spacing: 0.05em;
}
</style>
