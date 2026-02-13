/**
 * BrailleOCR - 盲文图片识别引擎
 * 融合 e-Braille Tales 的行检测 + 网格分割思路
 */

const BrailleOCR = (() => {

  const DEFAULT_PARAMS = {
    thresholdSensitivity: 15,
    blockSize: 31,
    minDotArea: 20,
    maxDotArea: 2000,
    minCircularity: 0.3,
    dotMergeDistance: 8,
  };

  // ========== 图像预处理 ==========

  function loadImageToCanvas(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ canvas, ctx, width: w, height: h });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function getGrayscale(imageData) {
    const { data, width, height } = imageData;
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const j = i * 4;
      gray[i] = Math.round(0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]);
    }
    return gray;
  }

  function adaptiveThreshold(gray, width, height, blockSize, C) {
    const half = Math.floor(blockSize / 2);
    const binary = new Uint8Array(width * height);
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      for (let x = 0; x < width; x++) {
        rowSum += gray[y * width + x];
        integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum;
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const y1 = Math.max(0, y - half), y2 = Math.min(height - 1, y + half);
        const x1 = Math.max(0, x - half), x2 = Math.min(width - 1, x + half);
        const count = (y2 - y1 + 1) * (x2 - x1 + 1);
        const sum = integral[(y2 + 1) * (width + 1) + (x2 + 1)]
                  - integral[y1 * (width + 1) + (x2 + 1)]
                  - integral[(y2 + 1) * (width + 1) + x1]
                  + integral[y1 * (width + 1) + x1];
        binary[y * width + x] = gray[y * width + x] < (sum / count - C) ? 1 : 0;
      }
    }
    return binary;
  }

  function erode(binary, width, height, radius) {
    const out = new Uint8Array(width * height);
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        let allSet = true;
        outer: for (let dy = -radius; dy <= radius; dy++)
          for (let dx = -radius; dx <= radius; dx++)
            if (!binary[(y + dy) * width + (x + dx)]) { allSet = false; break outer; }
        out[y * width + x] = allSet ? 1 : 0;
      }
    }
    return out;
  }

  function dilate(binary, width, height, radius) {
    const out = new Uint8Array(width * height);
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        let anySet = false;
        outer: for (let dy = -radius; dy <= radius; dy++)
          for (let dx = -radius; dx <= radius; dx++)
            if (binary[(y + dy) * width + (x + dx)]) { anySet = true; break outer; }
        out[y * width + x] = anySet ? 1 : 0;
      }
    }
    return out;
  }

  function morphologyClean(binary, width, height) {
    let r = erode(binary, width, height, 1);
    r = dilate(r, width, height, 1);
    r = dilate(r, width, height, 1);
    r = erode(r, width, height, 1);
    return r;
  }

  // ========== 连通域检测 ==========

  function detectBlobs(binary, width, height, params) {
    const labels = new Int32Array(width * height);
    let nextLabel = 1;
    const blobs = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binary[y * width + x] && !labels[y * width + x]) {
          const blob = { minX: x, maxX: x, minY: y, maxY: y, cx: 0, cy: 0, area: 0, sumX: 0, sumY: 0 };
          const queue = [[x, y]];
          labels[y * width + x] = nextLabel;
          let head = 0;

          while (head < queue.length) {
            const [px, py] = queue[head++];
            blob.sumX += px; blob.sumY += py; blob.area++;
            if (px < blob.minX) blob.minX = px;
            if (px > blob.maxX) blob.maxX = px;
            if (py < blob.minY) blob.minY = py;
            if (py > blob.maxY) blob.maxY = py;

            const neighbors = [[px-1,py],[px+1,py],[px,py-1],[px,py+1]];
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height
                  && binary[ny * width + nx] && !labels[ny * width + nx]) {
                labels[ny * width + nx] = nextLabel;
                queue.push([nx, ny]);
              }
            }
          }

          blob.cx = blob.sumX / blob.area;
          blob.cy = blob.sumY / blob.area;
          const bw = blob.maxX - blob.minX + 1, bh = blob.maxY - blob.minY + 1;
          blob.circularity = blob.area / (bw * bh);
          blob.radius = Math.sqrt(blob.area / Math.PI);
          nextLabel++;
          blobs.push(blob);
        }
      }
    }

    return blobs.filter(b =>
      b.area >= params.minDotArea &&
      b.area <= params.maxDotArea &&
      b.circularity >= params.minCircularity
    );
  }

  function mergeCloseBlobs(blobs, mergeDistance) {
    const merged = [];
    const used = new Set();
    for (let i = 0; i < blobs.length; i++) {
      if (used.has(i)) continue;
      const group = [blobs[i]];
      used.add(i);
      for (let j = i + 1; j < blobs.length; j++) {
        if (used.has(j)) continue;
        if (Math.hypot(blobs[i].cx - blobs[j].cx, blobs[i].cy - blobs[j].cy) < mergeDistance) {
          group.push(blobs[j]); used.add(j);
        }
      }
      const totalArea = group.reduce((s, b) => s + b.area, 0);
      merged.push({
        cx: group.reduce((s, b) => s + b.cx * b.area, 0) / totalArea,
        cy: group.reduce((s, b) => s + b.cy * b.area, 0) / totalArea,
        area: totalArea,
        radius: Math.sqrt(totalArea / Math.PI),
        minX: Math.min(...group.map(b => b.minX)),
        maxX: Math.max(...group.map(b => b.maxX)),
        minY: Math.min(...group.map(b => b.minY)),
        maxY: Math.max(...group.map(b => b.maxY)),
      });
    }
    return merged;
  }

  // ========== 行检测（借鉴 e-Braille Tales 思路） ==========
  // 对二值图按行求和，找出像素密集的水平带 → 盲文行

  function detectLines(binary, width, height, blobs) {
    // 方法：用 blob 的 Y 坐标聚类成行，比纯像素求和更鲁棒
    // 先估算点间距
    const dotSpacing = estimateDotSpacing(blobs);
    if (!dotSpacing) return { lines: [], dotSpacing: 0 };

    // 按 Y 排序所有 blob
    const sorted = [...blobs].sort((a, b) => a.cy - b.cy);

    // 聚类成物理点行（同一水平线上的点）
    const dotRows = [];
    let curRow = { blobs: [sorted[0]], cy: sorted[0].cy };
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].cy - curRow.cy < dotSpacing * 0.55) {
        curRow.blobs.push(sorted[i]);
        curRow.cy = curRow.blobs.reduce((s, b) => s + b.cy, 0) / curRow.blobs.length;
      } else {
        dotRows.push(curRow);
        curRow = { blobs: [sorted[i]], cy: sorted[i].cy };
      }
    }
    dotRows.push(curRow);

    // 将物理点行分组为盲文行（每个盲文行最多3个物理点行）
    // 盲文行内点行间距 ≈ dotSpacing，盲文行之间间距 > dotSpacing * 2
    const brailleLines = [];
    let li = 0;
    while (li < dotRows.length) {
      const line = { dotRows: [dotRows[li]], blobs: [...dotRows[li].blobs] };
      while (li + 1 < dotRows.length && line.dotRows.length < 3 &&
             (dotRows[li + 1].cy - dotRows[li].cy) < dotSpacing * 1.8) {
        li++;
        line.dotRows.push(dotRows[li]);
        line.blobs.push(...dotRows[li].blobs);
      }
      // 计算行的 Y 范围
      line.yMin = Math.min(...line.blobs.map(b => b.cy)) - dotSpacing * 0.5;
      line.yMax = Math.max(...line.blobs.map(b => b.cy)) + dotSpacing * 0.5;
      line.yCenters = line.dotRows.map(r => r.cy);
      brailleLines.push(line);
      li++;
    }

    return { lines: brailleLines, dotSpacing };
  }

  function estimateDotSpacing(blobs) {
    if (blobs.length < 2) return 0;
    // 每个点到最近邻的距离
    const dists = [];
    for (const b of blobs) {
      let minD = Infinity;
      for (const o of blobs) {
        if (o === b) continue;
        const d = Math.hypot(b.cx - o.cx, b.cy - o.cy);
        if (d < minD) minD = d;
      }
      dists.push(minD);
    }
    dists.sort((a, b) => a - b);
    // 取中位数作为点间距
    return dists[Math.floor(dists.length / 2)];
  }

  // ========== 行内字符网格分割 ==========

  function segmentLineIntoCells(line, dotSpacing) {
    const blobs = line.blobs;
    if (!blobs.length) return [];

    // 行内所有 blob 按 X 排序
    const sorted = [...blobs].sort((a, b) => a.cx - b.cx);

    // 聚类成 X 列
    const xCols = [];
    let curCol = { blobs: [sorted[0]], cx: sorted[0].cx };
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].cx - curCol.cx < dotSpacing * 0.55) {
        curCol.blobs.push(sorted[i]);
        curCol.cx = curCol.blobs.reduce((s, b) => s + b.cx, 0) / curCol.blobs.length;
      } else {
        xCols.push(curCol);
        curCol = { blobs: [sorted[i]], cx: sorted[i].cx };
      }
    }
    xCols.push(curCol);

    // 将 X 列配对为盲文方（左列 + 右列）
    // 盲文方内两列间距 ≈ dotSpacing，方与方之间 > dotSpacing * 1.5
    const cellGroups = [];
    let ci = 0;
    while (ci < xCols.length) {
      if (ci + 1 < xCols.length &&
          (xCols[ci + 1].cx - xCols[ci].cx) < dotSpacing * 1.3) {
        // 两列配对
        cellGroups.push({ left: xCols[ci], right: xCols[ci + 1] });
        ci += 2;
      } else {
        // 单列
        cellGroups.push({ left: xCols[ci], right: null });
        ci++;
      }
    }

    // 确定行内的 Y 行中心（最多3行）
    const yCenters = line.yCenters.slice().sort((a, b) => a - b);

    // 为每个列对提取点位编号
    const cells = [];
    for (const cg of cellGroups) {
      const cell = extractCellFromGroup(cg, yCenters, dotSpacing);
      if (cell.dots.length > 0) {
        cells.push(cell);
      }
    }

    return cells;
  }

  function extractCellFromGroup(colGroup, yCenters, dotSpacing) {
    const tolerance = dotSpacing * 0.6;
    const leftX = colGroup.left.cx;
    const rightX = colGroup.right ? colGroup.right.cx : null;
    const allBlobs = [...colGroup.left.blobs, ...(colGroup.right ? colGroup.right.blobs : [])];

    const dots = [];
    const matchedBlobs = [];

    // 盲文点位:  1 4
    //            2 5
    //            3 6
    for (let ri = 0; ri < yCenters.length && ri < 3; ri++) {
      const rowY = yCenters[ri];
      for (const blob of allBlobs) {
        if (Math.abs(blob.cy - rowY) > tolerance) continue;
        // 左列
        if (Math.abs(blob.cx - leftX) < tolerance) {
          const dotNum = ri + 1;
          if (!dots.includes(dotNum)) { dots.push(dotNum); matchedBlobs.push(blob); }
        }
        // 右列
        if (rightX !== null && Math.abs(blob.cx - rightX) < tolerance) {
          const dotNum = ri + 4;
          if (!dots.includes(dotNum)) { dots.push(dotNum); matchedBlobs.push(blob); }
        }
      }
    }

    // 如果只有单列且没有右列参考，尝试判断这些点是左列还是右列
    if (rightX === null && dots.length > 0) {
      // 看这些点的 X 坐标相对于相邻方的位置
      // 暂时保持当前判断（默认左列）
    }

    dots.sort((a, b) => a - b);
    const cx = rightX !== null ? (leftX + rightX) / 2 : leftX;
    const cy = yCenters.length ? yCenters.reduce((s, v) => s + v, 0) / yCenters.length : 0;
    return { dots, blobs: matchedBlobs, centerX: cx, centerY: cy };
  }

  // ========== 完整分组流程 ==========

  function groupIntoCells(blobs) {
    if (blobs.length < 2) return [];

    const { lines, dotSpacing } = detectLines(null, 0, 0, blobs);
    if (!lines.length || !dotSpacing) return [];

    const allCells = [];
    for (const line of lines) {
      const lineCells = segmentLineIntoCells(line, dotSpacing);
      allCells.push(...lineCells);
    }

    // 按阅读顺序排序（先上后下，同行先左后右）
    allCells.sort((a, b) => {
      const yDiff = a.centerY - b.centerY;
      if (Math.abs(yDiff) > dotSpacing * 1.5) return yDiff;
      return a.centerX - b.centerX;
    });

    return allCells;
  }

  // ========== 完整识别流水线 ==========

  async function recognize(file, params = {}) {
    const p = { ...DEFAULT_PARAMS, ...params };
    const steps = [];

    const { canvas, ctx, width, height } = await loadImageToCanvas(file);
    const imageData = ctx.getImageData(0, 0, width, height);
    steps.push({ name: '加载图片', done: true });

    const gray = getGrayscale(imageData);
    steps.push({ name: '灰度化', done: true });

    const binary = adaptiveThreshold(gray, width, height, p.blockSize, p.thresholdSensitivity);
    steps.push({ name: '二值化', done: true });

    const cleaned = morphologyClean(binary, width, height);
    steps.push({ name: '形态学清理', done: true });

    let blobs = detectBlobs(cleaned, width, height, p);
    blobs = mergeCloseBlobs(blobs, p.dotMergeDistance);
    steps.push({ name: '点位检测', done: true, count: blobs.length });

    const { lines, dotSpacing } = detectLines(cleaned, width, height, blobs);
    steps.push({ name: '行检测', done: true, count: lines.length });

    const cells = [];
    for (const line of lines) {
      cells.push(...segmentLineIntoCells(line, dotSpacing));
    }
    cells.sort((a, b) => {
      const yDiff = a.centerY - b.centerY;
      if (Math.abs(yDiff) > dotSpacing * 1.5) return yDiff;
      return a.centerX - b.centerX;
    });
    steps.push({ name: '盲文方分组', done: true, count: cells.length });

    return {
      width, height, gray, binary: cleaned, blobs, cells, steps, lines, dotSpacing,
      dotsList: cells.map(c => c.dots),
      originalCanvas: canvas,
    };
  }

  // ========== 可视化 ==========

  function drawCellBoundaries(targetCanvas, originalCanvas, blobs, cells, lines, dotSpacing) {
    targetCanvas.width = originalCanvas.width;
    targetCanvas.height = originalCanvas.height;
    const ctx = targetCanvas.getContext('2d');
    ctx.drawImage(originalCanvas, 0, 0);

    // 画行边界
    if (lines && lines.length) {
      ctx.strokeStyle = 'rgba(34,197,94,0.4)';
      ctx.lineWidth = 1;
      for (const line of lines) {
        ctx.strokeRect(0, line.yMin, originalCanvas.width, line.yMax - line.yMin);
      }
    }

    // 画检测到的点
    for (const blob of blobs) {
      ctx.beginPath();
      ctx.arc(blob.cx, blob.cy, blob.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 画盲文方边界和 2×3 网格
    const ds = dotSpacing || 10;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell.blobs.length) continue;

      const padding = 4;
      const minX = Math.min(...cell.blobs.map(b => b.cx - b.radius)) - padding;
      const maxX = Math.max(...cell.blobs.map(b => b.cx + b.radius)) + padding;
      const minY = Math.min(...cell.blobs.map(b => b.cy - b.radius)) - padding;
      const maxY = Math.max(...cell.blobs.map(b => b.cy + b.radius)) + padding;

      // 蓝色边框
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

      // 标注序号和点位
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${i + 1}:[${cell.dots.join('')}]`, minX, minY - 3);
    }
  }

  function drawGrayscale(targetCanvas, gray, width, height) {
    targetCanvas.width = width; targetCanvas.height = height;
    const ctx = targetCanvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    for (let i = 0; i < gray.length; i++) {
      const j = i * 4;
      imgData.data[j] = imgData.data[j+1] = imgData.data[j+2] = gray[i];
      imgData.data[j+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function drawBinary(targetCanvas, binary, width, height) {
    targetCanvas.width = width; targetCanvas.height = height;
    const ctx = targetCanvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    for (let i = 0; i < binary.length; i++) {
      const j = i * 4;
      const v = binary[i] ? 0 : 255;
      imgData.data[j] = imgData.data[j+1] = imgData.data[j+2] = v;
      imgData.data[j+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return {
    recognize,
    drawGrayscale,
    drawBinary,
    drawCellBoundaries,
    DEFAULT_PARAMS,
  };

})();
