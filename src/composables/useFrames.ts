import { ref } from 'vue';

export interface Frame {
    id: string;
    dataUrl: string;   // PNG snapshot for display
    fabricJson: string; // Serialized fabric canvas JSON for re-editing
    delay: number;      // Animation delay in ms
}

export function useFrames() {
    const frames = ref<Frame[]>([]);

    const addFrame = (dataUrl: string, fabricJson: string, delay = 100): Frame => {
        const frame: Frame = {
            id: `frame_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            dataUrl,
            fabricJson,
            delay,
        };
        frames.value.push(frame);
        return frame;
    };

    const deleteFrame = (id: string) => {
        frames.value = frames.value.filter(f => f.id !== id);
    };

    const duplicateFrame = (id: string) => {
        const idx = frames.value.findIndex(f => f.id === id);
        if (idx === -1) return;
        const original = frames.value[idx];
        const copy: Frame = {
            ...original,
            id: `frame_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        };
        frames.value.splice(idx + 1, 0, copy);
    };

    const reorderFrames = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        const list = [...frames.value];
        const [item] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, item);
        frames.value = list;
    };

    const updateDelay = (id: string, delay: number) => {
        const frame = frames.value.find(f => f.id === id);
        if (frame) frame.delay = delay;
    };

    const setAllDelays = (delay: number) => {
        frames.value.forEach(f => { f.delay = delay; });
    };

    const clearFrames = () => {
        frames.value = [];
    };

    return {
        frames,
        addFrame,
        deleteFrame,
        duplicateFrame,
        reorderFrames,
        updateDelay,
        setAllDelays,
        clearFrames,
    };
}
