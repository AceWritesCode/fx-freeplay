(() => {
  const stage = document.getElementById('stage');
  const topStroke = document.getElementById('topStroke');
  const bottomStroke = document.getElementById('bottomStroke');
  const topGlow = document.getElementById('topGlow');
  const bottomGlow = document.getElementById('bottomGlow');
  const tip = document.getElementById('tip');
  const logo = document.getElementById('logo');

  const ease = t => 1 - Math.pow(1 - t, 3);

  function prepare(path, glow) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    if (glow) {
      glow.style.strokeDasharray = `${len}`;
      glow.style.strokeDashoffset = `${len}`;
    }
    return len;
  }

  const topLen = prepare(topStroke, topGlow);
  const bottomLen = prepare(bottomStroke, bottomGlow);

  function setStrokeProgress(path, glow, len, progress) {
    const p = ease(Math.min(1, Math.max(0, progress)));
    const distance = len * p;
    const offset = len - distance;
    path.style.strokeDashoffset = `${offset}`;
    if (glow) glow.style.strokeDashoffset = `${offset}`;
    
    // Position pencil tip at current progress point along stroke
    const pt = path.getPointAtLength(Math.min(distance, len));
    tip.setAttribute('cx', pt.x);
    tip.setAttribute('cy', pt.y);
    tip.style.opacity = '1';
  }

  function animateSequence() {
    const durationTop = 1300;     // Duration for top stroke
    const durationGap = 200;      // Move pencil from top end to bottom start
    const durationBottom = 1300;  // Duration for bottom stroke
    
    const startTime = performance.now();

    const topStartPt = topStroke.getPointAtLength(0);
    const bottomStartPt = bottomStroke.getPointAtLength(0);

    // Set initial tip position
    tip.setAttribute('cx', topStartPt.x);
    tip.setAttribute('cy', topStartPt.y);
    tip.style.opacity = '1';

    function frame(now) {
      const elapsed = now - startTime;

      if (elapsed < durationTop) {
        // Phase 1: Draw Top Stroke
        const p = elapsed / durationTop;
        setStrokeProgress(topStroke, topGlow, topLen, p);
        requestAnimationFrame(frame);
      } else if (elapsed < durationTop + durationGap) {
        // Ensure Top Stroke is 100% complete
        topStroke.style.strokeDashoffset = '0';
        if (topGlow) topGlow.style.strokeDashoffset = '0';

        // Phase 2: Move pencil tip smoothly to start of bottom stroke
        const pGap = (elapsed - durationTop) / durationGap;
        const topEndPt = topStroke.getPointAtLength(topLen);
        const curX = topEndPt.x + (bottomStartPt.x - topEndPt.x) * pGap;
        const curY = topEndPt.y + (bottomStartPt.y - topEndPt.y) * pGap;
        tip.setAttribute('cx', curX);
        tip.setAttribute('cy', curY);
        tip.style.opacity = '1';

        requestAnimationFrame(frame);
      } else if (elapsed < durationTop + durationGap + durationBottom) {
        // Phase 3: Draw Bottom Stroke
        const p = (elapsed - (durationTop + durationGap)) / durationBottom;
        setStrokeProgress(bottomStroke, bottomGlow, bottomLen, p);
        requestAnimationFrame(frame);
      } else {
        // Phase 4: Finalize both strokes and hide dot at exact end of bottom stroke
        topStroke.style.strokeDashoffset = '0';
        if (topGlow) topGlow.style.strokeDashoffset = '0';
        bottomStroke.style.strokeDashoffset = '0';
        if (bottomGlow) bottomGlow.style.strokeDashoffset = '0';

        // End position is the exact end point of the bottom stroke
        const endPt = bottomStroke.getPointAtLength(bottomLen);
        tip.setAttribute('cx', endPt.x);
        tip.setAttribute('cy', endPt.y);
        
        // Hide pencil tip right where stroke finished
        tip.style.opacity = '0';

        // Trigger fill-in and final branding layout
        setTimeout(() => {
          stage.classList.add('fill-in');

          [topStroke, bottomStroke, topGlow, bottomGlow].forEach(el => {
            if (el) {
              el.style.transition = 'opacity .65s cubic-bezier(.22,.61,.36,1)';
              el.style.opacity = '0';
            }
          });
        }, 200);

        setTimeout(() => {
          logo.style.animation = 'logoBreath 2.8s ease-in-out infinite alternate';
          stage.classList.add('final');
        }, 800);
      }
    }

    requestAnimationFrame(frame);
  }

  // Start continuous stroke animation
  animateSequence();
})();
