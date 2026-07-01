import { registerOverlay } from 'klinecharts';

export function snapPointToCandle(event: any, rawX: number, rawY: number) {
  // Always read mode from the live chart-level flag so drag events on
  // pre-existing overlays still respect the current magnet state.
  const mode: string = event.chart._magnetMode ?? event.overlay.mode ?? 'normal';
  if (mode !== 'weak_magnet' && mode !== 'strong_magnet') {
    return null;
  }
  const point = event.chart.convertFromPixel([{ x: rawX, y: rawY }], { paneId: 'candle_pane' })[0];
  if (!point) return null;

  const dataList = event.chart.getDataList();
  if (!dataList || dataList.length === 0) return null;

  const rawIndex = Math.round(point.dataIndex);
  const dataIndex = Math.max(0, Math.min(dataList.length - 1, rawIndex));
  const candle = dataList[dataIndex];
  if (!candle) return null;

  const prices = [candle.open, candle.high, candle.low, candle.close];
  let closestPrice = prices[0];
  let minPriceDiff = Math.abs(point.value - closestPrice);
  for (let i = 1; i < prices.length; i++) {
    const diff = Math.abs(point.value - prices[i]);
    if (diff < minPriceDiff) {
      minPriceDiff = diff;
      closestPrice = prices[i];
    }
  }

  if (mode === 'strong_magnet') {
    return {
      value: closestPrice,
      // Keep original X (timestamp/dataIndex) from mouse — only snap Y price.
      timestamp: point.timestamp,
      dataIndex: point.dataIndex
    };
  }

  if (mode === 'weak_magnet') {
    const sensitivity = event.overlay.modeSensitivity || 8;
    const closestPixelResult = event.chart.convertToPixel(
      [{ timestamp: candle.timestamp, value: closestPrice }],
      { paneId: 'candle_pane' }
    );
    const closestPixelY = closestPixelResult?.[0]?.y;
    if (closestPixelY !== undefined) {
      const pixelDist = Math.abs(rawY - closestPixelY);
      if (pixelDist <= sensitivity) {
        return {
          value: closestPrice,
          // Keep original X from mouse — only snap Y price.
          timestamp: point.timestamp,
          dataIndex: point.dataIndex
        };
      }
    }
  }

  return null;
}

