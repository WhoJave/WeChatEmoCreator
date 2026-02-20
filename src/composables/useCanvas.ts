import { ref } from 'vue';
import * as fabric from 'fabric';

export type ToolType = 'select' | 'pencil' | 'text' | 'rect' | 'circle' | 'eraser';

export function useCanvas() {
    const activeTool = ref<ToolType>('select');
    const brushColor = ref('#000000');
    const brushSize = ref(6);
    const fillColor = ref('#ff6b6b');
    const strokeColor = ref('#333333');
    const fontSize = ref(32);
    const fontFamily = ref('Arial');
    const textColor = ref('#333333');
    const isTransparentBg = ref(false);

    let canvas: fabric.Canvas | null = null;
    let _history: string[] = [];
    let _historyIndex = -1;
    let _isRestoringHistory = false;

    // Shape drawing state
    let _shapeStartX = 0;
    let _shapeStartY = 0;
    let _activeShape: fabric.Rect | fabric.Ellipse | null = null;
    let _isDrawingShape = false;

    const _saveHistory = () => {
        if (!canvas || _isRestoringHistory) return;
        if (_historyIndex < _history.length - 1) {
            _history = _history.slice(0, _historyIndex + 1);
        }
        _history.push(JSON.stringify(canvas.toJSON()));
        _historyIndex = _history.length - 1;
        if (_history.length > 50) {
            _history.shift();
            _historyIndex--;
        }
    };

    const _removeShapeListeners = () => {
        if (!canvas) return;
        canvas.off('mouse:down');
        canvas.off('mouse:move');
        canvas.off('mouse:up');
    };

    const _applyTool = (tool: ToolType) => {
        if (!canvas) return;
        _removeShapeListeners();
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';

        switch (tool) {
            case 'select':
                canvas.getObjects().forEach(o => { o.selectable = true; });
                break;

            case 'pencil':
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                canvas.freeDrawingBrush.color = brushColor.value;
                canvas.freeDrawingBrush.width = brushSize.value;
                canvas.getObjects().forEach(o => { o.selectable = false; });
                break;

            case 'eraser':
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                canvas.freeDrawingBrush.color = isTransparentBg.value ? 'rgba(0,0,0,0)' : (canvas.backgroundColor as string || '#ffffff');
                canvas.freeDrawingBrush.width = brushSize.value * 2;
                canvas.getObjects().forEach(o => { o.selectable = false; });
                break;

            case 'text':
                canvas.defaultCursor = 'text';
                canvas.selection = false;
                canvas.getObjects().forEach(o => { o.selectable = false; });
                canvas.on('mouse:down', (opt) => {
                    if (!canvas) return;
                    const pointer = canvas.getPointer(opt.e);
                    const itext = new fabric.IText('', {
                        left: pointer.x,
                        top: pointer.y,
                        fontFamily: fontFamily.value,
                        fontSize: fontSize.value,
                        fill: textColor.value,
                    });
                    canvas.add(itext);
                    canvas.setActiveObject(itext);
                    itext.enterEditing();
                    itext.on('editing:exited', () => {
                        if (itext.text === '') (canvas as fabric.Canvas).remove(itext);
                        else _saveHistory();
                    });
                });
                break;

            case 'rect':
            case 'circle':
                canvas.selection = false;
                canvas.defaultCursor = 'crosshair';
                canvas.getObjects().forEach(o => { o.selectable = false; });

                canvas.on('mouse:down', (opt) => {
                    if (!canvas || _isDrawingShape) return;
                    _isDrawingShape = true;
                    const pointer = canvas.getPointer(opt.e);
                    _shapeStartX = pointer.x;
                    _shapeStartY = pointer.y;

                    if (tool === 'rect') {
                        _activeShape = new fabric.Rect({
                            left: pointer.x, top: pointer.y,
                            width: 0, height: 0,
                            fill: fillColor.value, stroke: strokeColor.value, strokeWidth: 2,
                            selectable: false,
                        });
                    } else {
                        _activeShape = new fabric.Ellipse({
                            left: pointer.x, top: pointer.y,
                            rx: 0, ry: 0,
                            fill: fillColor.value, stroke: strokeColor.value, strokeWidth: 2,
                            selectable: false,
                        });
                    }
                    canvas.add(_activeShape);
                });

                canvas.on('mouse:move', (opt) => {
                    if (!canvas || !_isDrawingShape || !_activeShape) return;
                    const pointer = canvas.getPointer(opt.e);
                    const w = Math.abs(pointer.x - _shapeStartX);
                    const h = Math.abs(pointer.y - _shapeStartY);
                    const left = Math.min(pointer.x, _shapeStartX);
                    const top = Math.min(pointer.y, _shapeStartY);

                    if (_activeShape instanceof fabric.Rect) {
                        _activeShape.set({ left, top, width: w, height: h });
                    } else if (_activeShape instanceof fabric.Ellipse) {
                        _activeShape.set({ left, top, rx: w / 2, ry: h / 2 });
                    }
                    canvas.renderAll();
                });

                canvas.on('mouse:up', () => {
                    if (!canvas || !_isDrawingShape) return;
                    _isDrawingShape = false;
                    if (_activeShape) {
                        _activeShape.set({ selectable: true });
                        canvas.setActiveObject(_activeShape);
                        _activeShape = null;
                        _saveHistory();
                    }
                    // Allow continuing to draw shapes
                });
                break;
        }
    };

    const setTool = (tool: ToolType) => {
        activeTool.value = tool;
        _applyTool(tool);
    };

    const setCanvas = (c: fabric.Canvas) => {
        canvas = c;

        canvas.on('object:added', () => { if (!_isRestoringHistory) _saveHistory(); });
        canvas.on('object:modified', () => { _saveHistory(); });
        canvas.on('object:removed', () => { _saveHistory(); });

        _saveHistory(); // save initial state
    };

    const undo = () => {
        if (!canvas || _historyIndex <= 0) return;
        _historyIndex--;
        _isRestoringHistory = true;
        const snap = _history[_historyIndex];
        if (!snap) return;
        canvas.loadFromJSON(snap, () => {
            canvas?.renderAll();
            _isRestoringHistory = false;
        });
    };

    const redo = () => {
        if (!canvas || _historyIndex >= _history.length - 1) return;
        _historyIndex++;
        _isRestoringHistory = true;
        const snap = _history[_historyIndex];
        if (!snap) return;
        canvas.loadFromJSON(snap, () => {
            canvas?.renderAll();
            _isRestoringHistory = false;
        });
    };

    const canUndo = () => _historyIndex > 0;
    const canRedo = () => _historyIndex < _history.length - 1;

    const addImageToCanvas = (dataUrl: string) => {
        if (!canvas) return;
        fabric.FabricImage.fromURL(dataUrl).then((img) => {
            const scale = Math.min(160 / img.width!, 160 / img.height!);
            img.scale(scale);
            img.set({
                left: (canvas!.width! - img.getScaledWidth()) / 2,
                top: (canvas!.height! - img.getScaledHeight()) / 2,
            });
            canvas!.add(img);
            canvas!.setActiveObject(img);
            canvas!.renderAll();
        });
    };

    const setBgTransparent = (transparent: boolean) => {
        if (!canvas) return;
        isTransparentBg.value = transparent;
        canvas.backgroundColor = transparent ? '' : '#ffffff';
        canvas.renderAll();
    };

    const clearCanvas = () => {
        if (!canvas) return;
        canvas.clear();
        canvas.backgroundColor = isTransparentBg.value ? '' : '#ffffff';
        canvas.renderAll();
        _saveHistory();
    };

    const deleteSelected = () => {
        if (!canvas) return;
        const active = canvas.getActiveObjects();
        active.forEach(obj => canvas!.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
        _saveHistory();
    };

    const updateBrush = () => {
        if (!canvas || !canvas.freeDrawingBrush) return;
        canvas.freeDrawingBrush.color = brushColor.value;
        canvas.freeDrawingBrush.width = brushSize.value;
    };

    const exportPng = (): string => {
        if (!canvas) return '';
        canvas.discardActiveObject();
        canvas.renderAll();
        return canvas.toDataURL({ format: 'png', multiplier: 1 });
    };

    const getCanvasJSON = (): string => {
        if (!canvas) return '{}';
        return JSON.stringify(canvas.toJSON());
    };

    const loadCanvasJSON = (json: string): Promise<void> => {
        if (!canvas) return Promise.resolve();
        return new Promise((resolve) => {
            _isRestoringHistory = true;
            canvas!.loadFromJSON(JSON.parse(json), () => {
                canvas!.renderAll();
                _isRestoringHistory = false;
                resolve();
            });
        });
    };

    return {
        activeTool,
        brushColor, brushSize,
        fillColor, strokeColor,
        fontSize, fontFamily, textColor,
        isTransparentBg,
        setCanvas,
        setTool,
        undo, redo, canUndo, canRedo,
        addImageToCanvas,
        setBgTransparent,
        clearCanvas,
        deleteSelected,
        updateBrush,
        exportPng,
        getCanvasJSON,
        loadCanvasJSON,
    };
}
