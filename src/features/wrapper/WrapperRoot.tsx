import React, { useState, useEffect } from 'react';
import type { WrapperView } from './types';
import { SplashScreen } from './components/SplashScreen';
import { WrapperHome } from './components/WrapperHome';
import { WrapperSettings } from './components/WrapperSettings';
import { ModulePlaceholder } from './components/ModulePlaceholder';
import { WrapperHelp } from './components/WrapperHelp';
import { ChartWorkspace } from '@/features/chart-workspace';
import { loadWrapperSettings, resolveStartupDestination } from './wrapperPersistence';

export const WrapperRoot: React.FC = () => {
  const [currentView, setCurrentView] = useState<WrapperView>('splash');
  const [hasVisitedCharts, setHasVisitedCharts] = useState<boolean>(false);

  const handleSplashComplete = () => {
    const settings = loadWrapperSettings();
    const resolution = resolveStartupDestination(settings.defaultModuleOnLaunch);

    if (resolution.fallbackReason) {
      console.warn(resolution.fallbackReason);
    } else {
      console.log(`[Wrapper] Startup destination: ${resolution.destination === 'charts' ? 'Charts' : 'Home'}`);
    }

    if (resolution.destination === 'charts') {
      setHasVisitedCharts(true);
    }
    setCurrentView(resolution.destination);
  };

  useEffect(() => {
    if (currentView === 'home') {
      console.log('[Wrapper] Home loaded');
    }
    if (currentView === 'charts') {
      console.log('[Wrapper] Charts workspace active');
      // Trigger resize on the next frame so canvas instances properly measure when unhidden
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  const handleNavigate = (target: string) => {
    const view = target as WrapperView;
    if (view === 'charts') {
      setHasVisitedCharts(true);
    }
    setCurrentView(view);
  };

  if (currentView === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-app-bg">
      {/* Kept-alive Chart Workspace: mounts when first visited and stays in DOM to preserve state */}
      {hasVisitedCharts && (
        <div className={currentView === 'charts' ? 'h-full w-full' : 'hidden'}>
          <ChartWorkspace onNavigateHome={() => handleNavigate('home')} />
        </div>
      )}

      {/* Wrapper Views (rendered when not on charts) */}
      {currentView === 'home' && <WrapperHome onNavigate={handleNavigate} />}

      {currentView === 'settings' && <WrapperSettings onBack={() => handleNavigate('home')} />}
      {currentView === 'help' && <WrapperHelp onBack={() => handleNavigate('home')} />}

      {currentView === 'journal' && (
        <ModulePlaceholder
          moduleId="journal"
          moduleName="Journal"
          description="Record, review and understand your trading decisions."
          onBack={() => handleNavigate('home')}
        />
      )}

      {currentView === 'backtesting' && (
        <ModulePlaceholder
          moduleId="backtesting"
          moduleName="Backtesting"
          description="Test strategies against historical market data."
          onBack={() => handleNavigate('home')}
        />
      )}

      {currentView === 'research' && (
        <ModulePlaceholder
          moduleId="research"
          moduleName="Research"
          description="Build and organize structured trading research."
          onBack={() => handleNavigate('home')}
        />
      )}
    </div>
  );
};