export function registerCustomOverlays() {
  // 1. Custom Rectangle (with 8-point drag control handles)
  registerOverlay({
    name: 'rect',
    totalStep: 3,
    needDefaultPointFigure: true,
    createPointFigures: ({ chart, overlay }: any) => {
      const pts = chart.convertToPixel(overlay.points, { paneId: 'candle_pane' });
      if (pts.length < 2) return [];
      
      const p1 = pts[0];
      const p2 = pts.length >= 8 ? pts[2] : pts[1];
      if (!p1 || !p2) return [];

      const x1 = p1.x;
      const y1 = p1.y;
      const x2 = p2.x;
      const y2 = p2.y;

      const isSelected = chart._selectedOverlayIds?.includes(overlay.id);

      return [
        {
          type: 'rect',
          attrs: {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x1 - x2),
            height: Math.abs(y1 - y2)
          },
          styles: {
            style: 'stroke_fill',
            color: isSelected ? 'rgba(255, 152, 0, 0.15)' : 'rgba(33, 150, 243, 0.1)',
            borderColor: isSelected ? '#ff9800' : '#2196f3',
            borderSize: isSelected ? 2 : 1
          }
        }
      ];
    },
    onPressedMoveStart: (event: any) => {
      const pts = event.chart.convertToPixel(event.overlay.points, { paneId: 'candle_pane' });
      let closestIndex = 0;
      let minDistance = Infinity;
      pts.forEach((pt: any, idx: number) => {
        if (pt) {
          const dist = Math.sqrt((pt.x - event.x) ** 2 + (pt.y - event.y) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        }
      });
      const isHandle = minDistance < 12;
      const startMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: { 
          draggedIndex: isHandle ? closestIndex : null,
          startPoints: JSON.parse(JSON.stringify(event.overlay.points)),
          startMousePt
        }
      });

      if (event.chart._initMultiMove) {
        event.chart._initMultiMove(event);
      }
    },
    onPressedMoving: (event: any) => {
      const draggedIndex = event.overlay.extendData?.draggedIndex;
      if (draggedIndex === undefined) return;

      if (draggedIndex === null) {
        const startPoints = event.overlay.extendData?.startPoints;
        const startMousePt = event.overlay.extendData?.startMousePt;
        const currentMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];

        if (startPoints && startMousePt && currentMousePt) {
          const deltaTimestamp = currentMousePt.timestamp - startMousePt.timestamp;
          const deltaValue = currentMousePt.value - startMousePt.value;
          const deltaDataIndex = (currentMousePt.dataIndex !== undefined && startMousePt.dataIndex !== undefined)
            ? currentMousePt.dataIndex - startMousePt.dataIndex
            : 0;

          const newPoints = startPoints.map((pt: any) => ({
            ...pt,
            timestamp: pt.timestamp + deltaTimestamp,
            value: pt.value + deltaValue,
            dataIndex: (pt.dataIndex !== undefined) ? pt.dataIndex + deltaDataIndex : undefined
          }));

          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: newPoints
          });
        }

        if (event.chart._handleMultiMove) {
          event.chart._handleMultiMove(event);
        }
        if (event.chart._onDrawingSync) {
          event.chart._onDrawingSync();
        }
        return;
      }

      const points = [...event.overlay.points];
      if (points.length < 8) return;

      const mousePtResult = event.chart.convertFromPixel(
        [{ x: event.x, y: event.y }],
        { paneId: 'candle_pane' }
      );
      const mousePt = mousePtResult?.[0];
      if (!mousePt) return;

      const snapped = snapPointToCandle(event, event.x, event.y);
      const targetPt = snapped || mousePt;

      const x = targetPt.timestamp;
      const y = targetPt.value;
      const di = targetPt.dataIndex;

      let xMin = points[0].timestamp;
      let xMax = points[2].timestamp;
      let diMin = points[0].dataIndex;
      let diMax = points[2].dataIndex;
      let yMin = points[0].value;
      let yMax = points[2].value;

      switch (draggedIndex) {
        case 0: // top-left
          xMin = x;
          yMin = y;
          diMin = di;
          break;
        case 1: // top-right
          xMax = x;
          yMin = y;
          diMax = di;
          break;
        case 2: // bottom-right
          xMax = x;
          yMax = y;
          diMax = di;
          break;
        case 3: // bottom-left
          xMin = x;
          yMax = y;
          diMin = di;
          break;
        case 4: // top-center
          yMin = y;
          break;
        case 5: // bottom-center
          yMax = y;
          break;
        case 6: // left-center
          xMin = x;
          diMin = di;
          break;
        case 7: // right-center
          xMax = x;
          diMax = di;
          break;
      }

      const xMid = (xMin + xMax) / 2;
      const yMid = (yMin + yMax) / 2;
      const diMid = (diMin !== undefined && diMax !== undefined) ? Math.round((diMin + diMax) / 2) : undefined;

      const newPoints = [
        { timestamp: xMin, value: yMin, dataIndex: diMin },
        { timestamp: xMax, value: yMin, dataIndex: diMax },
        { timestamp: xMax, value: yMax, dataIndex: diMax },
        { timestamp: xMin, value: yMax, dataIndex: diMin },
        { timestamp: xMid, value: yMin, dataIndex: diMid },
        { timestamp: xMid, value: yMax, dataIndex: diMid },
        { timestamp: xMin, value: yMid, dataIndex: diMin },
        { timestamp: xMax, value: yMid, dataIndex: diMax }
      ];

      event.chart.overrideOverlay({
        id: event.overlay.id,
        points: newPoints
      });
      if (event.chart._onDrawingSync) {
        event.chart._onDrawingSync();
      }
    },
    onDrawing: (event: any) => {
      if (event.chart._onDrawingSync) {
        event.chart._onDrawingSync();
      }
    },
    onRemoved: (event: any) => {
      const syncMatch = event.overlay.id?.match(/^sync_(.+)_from_(\d+)$/);
      if (syncMatch) {
        const originalId = syncMatch[1];
        const sourceIndex = parseInt(syncMatch[2]);
        const sourceChart = event.chart._chartInstancesRef?.current?.[sourceIndex];
        if (sourceChart) {
          (sourceChart as any).removeOverlay({ id: originalId });
        }
      }
      if (event.chart._onDrawingSync) {
        setTimeout(() => {
          event.chart._onDrawingSync();
        }, 50);
      }
    },
    onClick: (event: any) => {
      const id = event.overlay.id;
      if (event.chart._justFinishedDrawingId === id) {
        event.chart._justFinishedDrawingId = null;
        return true;
      }
      event.chart._clickedOnOverlay = true;
      if (event.chart._setSelectedOverlayIds) {
        const isCtrl = event.chart._isCtrlPressedRef?.current || false;
        const currentSelected = event.chart._selectedOverlayIds || [];
        if (isCtrl) {
          if (currentSelected.includes(id)) {
            event.chart._setSelectedOverlayIds(currentSelected.filter((x: string) => x !== id));
          } else {
            event.chart._setSelectedOverlayIds([...currentSelected, id]);
          }
        } else {
          event.chart._setSelectedOverlayIds([id]);
        }
      }
      return true;
    }
  });

  // 2. Custom Risk-Reward Long Position Tool (6-point control: 4 corners + 2 entry midpoints)
  registerOverlay({
    name: 'priceChannel',
    totalStep: 4,
    needDefaultPointFigure: true,
    createPointFigures: ({ chart, overlay, yAxis }: any) => {
      const pts = chart.convertToPixel(overlay.points, { paneId: 'candle_pane' });
      if (pts.length < 1 || !yAxis) return [];

      const p0 = pts[0];
      if (!p0) return [];

      let startX = p0.x;
      let endX = startX + 150;
      let y0 = p0.y; // entry price Y

      // Default TP/SL
      let yTarget = y0 - 80;
      let yStop = y0 + 80;

      if (pts.length >= 6) {
        // Completed overlay with 6 points:
        // 0=TP-left, 1=TP-right, 2=SL-right, 3=SL-left, 4=entry-left, 5=entry-right
        const pTL = pts[0];
        const pTR = pts[1];
        const pBR = pts[2];
        const pBL = pts[3];
        const pML = pts[4];
        const pMR = pts[5];

        startX = Math.min(pTL.x, pBL.x, pML.x);
        endX = Math.max(pTR.x, pBR.x, pMR.x);
        yTarget = Math.min(pTL.y, pTR.y);
        yStop = Math.max(pBL.y, pBR.y);
        y0 = (pML.y + pMR.y) / 2;
      } else if (pts.length >= 3) {
        // Step 3: user placed entry, width, and TP level
        endX = pts[1].x;
        yTarget = pts[1].y;
        yStop = pts[2].y;
      } else if (pts.length >= 2) {
        // Step 2: user placed entry and is setting width + TP
        endX = pts[1].x;
        yTarget = pts[1].y;
        yStop = y0 + (y0 - yTarget); // mirror for 1:1 default
      }

      const entryPrice = yAxis.convertFromPixel(y0);
      const targetPrice = yAxis.convertFromPixel(yTarget);
      const stopPrice = yAxis.convertFromPixel(yStop);

      const profitDiff = Math.abs(targetPrice - entryPrice);
      const lossDiff = Math.abs(entryPrice - stopPrice);
      const rrRatio = lossDiff > 0 ? (profitDiff / lossDiff).toFixed(2) : '1.00';

      const left = Math.min(startX, endX);
      const right = Math.max(startX, endX);
      const boxWidth = right - left;



      // Color Palette matching TradingView Risk/Reward styles
      const greenFill = 'rgba(76, 175, 80, 0.12)';
      const greenBorder = '#4caf50';
      const redFill = 'rgba(244, 67, 54, 0.12)';
      const redBorder = '#f44336';

      const isSelected = chart._selectedOverlayIds?.includes(overlay.id);

      // Take Profit (TP) is ALWAYS green, Stop Loss (SL) is ALWAYS red
      const tpColor = greenFill;
      const tpBorderColor = isSelected ? '#ff9800' : greenBorder;
      const tpBorderSize = isSelected ? 2 : 1;

      const slColor = redFill;
      const slBorderColor = isSelected ? '#ff9800' : redBorder;
      const slBorderSize = isSelected ? 2 : 1;

      const figures: any[] = [];

      // 1. Take Profit Zone
      const tpTop = Math.min(y0, yTarget);
      const tpHeight = Math.abs(y0 - yTarget);
      figures.push({
        type: 'rect',
        attrs: {
          x: left,
          y: tpTop,
          width: boxWidth,
          height: tpHeight
        },
        styles: {
          style: 'stroke_fill',
          color: tpColor,
          borderColor: tpBorderColor,
          borderSize: tpBorderSize
        }
      });

      // 2. Stop Loss Zone
      const slTop = Math.min(y0, yStop);
      const slHeight = Math.abs(y0 - yStop);
      figures.push({
        type: 'rect',
        attrs: {
          x: left,
          y: slTop,
          width: boxWidth,
          height: slHeight
        },
        styles: {
          style: 'stroke_fill',
          color: slColor,
          borderColor: slBorderColor,
          borderSize: slBorderSize
        }
      });

      // 3. Entry Price line (Dashed Grey line)
      figures.push({
        type: 'line',
        attrs: {
          coordinates: [
            { x: left, y: y0 },
            { x: right, y: y0 }
          ]
        },
        styles: {
          color: '#808285',
          size: 1,
          style: 'dashed'
        }
      });

      // Dynamic pip formatting helper
      const formatPips = (diff: number, refPrice: number) => {
        if (refPrice < 2.0) return (diff * 10000).toFixed(1);                      // Forex
        if (refPrice < 200.0) return (diff * 100).toFixed(1);                      // JPY pairs, Oil
        if (refPrice >= 500.0 && refPrice < 5000.0) return (diff * 10).toFixed(1); // Gold (XAUUSD)
        return diff.toFixed(1);                                                    // Crypto, Indices
      };

      const topDiffVal = formatPips(Math.abs(targetPrice - entryPrice), entryPrice);
      const bottomDiffVal = formatPips(Math.abs(entryPrice - stopPrice), entryPrice);

      const midX = (left + right) / 2;

      // 4. Top Badge (TP level) - Using native text backgrounds for perfect centering
      const topBadgeColor = greenBorder; // TP label is always green
      figures.push({
        type: 'text',
        attrs: {
          x: midX,
          y: yTarget,
          text: `Take Profit: ${topDiffVal} pips`,
          align: 'center',
          baseline: 'middle'
        },
        styles: {
          color: '#ffffff',
          size: 10,
          backgroundColor: topBadgeColor,
          borderRadius: 3,
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 3,
          paddingBottom: 3
        }
      });

      // 5. Bottom Badge (SL level) - Using native text backgrounds for perfect centering
      const bottomBadgeColor = redBorder; // SL label is always red
      figures.push({
        type: 'text',
        attrs: {
          x: midX,
          y: yStop,
          text: `Stop Loss: ${bottomDiffVal} pips`,
          align: 'center',
          baseline: 'middle'
        },
        styles: {
          color: '#ffffff',
          size: 10,
          backgroundColor: bottomBadgeColor,
          borderRadius: 3,
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 3,
          paddingBottom: 3
        }
      });

      // 6. Middle Badge (Risk/reward ratio) - Using native text backgrounds for perfect centering
      const midText = `Risk/reward ratio: ${rrRatio}`;
      figures.push({
        type: 'text',
        attrs: {
          x: midX,
          y: y0,
          text: midText,
          align: 'center',
          baseline: 'middle'
        },
        styles: {
          color: '#ffffff',
          size: 10.5,
          backgroundColor: '#4caf50',
          borderRadius: 4,
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4
        }
      });

      return figures;
    },
    createYAxisFigures: ({ chart, overlay, yAxis, bounding }: any) => {
      if (!yAxis || !chart || overlay.points.length < 1) return [];

      const points = overlay.points;
      let entryPrice = points[0].value;
      let targetPrice = entryPrice;
      let stopPrice = entryPrice;

      if (points.length >= 6) {
        targetPrice = points[0].value;
        entryPrice = points[4].value;
        stopPrice = points[2].value;
      } else if (points.length >= 3) {
        entryPrice = points[0].value;
        targetPrice = points[1].value;
        stopPrice = points[2].value;
      } else if (points.length >= 2) {
        entryPrice = points[0].value;
        targetPrice = points[1].value;
        stopPrice = entryPrice - (targetPrice - entryPrice); // mirror
      }

      const tpLabelColor = '#4caf50'; // Green (TP is always green)
      const slLabelColor = '#f44336'; // Red (SL is always red)
      const entryColor = '#2196f3'; // Blue

      const yTP = yAxis.convertToPixel(targetPrice);
      const yEntry = yAxis.convertToPixel(entryPrice);
      const ySL = yAxis.convertToPixel(stopPrice);

      const pricePrecision = chart.getSymbol?.()?.pricePrecision ?? 5;
      const formatPrice = (p: number) => p.toFixed(pricePrecision);

      const isFromZero = yAxis.isFromZero?.() ?? false;
      const textAlign = isFromZero ? 'left' : 'right';
      const textX = isFromZero ? 6 : bounding.width - 6;

      const figures: any[] = [];

      // 1. Take Profit Y-Axis Label
      figures.push({
        type: 'rect',
        attrs: {
          x: 0,
          y: yTP - 9,
          width: bounding.width,
          height: 18
        },
        styles: {
          style: 'fill',
          color: tpLabelColor
        }
      });
      figures.push({
        type: 'text',
        attrs: {
          x: textX,
          y: yTP,
          text: formatPrice(targetPrice),
          align: textAlign,
          baseline: 'middle'
        },
        styles: {
          color: '#ffffff',
          size: 10,
          backgroundColor: 'transparent'
        }
      });

      // 2. Stop Loss Y-Axis Label
      figures.push({
        type: 'rect',
        attrs: {
          x: 0,
          y: ySL - 9,
          width: bounding.width,
          height: 18
        },
        styles: {
          style: 'fill',
          color: slLabelColor
        }
      });
      figures.push({
        type: 'text',
        attrs: {
          x: textX,
          y: ySL,
          text: formatPrice(stopPrice),
          align: textAlign,
          baseline: 'middle'
        },
        styles: {
          color: '#ffffff',
          size: 10,
          backgroundColor: 'transparent'
        }
      });

      // 3. Entry Y-Axis Label
      figures.push({
        type: 'rect',
        attrs: {
          x: 0,
          y: yEntry - 9,
          width: bounding.width,
          height: 18
        },
        styles: {
          style: 'fill',
          color: entryColor
        }
      });
      figures.push({
        type: 'text',
        attrs: {
          x: textX,
          y: yEntry,
          text: formatPrice(entryPrice),
          align: textAlign,
          baseline: 'middle'
        },
        styles: {
          color: '#ffffff',
          size: 10,
          backgroundColor: 'transparent'
        }
      });

      return figures;
    },
    // After drawing completes (3 clicks), expand points to 6 control points
    onDrawEnd: (event: any) => {
      const points = event.overlay.points;
      if (points.length < 3) return;

      const entryTs = points[0].timestamp;
      const entryVal = points[0].value;
      const endTs = points[1].timestamp;
      const tpVal = points[1].value;
      const slVal = points[2].value;

      const xMin = Math.min(entryTs, endTs);
      const xMax = Math.max(entryTs, endTs);

      const diMin = entryTs < endTs ? points[0].dataIndex : points[1].dataIndex;
      const diMax = entryTs < endTs ? points[1].dataIndex : points[0].dataIndex;

      // 6 points: 4 corners (TP-left, TP-right, SL-right, SL-left) + 2 entry midpoints
      const newPoints = [
        { timestamp: xMin, value: tpVal, dataIndex: diMin },   // 0: TP-left (top-left corner)
        { timestamp: xMax, value: tpVal, dataIndex: diMax },   // 1: TP-right (top-right corner)
        { timestamp: xMax, value: slVal, dataIndex: diMax },   // 2: SL-right (bottom-right corner)
        { timestamp: xMin, value: slVal, dataIndex: diMin },   // 3: SL-left (bottom-left corner)
        { timestamp: xMin, value: entryVal, dataIndex: diMin }, // 4: Entry-left (left-center)
        { timestamp: xMax, value: entryVal, dataIndex: diMax }  // 5: Entry-right (right-center)
      ];

      event.chart.overrideOverlay({
        id: event.overlay.id,
        points: newPoints
      });
    },
    onPressedMoveStart: (event: any) => {
      const pts = event.chart.convertToPixel(event.overlay.points, { paneId: 'candle_pane' });
      let closestIndex = 0;
      let minDistance = Infinity;
      pts.forEach((pt: any, idx: number) => {
        if (pt) {
          const dist = Math.sqrt((pt.x - event.x) ** 2 + (pt.y - event.y) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        }
      });
      const isHandle = minDistance < 12;
      const startMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: { 
          draggedIndex: isHandle ? closestIndex : null,
          startPoints: JSON.parse(JSON.stringify(event.overlay.points)),
          startMousePt
        }
      });

      if (event.chart._initMultiMove) {
        event.chart._initMultiMove(event);
      }
    },
    onPressedMoving: (event: any) => {
      const draggedIndex = event.overlay.extendData?.draggedIndex;
      if (draggedIndex === undefined) return;

      if (draggedIndex === null) {
        const startPoints = event.overlay.extendData?.startPoints;
        const startMousePt = event.overlay.extendData?.startMousePt;
        const currentMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];

        if (startPoints && startMousePt && currentMousePt) {
          const deltaTimestamp = currentMousePt.timestamp - startMousePt.timestamp;
          const deltaValue = currentMousePt.value - startMousePt.value;
          const deltaDataIndex = (currentMousePt.dataIndex !== undefined && startMousePt.dataIndex !== undefined)
            ? currentMousePt.dataIndex - startMousePt.dataIndex
            : 0;

          const newPoints = startPoints.map((pt: any) => ({
            ...pt,
            timestamp: pt.timestamp + deltaTimestamp,
            value: pt.value + deltaValue,
            dataIndex: (pt.dataIndex !== undefined) ? pt.dataIndex + deltaDataIndex : undefined
          }));

          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: newPoints
          });
        }

        if (event.chart._handleMultiMove) {
          event.chart._handleMultiMove(event);
        }
        if (event.chart._onDrawingSync) {
          event.chart._onDrawingSync();
        }
        return;
      }

      const points = [...event.overlay.points];
      if (points.length < 6) return;

      const mousePtResult = event.chart.convertFromPixel(
        [{ x: event.x, y: event.y }],
        { paneId: 'candle_pane' }
      );
      const mousePt = mousePtResult?.[0];
      if (!mousePt) return;

      const snapped = snapPointToCandle(event, event.x, event.y);
      const targetPt = snapped || mousePt;

      const draggedPt = {
        ...points[draggedIndex],
        timestamp: targetPt.timestamp,
        value: targetPt.value,
        dataIndex: targetPt.dataIndex
      };
      points[draggedIndex] = draggedPt;

      // y from draggedPt.value is the live-mutated point — safe to use for cases
      // where only the dragged point's own value is consumed (0,1,2,3,5).
      const y = draggedPt.value;

      // Retrieve frozen snapshot taken at drag-start (onPressedMoveStart)
      const startPoints = event.overlay.extendData?.startPoints;

      // Always read base bounds from the FROZEN start snapshot so we never
      // accumulate frame-to-frame delta errors.
      const baseXMin   = startPoints ? startPoints[4].timestamp  : points[4].timestamp;
      const baseXMax   = startPoints ? startPoints[5].timestamp  : points[5].timestamp;
      const baseDiMin  = startPoints ? startPoints[4].dataIndex  : points[4].dataIndex;
      const baseDiMax  = startPoints ? startPoints[5].dataIndex  : points[5].dataIndex;
      const baseYTP    = startPoints ? startPoints[0].value       : points[0].value;
      const baseYSL    = startPoints ? startPoints[2].value       : points[2].value;
      const baseYEntry = startPoints ? startPoints[4].value       : points[4].value;

      // Working copies (will be mutated by the switch below)
      let xMin   = baseXMin;
      let xMax   = baseXMax;
      let diMin  = baseDiMin;
      let diMax  = baseDiMax;
      let yTP    = baseYTP;
      let ySL    = baseYSL;
      let yEntry = baseYEntry;

      // Constraint helper — keeps the box at least 40px wide
      const getConstrainedRightPt = (mousePt: any) => {
        const pixelMin = event.chart.convertToPixel([{ timestamp: xMin, value: yEntry }], { paneId: 'candle_pane' })[0]?.x;
        const pixelX   = event.chart.convertToPixel([{ timestamp: mousePt.timestamp, value: yEntry }], { paneId: 'candle_pane' })[0]?.x;
        if (pixelMin !== undefined && pixelX !== undefined && pixelX < pixelMin + 40) {
          const backPt = event.chart.convertFromPixel([{ x: pixelMin + 40, y: 0 }], { paneId: 'candle_pane' })[0];
          return backPt ? { timestamp: backPt.timestamp, dataIndex: backPt.dataIndex } : mousePt;
        }
        return mousePt;
      };

      const getConstrainedLeftPt = (mousePt: any) => {
        const pixelMax = event.chart.convertToPixel([{ timestamp: xMax, value: yEntry }], { paneId: 'candle_pane' })[0]?.x;
        const pixelX   = event.chart.convertToPixel([{ timestamp: mousePt.timestamp, value: yEntry }], { paneId: 'candle_pane' })[0]?.x;
        if (pixelMax !== undefined && pixelX !== undefined && pixelX > pixelMax - 40) {
          const backPt = event.chart.convertFromPixel([{ x: pixelMax - 40, y: 0 }], { paneId: 'candle_pane' })[0];
          return backPt ? { timestamp: backPt.timestamp, dataIndex: backPt.dataIndex } : mousePt;
        }
        return mousePt;
      };

      switch (draggedIndex) {
        case 0: // TP-left corner: lock horizontal, only move TP level vertically
          yTP = y;
          if ((yTP > yEntry && ySL > yEntry) || (yTP < yEntry && ySL < yEntry)) {
            ySL = yEntry - (baseYSL - baseYEntry);
          }
          break;

        case 1: { // TP-right corner: move right edge + TP level
          const rightPt1 = getConstrainedRightPt(draggedPt);
          xMax  = rightPt1.timestamp;
          diMax = rightPt1.dataIndex;
          yTP   = y;
          if ((yTP > yEntry && ySL > yEntry) || (yTP < yEntry && ySL < yEntry)) {
            ySL = yEntry - (baseYSL - baseYEntry);
          }
          break;
        }

        case 2: { // SL-right corner: move right edge + SL level
          const rightPt2 = getConstrainedRightPt(draggedPt);
          xMax  = rightPt2.timestamp;
          diMax = rightPt2.dataIndex;
          ySL   = y;
          if ((yTP > yEntry && ySL > yEntry) || (yTP < yEntry && ySL < yEntry)) {
            yTP = yEntry - (baseYTP - baseYEntry);
          }
          break;
        }

        case 3: // SL-left corner: lock horizontal, only move SL level vertically
          ySL = y;
          if ((yTP > yEntry && ySL > yEntry) || (yTP < yEntry && ySL < yEntry)) {
            yTP = yEntry - (baseYTP - baseYEntry);
          }
          break;

        case 4: { // Entry-left: move left edge horizontally + shift entire box vertically
          // Convert the raw mouse pixel Y to a price value — this avoids reading
          // draggedPt.value which has already been mutated by the previous frame.
          const mousePrice = targetPt.value;
          if (mousePrice === undefined) break;

          // dy4 is the total offset from drag start, applied once to frozen base values
          const dy4 = mousePrice - baseYEntry;
          yEntry = baseYEntry + dy4;  // == mousePrice
          yTP    = baseYTP    + dy4;
          ySL    = baseYSL    + dy4;

          const leftPt = getConstrainedLeftPt(draggedPt);
          xMin  = leftPt.timestamp;
          diMin = leftPt.dataIndex;
          break;
        }

        case 5: { // Entry-right: lock vertical, only move right edge horizontally
          const rightPt5 = getConstrainedRightPt(draggedPt);
          xMax  = rightPt5.timestamp;
          diMax = rightPt5.dataIndex;
          // yEntry, yTP, ySL stay unchanged
          break;
        }
      }

      const newPoints = [
        { timestamp: xMin, value: yTP, dataIndex: diMin },     // 0: TP-left
        { timestamp: xMax, value: yTP, dataIndex: diMax },     // 1: TP-right
        { timestamp: xMax, value: ySL, dataIndex: diMax },     // 2: SL-right
        { timestamp: xMin, value: ySL, dataIndex: diMin },     // 3: SL-left
        { timestamp: xMin, value: yEntry, dataIndex: diMin },  // 4: Entry-left
        { timestamp: xMax, value: yEntry, dataIndex: diMax }   // 5: Entry-right
      ];

      event.chart.overrideOverlay({
        id: event.overlay.id,
        points: newPoints
      });
      if (event.chart._onDrawingSync) {
        event.chart._onDrawingSync();
      }
    },
    onDrawing: (event: any) => {
      if (event.chart._onDrawingSync) {
        event.chart._onDrawingSync();
      }
    },
    onRemoved: (event: any) => {
      const syncMatch = event.overlay.id?.match(/^sync_(.+)_from_(\d+)$/);
      if (syncMatch) {
        const originalId = syncMatch[1];
        const sourceIndex = parseInt(syncMatch[2]);
        const sourceChart = event.chart._chartInstancesRef?.current?.[sourceIndex];
        if (sourceChart) {
          (sourceChart as any).removeOverlay({ id: originalId });
        }
      }
      if (event.chart._onDrawingSync) {
        setTimeout(() => {
          event.chart._onDrawingSync();
        }, 50);
      }
    },
    onClick: (event: any) => {
      const id = event.overlay.id;
      if (event.chart._justFinishedDrawingId === id) {
        event.chart._justFinishedDrawingId = null;
        return true;
      }
      event.chart._clickedOnOverlay = true;
      if (event.chart._setSelectedOverlayIds) {
        const isCtrl = event.chart._isCtrlPressedRef?.current || false;
        const currentSelected = event.chart._selectedOverlayIds || [];
        if (isCtrl) {
          if (currentSelected.includes(id)) {
            event.chart._setSelectedOverlayIds(currentSelected.filter((x: string) => x !== id));
          } else {
            event.chart._setSelectedOverlayIds([...currentSelected, id]);
          }
        } else {
          event.chart._setSelectedOverlayIds([id]);
        }
      }
      return true;
    }
  });

  // 3. Custom Last Price Line (Unclamped)
  registerOverlay({
    name: 'customPriceLine',
    totalStep: 0,
    needDefaultPointFigure: false,
    createPointFigures: ({ chart, yAxis, bounding }: any) => {
      if (!chart._showPriceLine) return [];

      const dataList = chart.getDataList();
      if (dataList.length === 0) return [];
      const lastData = dataList[dataList.length - 1];
      if (!lastData) return [];

      const close = lastData.close;
      const open = lastData.open;

      // Calculate Y coordinate without clamping
      const priceY = yAxis.convertToPixel(close);

      // Determine color
      let color = chart._priceLineColor || '#2196f3';
      if (chart._priceLineUseCandleColor) {
        const prevData = dataList[dataList.length - 2];
        const comparePrice = prevData ? prevData.close : open;
        if (close > comparePrice) {
          color = chart._bullColor || '#26a69a';
        } else if (close < comparePrice) {
          color = chart._bearColor || '#ef5350';
        } else {
          color = '#8b93a6';
        }
      }

      const width = bounding?.width ?? 1000;

      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: 0, y: priceY },
              { x: width, y: priceY }
            ]
          },
          styles: {
            style: chart._priceLineStyle || 'dashed',
            color: color,
            size: chart._priceLineSize || 1,
            dashedValue: [4, 4]
          }
        }
      ];
    }
  });

  // 6. Customizable Session Breaks overlay (draws vertical lines at day transitions)
  registerOverlay({
    name: 'sessionBreaks',
    totalStep: 0,
    createPointFigures: ({ chart, bounding }: any) => {
      if (!chart._showSessionBreaks) {
        return [];
      }

      // Check period and hide session breaks on Daily, Weekly, and Monthly charts to avoid clutter
      const period = chart.getPeriod?.();
      if (period && (period.type === 'day' || period.type === 'week' || period.type === 'month')) {
        return [];
      }

      const dataList = chart.getDataList();
      if (!dataList || dataList.length === 0) return [];

      const figures: any[] = [];
      const height = bounding?.height ?? 800;
      const color = chart._sessionBreaksColor || 'rgba(139, 147, 166, 0.4)';
      const style = chart._sessionBreaksStyle || 'dashed';
      const size = chart._sessionBreaksSize || 1;

      // Find all transitions of days
      const dayTransitionIndices: number[] = [];
      for (let i = 1; i < dataList.length; i++) {
        const prevCandle = dataList[i - 1];
        const currCandle = dataList[i];
        if (!prevCandle || !currCandle) continue;

        const prevDate = new Date(prevCandle.timestamp);
        const currDate = new Date(currCandle.timestamp);
        
        // Date transition check using local functions to match chart's X-axis date formatting
        const isNewDay = prevDate.getDate() !== currDate.getDate() ||
                         prevDate.getMonth() !== currDate.getMonth() ||
                         prevDate.getFullYear() !== currDate.getFullYear();

        if (isNewDay) {
          dayTransitionIndices.push(i);
        }
      }

      // Convert only those day transitions to lines
      dayTransitionIndices.forEach(idx => {
        const candle = dataList[idx];
        const xResult = chart.convertToPixel(
          [{ timestamp: candle.timestamp, value: candle.close }],
          { paneId: 'candle_pane' }
        );
        const x = xResult?.[0]?.x;
        if (x !== undefined && !isNaN(x)) {
          figures.push({
            type: 'line',
            attrs: {
              coordinates: [
                { x, y: 0 },
                { x, y: height }
              ]
            },
            styles: {
              style: style,
              color: color,
              size: size,
              dashedValue: [4, 4]
            }
          });
        }
      });

      return figures;
    }
  });
}
