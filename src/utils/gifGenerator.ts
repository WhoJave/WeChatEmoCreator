import GIF from 'gif.js';

export interface GifOptions {
    width: number;
    height: number;
    quality?: number;
    workers?: number;
    workerScript?: string;
    transparent?: string | null;
    onProgress?: (progress: number) => void;
}

export class GifGenerator {
    private gif: GIF;
    private onProgress?: (progress: number) => void;

    constructor(options: GifOptions) {
        this.onProgress = options.onProgress;
        this.gif = new GIF({
            workers: options.workers ?? 2,
            quality: options.quality ?? 8,
            width: options.width,
            height: options.height,
            workerScript: options.workerScript ?? '/gif.worker.js',
            transparent: options.transparent ?? null,
        });

        this.gif.on('progress', (p: number) => {
            this.onProgress?.(p);
        });
    }

    addFrame(imageElement: HTMLImageElement | HTMLCanvasElement, delay: number = 100) {
        this.gif.addFrame(imageElement, { delay });
    }

    render(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            this.gif.on('finished', (blob: Blob) => resolve(blob));
            this.gif.on('abort', () => reject(new Error('GIF generation aborted')));
            this.gif.render();
        });
    }
}
