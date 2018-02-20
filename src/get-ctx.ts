let ctx: AudioContext;

export const getCtx = () => {
    if (!ctx) {
        ctx = new (AudioContext || (window as any).webkitAudioContext)();
    }
    return ctx;
};
