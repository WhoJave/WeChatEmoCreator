import type { Frame } from '../composables/useFrames';

export interface ComplianceResult {
    valid: boolean;
    warnings: string[];
}

export function checkCompliance(frames: Frame[], estimatedFileSizeBytes?: number): ComplianceResult {
    const warnings: string[] = [];

    if (frames.length > 10) {
        warnings.push(`Too many frames (${frames.length}/10). WeChat allows max 10 frames.`);
    }

    const totalDurationMs = frames.reduce((sum, f) => sum + f.delay, 0);
    if (totalDurationMs > 30000) {
        warnings.push(`Total animation duration ${(totalDurationMs / 1000).toFixed(1)}s exceeds 30s limit.`);
    }

    if (estimatedFileSizeBytes && estimatedFileSizeBytes > 500 * 1024) {
        warnings.push(`Estimated file size ${(estimatedFileSizeBytes / 1024).toFixed(0)}KB exceeds WeChat's 500KB limit.`);
    }

    return {
        valid: warnings.length === 0,
        warnings,
    };
}
