import { useEffect } from 'react';
import { WrapperRoot } from '@/features/wrapper';
import { initThemeFromStorage } from '@/utils/themeApplier';
import { CustomTitleBar } from '@/components/CustomTitleBar';

export default function App() {
  useEffect(() => {
    document.title = 'FX Freeplay';
    initThemeFromStorage();
  }, []);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-app-bg">
      <CustomTitleBar />
      <div className="flex-1 w-full min-h-0 relative">
        <WrapperRoot />
      </div>
    </div>
  );
}
