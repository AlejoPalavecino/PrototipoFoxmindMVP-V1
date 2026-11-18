import { createHash } from 'node:crypto';
import { studyFail } from '../../../../src/core/domain/study/folders.ts';
import type { StudyDatabase, StudyImages } from '../modules/study/application/contracts.ts';
import { createStudyImageAssets } from '../modules/study/generation/infrastructure/study-image-assets.ts';
import { createFoxyPrivateImageInspector } from '../modules/files/custody/infrastructure/foxy-private-image-inspector.ts';
import type { FileScanner } from '../modules/files/custody/infrastructure/scanner.ts';
import { createGeminiFoxyImageAdapter } from '../modules/foxy/visuals/infrastructure/providers/foxy-image-adapter.ts';
import { validateVisualProfile } from '../modules/foxy/domain/visual-profile.ts';
import type { VisualInput, VisualUsage } from '../modules/foxy/visuals/application/visual-worker-contracts.ts';
import type { VisualProviders } from '../modules/foxy/visuals/application/visual-runtime-contracts.ts';
import { priceFoxyImageUsage, quoteFoxyImageBudget } from '../modules/foxy/visuals/infrastructure/providers/foxy-image-budget.ts';
import { reserveAiImageBudget, settleAiImageBudget } from '../platform/ai/text-budget.ts';
import type { ApiConfiguration } from './configuration.ts';

function imageJobId(ownerId: string, folderId: string, requestId: string): string {
    const hex = createHash('sha256').update(`${ownerId}:${folderId}:${requestId}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function createStudyImages(database: StudyDatabase, scan: FileScanner, configuration: ApiConfiguration,
    override: { enabled: boolean; provider?: VisualProviders['IMAGE'] }): StudyImages {
    const ai = configuration.ai, visual = configuration.foxyVisual;
    const profile = visual?.configuration.profiles.IMAGE;
    const assets = createStudyImageAssets(configuration.studyQuotaBytes ?? visual?.configuration.privateQuotaBytes ?? 0n);
    if (!ai || !visual?.configuration.enabled.IMAGE || !profile || (override.enabled && !override.provider)) return assets;
    const pinned = validateVisualProfile(profile, 'IMAGE');
    const provider = override.provider ?? createGeminiFoxyImageAdapter({ apiKey: ai.apiKey, audience: 'student', configuration: {
        model: pinned.model, profileVersion: pinned.profileVersion, maxInputTokens: pinned.maxInputTokens,
        maxOutputTokens: pinned.maxOutputTokens, deadlineMs: visual.imageProviderDeadlineMs,
    } });
    const inspector = createFoxyPrivateImageInspector();
    const estimate = quoteFoxyImageBudget({ inputTokenCap: pinned.maxInputTokens, outputTokenCap: pinned.maxOutputTokens,
        inputUsdPerMillion: pinned.inputUsdPerMillion, textOutputUsdPerMillion: pinned.textOutputUsdPerMillion!, imageOutputUsdPerMillion: pinned.imageOutputUsdPerMillion! });
    const pricing = {
        profileVersion: pinned.profileVersion, inputUsdPerMillion: Number(pinned.inputUsdPerMillion),
        outputUsdPerMillion: Number(pinned.outputUsdPerMillion), textOutputUsdPerMillion: Number(pinned.textOutputUsdPerMillion),
        imageOutputUsdPerMillion: Number(pinned.imageOutputUsdPerMillion),
    };
    let active = 0;
    return {
        ...assets,
        async generate({ message }, context) {
            if (active >= visual.configuration.maxConcurrency) studyFail('AI_BUSY');
            ++active;
            const signal = AbortSignal.timeout(Math.min(120_000, visual.imageProviderDeadlineMs * 2 + 20_000));
            const input: VisualInput = { mode: 'GENERAL', prompt: message, aspectRatio: '1:1', signal,
                profileVersion: pinned.profileVersion, curriculum: null, sources: [], documents: [], warnings: [] };
            const key = { namespace: 'study_image', jobId: imageJobId(context.ownerId, context.folderId, context.requestId), ownerId: context.ownerId };
            const transaction = { maxWait: 5_000, timeout: 15_000 };
            let reserved = false, billed: bigint | null = 0n;
            try {
                await context.authorize?.();
                reserved = await database.$transaction(raw => reserveAiImageBudget(
                    { query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) }, key, estimate,
                    { capability: 'study_image', provider: 'gemini', model: pinned.model, pricing }, ai), transaction);
                if (!reserved) studyFail('CONFLICT');
                await context.authorize?.();
                const count = await provider.countTokens(input);
                if (!Number.isSafeInteger(count) || count < 1 || count > pinned.maxInputTokens) studyFail('AI_INPUT_LIMIT');
                await context.authorize?.();
                if (signal.aborted) studyFail('AI_TIMEOUT');
                billed = null;
                const raster = await provider.generate(input).catch(error => {
                    billed = priceFoxyImageUsage(pinned, (error as { usage?: VisualUsage } | null)?.usage ?? null);
                    throw error;
                });
                billed = priceFoxyImageUsage(pinned, raster.usage);
                const facts = await inspector.inspect(raster.bytes, signal);
                await scan.scan(Buffer.from(raster.bytes));
                return { mimeType: facts.mimeType, bytes: raster.bytes };
            } finally {
                try {
                    if (reserved) await database.$transaction(raw => settleAiImageBudget(
                        { query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) }, key, billed), transaction);
                } finally {
                    --active;
                }
            }
        },
    };
}
