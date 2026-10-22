import { useEffect } from 'react';
import { WrapperRoot } from '@/features/wrapper';
import { initThemeFromStorage } from '@/utils/themeApplier';

export default function App() {
  useEffect(() => {
    document.title = 'FX Freeplay';
    initThemeFromStorage();
  }, []);

  return (
    <div className="h-full w-full">
      <WrapperRoot />
    </div>
  );
}
