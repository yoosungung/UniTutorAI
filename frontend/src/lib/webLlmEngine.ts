import type { OnDeviceChatEngine } from './onDeviceTutor';

/**
 * Dynamic WebLLM worker engine. Kept in a separate module so unit tests and
 * default cloud path never load `@mlc-ai/web-llm`.
 */
export async function createWebLlmEngine(
  modelId: string,
  onProgress: (text: string) => void,
): Promise<OnDeviceChatEngine> {
  const webllm = await import('@mlc-ai/web-llm');
  const engine = await webllm.CreateWebWorkerMLCEngine(
    new Worker(new URL('../workers/webllm.worker.ts', import.meta.url), {
      type: 'module',
    }),
    modelId,
    {
      initProgressCallback: (report) => {
        if (report?.text) onProgress(report.text);
      },
    },
  );
  return engine as unknown as OnDeviceChatEngine;
}
