'use client';

const FloatingTryOnButton = () => {
  return (
    <button
      className="fixed bottom-8 right-8 z-40 w-[140px] h-[140px] rounded-full hover:scale-110 transition-transform duration-300 focus:outline-none animate-breathe"
      onClick={() => { (window as any).makeMeLook?.open(); }}
      aria-label="Примерить на себе"
    >
      <img src="/shop/assets/tryon-button.svg" alt="" className="w-full h-full" />
    </button>
  );
};

export default FloatingTryOnButton;

