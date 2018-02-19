let _ctx: AudioContext;

export const getCtx = () => {
  if (!_ctx) {
    _ctx = new (AudioContext || (window as any).webkitAudioContext)();
  }
  return _ctx;
};
