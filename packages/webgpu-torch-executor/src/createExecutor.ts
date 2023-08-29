export const createExecutor: ExecutorFactory = (options) => {
    return new WebGPUTorchExecutor(options);
}
