let ctx: AudioContext;

export const getCtx = () => {
    if (!ctx) {
        ctx = new ((window as any).AudioContext ||
            (window as any).webkitAudioContext)();
    }
    return ctx;
};
