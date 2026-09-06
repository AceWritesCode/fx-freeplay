import React, { useEffect, useRef } from 'react';
import './splash.css';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const topStrokeRef = useRef<SVGPathElement>(null);
  const bottomStrokeRef = useRef<SVGPathElement>(null);
  const topGlowRef = useRef<SVGPathElement>(null);
  const bottomGlowRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    console.log('[Wrapper] Splash screen initiated');
    const stage = stageRef.current;
    const topStroke = topStrokeRef.current;
    const bottomStroke = bottomStrokeRef.current;
    const topGlow = topGlowRef.current;
    const bottomGlow = bottomGlowRef.current;
    const tip = tipRef.current;
    const logo = logoRef.current;

    if (!stage || !topStroke || !bottomStroke || !topGlow || !bottomGlow || !tip || !logo) {
      onComplete();
      return;
    }

    let isDisposed = false;
    let animFrameId: number;
    let timer1: ReturnType<typeof setTimeout>;
    let timer2: ReturnType<typeof setTimeout>;
    let timerComplete: ReturnType<typeof setTimeout>;

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    function prepare(path: SVGPathElement, glow: SVGPathElement) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      glow.style.strokeDasharray = `${len}`;
      glow.style.strokeDashoffset = `${len}`;
      return len;
    }

    const topLen = prepare(topStroke, topGlow);
    const bottomLen = prepare(bottomStroke, bottomGlow);

    function setStrokeProgress(
      path: SVGPathElement,
      glow: SVGPathElement,
      len: number,
      progress: number
    ) {
      const p = ease(Math.min(1, Math.max(0, progress)));
      const distance = len * p;
      const offset = len - distance;
      path.style.strokeDashoffset = `${offset}`;
      glow.style.strokeDashoffset = `${offset}`;

      const pt = path.getPointAtLength(Math.min(distance, len));
      tip!.setAttribute('cx', pt.x.toString());
      tip!.setAttribute('cy', pt.y.toString());
      tip!.style.opacity = '1';
    }

    function animateSequence() {
      const durationTop = 1300;
      const durationGap = 200;
      const durationBottom = 1300;
      const startTime = performance.now();

      const topStartPt = topStroke!.getPointAtLength(0);
      const bottomStartPt = bottomStroke!.getPointAtLength(0);

      tip!.setAttribute('cx', topStartPt.x.toString());
      tip!.setAttribute('cy', topStartPt.y.toString());
      tip!.style.opacity = '1';

      function frame(now: number) {
        if (isDisposed) return;
        const elapsed = now - startTime;

        if (elapsed < durationTop) {
          const p = elapsed / durationTop;
          setStrokeProgress(topStroke!, topGlow!, topLen, p);
          animFrameId = requestAnimationFrame(frame);
        } else if (elapsed < durationTop + durationGap) {
          topStroke!.style.strokeDashoffset = '0';
          topGlow!.style.strokeDashoffset = '0';

          const pGap = (elapsed - durationTop) / durationGap;
          const topEndPt = topStroke!.getPointAtLength(topLen);
          const curX = topEndPt.x + (bottomStartPt.x - topEndPt.x) * pGap;
          const curY = topEndPt.y + (bottomStartPt.y - topEndPt.y) * pGap;
          tip!.setAttribute('cx', curX.toString());
          tip!.setAttribute('cy', curY.toString());
          tip!.style.opacity = '1';

          animFrameId = requestAnimationFrame(frame);
        } else if (elapsed < durationTop + durationGap + durationBottom) {
          const p = (elapsed - (durationTop + durationGap)) / durationBottom;
          setStrokeProgress(bottomStroke!, bottomGlow!, bottomLen, p);
          animFrameId = requestAnimationFrame(frame);
        } else {
          topStroke!.style.strokeDashoffset = '0';
          topGlow!.style.strokeDashoffset = '0';
          bottomStroke!.style.strokeDashoffset = '0';
          bottomGlow!.style.strokeDashoffset = '0';

          const endPt = bottomStroke!.getPointAtLength(bottomLen);
          tip!.setAttribute('cx', endPt.x.toString());
          tip!.setAttribute('cy', endPt.y.toString());
          tip!.style.opacity = '0';

          timer1 = setTimeout(() => {
            if (isDisposed) return;
            stage!.classList.add('fill-in');

            [topStroke, bottomStroke, topGlow, bottomGlow].forEach((el) => {
              if (el) {
                el.style.transition = 'opacity .65s cubic-bezier(.22,.61,.36,1)';
                el.style.opacity = '0';
              }
            });
          }, 200);

          timer2 = setTimeout(() => {
            if (isDisposed) return;
            logo!.style.animation = 'logoBreath 2.8s ease-in-out infinite alternate';
            stage!.classList.add('final');

            // Graceful transition to Home Page after splash completion
            timerComplete = setTimeout(() => {
              if (isDisposed) return;
              console.log('[Wrapper] Splash sequence completed');
              onComplete();
            }, 1200);
          }, 800);
        }
      }

      animFrameId = requestAnimationFrame(frame);
    }

    animateSequence();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animFrameId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timerComplete);
    };
  }, [onComplete]);

  return (
    <main
      className="splash select-none"
      onClick={() => {
        console.log('[Wrapper] Splash clicked -> Skipping to Home');
        onComplete();
      }}
      title="Click anywhere to skip splash"
    >
      <div id="stage" ref={stageRef} className="stage">
        <div className="logo-wrap">
          <svg
            id="logo"
            ref={logoRef}
            className="logo"
            viewBox="20 20 160 165"
            aria-label="FX Freeplay logo"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="silver" x1="28" y1="116" x2="173" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#d1ddea" />
                <stop offset=".48" stopColor="#f3f6fa" />
                <stop offset="1" stopColor="#fff" />
              </linearGradient>
              <linearGradient id="blue" x1="28" y1="171" x2="142" y2="91" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#2a78c6" />
                <stop offset=".55" stopColor="#3d8fdf" />
                <stop offset="1" stopColor="#63b5fb" />
              </linearGradient>
            </defs>

            <path
              id="topFill"
              className="logo-fill"
              fill="url(#silver)"
              d="M30 110V70Q30 68 32 66L68 30Q69.5 29 72 29H170L130 70H72Q70 70 69 71L30 110Z"
            />
            <path
              id="bottomFill"
              className="logo-fill"
              fill="url(#blue)"
              d="M30 170V130Q30 128 32 126L68 91Q69.5 90 72 90H140L100 130H72Q70 130 69 131L30 170Z"
            />

            <path
              id="topGlow"
              ref={topGlowRef}
              className="logo-stroke-glow"
              d="M30 110V70Q30 68 32 66L68 30Q69.5 29 72 29H170L130 70H72Q70 70 69 71L30 110Z"
            />
            <path
              id="bottomGlow"
              ref={bottomGlowRef}
              className="logo-stroke-glow"
              d="M30 170V130Q30 128 32 126L68 91Q69.5 90 72 90H140L100 130H72Q70 130 69 131L30 170Z"
            />

            <path
              id="topStroke"
              ref={topStrokeRef}
              className="logo-stroke"
              d="M30 110V70Q30 68 32 66L68 30Q69.5 29 72 29H170L130 70H72Q70 70 69 71L30 110Z"
            />
            <path
              id="bottomStroke"
              ref={bottomStrokeRef}
              className="logo-stroke"
              d="M30 170V130Q30 128 32 126L68 91Q69.5 90 72 90H140L100 130H72Q70 130 69 131L30 170Z"
            />

            <circle id="tip" ref={tipRef} className="pencil-tip" r="2.1" />
          </svg>
        </div>

        <section id="wordGroup" className="word-group" aria-label="FX Freeplay" style={{ marginLeft: '70px' }}>
          <h1 className="wordmark">
            <span className="fx">FX</span> <span className="freeplay">FREEPLAY</span>
          </h1>
          <div className="sub-text">
            <span>EXPLORE</span>
            <i />
            <span>ANALYZE</span>
            <i />
            <span>IMPROVE</span>
          </div>
        </section>
      </div>
    </main>
  );
};
