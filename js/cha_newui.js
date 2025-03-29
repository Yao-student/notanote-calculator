console.log("Updated at 2025.03.29");

document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.container');
    container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
});

/* ========== 全局变量 ========== */
let columns = 3; // 默认三列布局

/* ========== DOMContentLoaded 事件 ========== */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
});

/* ========== 核心流程 ========== */
// 解析时先判断第一行是否为用户名（不含",,,"）
// 如果第一行中含有 ",,," 则认为整个文件都是数据，用户名设为 "UserName"
function processData() {
    const rawData = document.getElementById('inputData').value;
    const lines = rawData.split('\n').map(line => line.trim()).filter(line => line !== "");
    if (lines.length === 0) {
      alert("文件为空，请检查内容！");
      return;
    }
    let username, dataStartIndex;
    if (lines[0].indexOf(",,,") === -1) {
      // 第一行为用户名
      username = lines[0];
      dataStartIndex = 1;
    } else {
      username = "UserName";
      dataStartIndex = 0;
    }
    const items = lines.slice(dataStartIndex).map(processSong).filter(item => item !== null);
    
    // 全局保存解析后的结果
    window.processedItems = items;
    
    // 清空输出区域，避免多次解析时内容堆叠
    document.getElementById('output').innerHTML = '';
    
    // 根据单曲 nrk 值降序排序
    items.sort((a, b) => b.singleNrkRaw - a.singleNrkRaw);
    
    // 显示用户信息（显示用户 nrk 平均值）
    drawUserInfo(username, items);
    // 绘制所有卡片
    items.forEach(drawCard);
    // 格式化写回存档（新格式：第一行用户名，其余每行一条数据）
    formatInput(username, items);
}

/* ========== 工具函数 ========== */
// 此处不再强制将所有数据合并为一行
function cleanInputData(data) {
    return data;
}

// 新存档格式解析：
// 每一行字段以 ",,," 分隔
// 支持 5 字段（含游玩分数）或 4 字段（未填写游玩分数）
function processSong(line) {
  const parts = line.split(',,,').map(s => s.trim());
  if (parts.length === 4) {
    // 格式：曲名, 等级, 定数, 准确率（游玩分数缺失）
    const title = parts[0];
    const grade = parts[1];
    const constantVal = parseFloat(parts[2]);
    const bestScore = null; // 未填写
    const accuracyVal = parseFloat(parts[3]);
    return calcSongData(title, grade, constantVal, bestScore, accuracyVal);
  } else if (parts.length >= 5) {
    // 格式：曲名, 等级, 定数, 游玩分数, 准确率
    const title = parts[0];
    const grade = parts[1];
    const constantVal = parseFloat(parts[2]);
    // 如果游玩分数字段为空，则视为未填写
    const scoreField = parts[3];
    const bestScore = scoreField !== "" ? parseInt(scoreField, 10) : null;
    const accuracyVal = parseFloat(parts[4]);
    return calcSongData(title, grade, constantVal, bestScore, accuracyVal);
  } else {
    alert("数据行格式错误，请检查每行至少包含：曲名, 等级, 定数, 准确率！");
    return null;
  }
}
function calculateLevel(score, acc) {
    if (score >= 1000000) {
      return acc === 100 ? 0 : 1; // X: 1000000 且 100% -> 0, 否则是 S -> 1
    } else if (score >= 990000) {
      return 2; // S
    } else if (score >= 970000) {
      return 3; // A+
    } else if (score >= 950000) {
      return 4; // A
    } else if (score >= 930000) {
      return 5; // A-
    } else if (score >= 910000) {
      return 6; // B
    } else if (score >= 880000) {
      return 7; // C
    } else {
      return 8; // F
    }
  }
  
// 计算单曲 nrk，并构造记录对象
function calcSongData(title, grade, constantVal, bestScore, accuracyVal) {
  // 将准确率从百分数转为小数
  const accFraction = accuracyVal / 100;
  const singleNrkRaw = ((Math.exp(2 * accFraction) - 1) / (Math.exp(2) - 1)) * (constantVal + 5);
  const bestLevel = (bestScore !== null)
  ? calculateLevel(bestScore, accuracyVal)
  : 8; // 未填写分数默认 F

  
  return {
    singleNrkRaw: singleNrkRaw,
    singleNrk: singleNrkRaw.toFixed(2),
    constant: constantVal,
    name: title,
    grade: grade,
    bestScore: bestScore, // 若为 null 则显示时以 "-" 替代
    bestAccuracy: accuracyVal, // 保留原始百分数（不带 %）
    bestLevel: bestLevel
  };
}

// 将当前数据写回存档文本：
// 第一行为用户名，其余每行为：曲名,,,等级,,,定数,,,游玩分数(选填),,,准确率
function formatInput(username, items) {
  const formattedItems = items.map(item => 
    `${item.name},,,${item.grade},,,${item.constant},,,${item.bestScore !== null ? item.bestScore : ""},,,${item.bestAccuracy}`
  ).join('\n');
  
  document.getElementById('inputData').value = username + '\n' + formattedItems;
}

/* ========== 显示用户信息 ========== */
function calculateAverageReality(results) {
  const sorted = results
    .filter(item => item.singleNrkRaw > 0)
    .sort((a, b) => b.singleNrkRaw - a.singleNrkRaw)
    .slice(0, 26);

  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < sorted.length; i++) {
    const weight = 1 - 0.02 * i; // ω_i = 100% - 2%(i - 1)
    weightedSum += sorted[i].singleNrkRaw * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? (weightedSum / weightSum).toFixed(2) : '0.00';
}

  

function drawUserInfo(username, results) {
  const userInfoDiv = document.getElementById('userInfo');
  const usercontainer = document.getElementById('usercontainer');
  usercontainer.style.display = 'block';
  const avg = calculateAverageReality(results);
  userInfoDiv.innerHTML = `${username} ${avg}`;
  window.username = username;
  window.average = avg;
}

/* ========== 绘制单张卡片 ========== */
function drawCard(result, index) {
    const outputDiv = document.getElementById('output');
    const card = document.createElement('div');
    card.classList.add('card');

    // 背景色设置（目前 bestLevel 固定为 0，可根据 grade 后续调整）
    card.style.background = result.bestLevel === 0
        ? 'linear-gradient(135deg, #8400C3,#3030B0,#2e61ef)'
        : 'linear-gradient(45deg, #4028d7, #8839fe)';
    card.style.color = '#DDA0DD';

    // 计算基础字号
    let baseFontSize = (window.innerWidth * window.innerHeight) / 50000;
    if (baseFontSize >= 10) {
      baseFontSize = 10;
    }
    let fontSize = (baseFontSize * 4) / columns;
    const marginBottom = (baseFontSize * 4) / columns;

    // 标题
    const title = document.createElement('div');
    title.classList.add('title');
    title.innerText = result.name;
    card.appendChild(title);

    const maxCardWidth = card.offsetWidth * 0.7;
    title.style.fontSize = `${fontSize * 1.3}px`;
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';

    // 若标题过长则减小字号
    while (title.offsetWidth > maxCardWidth && fontSize > 2) {
      fontSize--;
      title.style.fontSize = `${fontSize}px`;
    }

    // 信息行：显示等级、定数与单曲 nrk
    const info = document.createElement('div');
    info.classList.add('info');
    Object.assign(info.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      overflow: 'visible',
      textOverflow: 'ellipsis',
      fontSize: `${fontSize}px`,
      marginBottom: `${marginBottom}px`
    });

    const constantText = `${parseFloat(result.constant).toFixed(1)} -> `;
    const rankSpan = document.createElement('span');
    rankSpan.innerHTML = result.singleNrk;
    rankSpan.style.color = '#ffffff';

    info.innerHTML = `${result.grade} ${constantText}`;
    info.appendChild(rankSpan);

    // 显示准确率（自动添加百分号）
    const accuracySpan = document.createElement('span');
    accuracySpan.classList.add('accuracy');
    accuracySpan.innerHTML = `   ${result.bestAccuracy}%`;
    Object.assign(accuracySpan.style, {
      marginLeft: 'auto',
      whiteSpace: 'nowrap',
      overflow: 'visible'
    });
    info.appendChild(accuracySpan);

    card.appendChild(info);

    // 分数显示：若未填写游玩分数则显示 "-"
    const score = document.createElement('div');
    score.classList.add('score');
    score.innerText = result.bestScore !== null ? result.bestScore : "-";
    score.style.fontSize = `${fontSize * 2.5}px`;
    score.style.marginBottom = `${marginBottom}px`;
    score.style.whiteSpace = 'nowrap';
    score.style.overflow = 'hidden';
    Object.assign(score.style, {
        background: 'linear-gradient(to right, #12a9fb, #ee80ff)',
        color: 'transparent',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text'
    });
    card.appendChild(score);

    // 序号显示
    const indexElem = document.createElement('div');
    indexElem.classList.add('index');
    indexElem.innerText = `#${index + 1}`;
    Object.assign(indexElem.style, {
      fontSize: `${fontSize}px`,
      marginBottom: `${marginBottom}px`,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });
    card.appendChild(indexElem);

    outputDiv.appendChild(card);
}

/* ========== 列数调整 ========== */
function changeColumns(delta) {
    columns = Math.max(1, columns + delta);
    document.querySelector('.container').style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    document.getElementById('output').innerHTML = ''; 
    processData();
}

/* ========== 文件上传及处理 ========== */
function upl() {
  document.getElementById('fileupLoad').click();
}

document.getElementById('fileupLoad').addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = () => {
      handleFile(reader.result, file.name);
  };
  reader.onerror = () => alert("读取文件失败\nFailed to read the file.");
  // 无论文件类型，均按纯文本读取
  reader.readAsText(file);
});

function handleFile(content, fileName) {
  // 将所有文件内容当作纯文本解析
  document.getElementById('inputData').value = content;
  processData();
}

/* ========== 下载图片 (含背景、卡片等) ========== */
function downloadImage() {
  genPicDialog();
  console.log("opening genPicDialog");
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 2200;
  const ctx = canvas.getContext('2d');

  loadImage('./jpgs/查分图.jpg')
    .catch(() => null)
    .then(bgImage => {
      if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
      ctx.fillRect(0, 50, canvas.width, 200);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      ctx.moveTo(550, 250);
      ctx.lineTo(650, 50);
      ctx.stroke();

      ctx.font = '25px Arial';
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`Player: ${window.username}`, 660, 100);
      ctx.fillText(`Nrk: ${window.average}`, 660, 150);
      const now = new Date();
      const dateStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
      ctx.fillText(`Date: ${dateStr}`, 660, 200);

      ctx.font = '50px Arial';
      ctx.fillText('Nrk-calculator', 100, 130);
      ctx.font = '30px Arial';
      ctx.fillText('---', 100, 180);

      preloadImages(ctx, canvas);
    });

  function preloadImages(ctx, canvas) {
    const items = window.processedItems || [];
    const maxItems = Math.min(22, items.length);
    const imagePromises = [];

    for (let i = 0; i < maxItems; i++) {
      const encodedName = encodeURIComponent(items[i].name);
      const imgPath = `./jpgs/${encodedName}.jpg`;
      const rankImgPath = `./jpgs/${items[i].bestLevel}.png`;
      
      const songImgPromise = loadImage(imgPath).catch(() => loadImage('./jpgs/NYA.jpg'));
      const rankImgPromise = loadImage(rankImgPath).catch(() => null);
      
      imagePromises.push(Promise.all([songImgPromise, rankImgPromise]));
    }

    Promise.all(imagePromises).then(images => drawCards(ctx, canvas, items, images));
  }

  function drawCards(ctx, canvas, items, images) {
    const scale = 1.3;
    const cardWidth = 340 * scale;
    const cardHeight = 100 * scale;
    const imgWidth = 142 * scale;
    const imgHeight = 80 * scale;
    const rankIconSize = 70 * scale;

    const xOffset = 110;
    const yOffset = 350;
    const columnSpacing = 400 * scale;
    const rowSpacing = 125 * scale;

    items.slice(0, 22).forEach((item, i) => {
      const x = xOffset + (i % 2) * columnSpacing;
      const y = yOffset + Math.floor(i / 2) * rowSpacing - ((i % 2 === 0) ? 50 : 0);

      ctx.fillStyle = 'rgba(128, 128, 128, 0.4)';
      ctx.fillRect(x, y, cardWidth, cardHeight);

      ctx.font = `${13 * scale}px Arial`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = (i < 20) ? '#FAFAFA' : '#C9C9C9';
      ctx.fillText(`#${i + 1}`, x + cardWidth - 10, y + 5 * scale);

      let strScore = item.bestScore !== null ? item.bestScore.toString().padStart(7, '0') : "-";

      let scoreColor = item.bestLevel < 2 ? 
        ctx.createLinearGradient(x, y + 40 * scale, x, y + 70 * scale) :
        (item.bestLevel === 2 ? '#90CAEF' : '#FFFFFF');
      
      if (typeof scoreColor !== 'string') {
        scoreColor.addColorStop(0, '#99C5FB');
        scoreColor.addColorStop(1, '#D8C3FA');
      }

      ctx.font = `${30 * scale}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillStyle = scoreColor;
      ctx.fillText(strScore, x + 160 * scale, y + 40 * scale);

      const maxTextWidth = 200;
      let currentFontSize = 19 * scale;
      ctx.font = `${currentFontSize}px Arial`;
      let textWidth = ctx.measureText(item.name).width;
      while (textWidth > maxTextWidth && currentFontSize > 10) {
        currentFontSize--;
        ctx.font = `${currentFontSize}px Arial`;
        textWidth = ctx.measureText(item.name).width;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(item.name, x + 163 * scale, y + 18 * scale);

      ctx.font = `${15 * scale}px Arial`;
      ctx.fillStyle = '#FFFFFF';
      const accText = `${item.bestAccuracy}%`;
      ctx.fillText(`${item.grade} ${parseFloat(item.constant).toFixed(1)} > ${item.singleNrk}   ${accText}`, x + 160 * scale, y + 75 * scale);

      ctx.drawImage(images[i][0], x + 10 * scale, y + 10 * scale, imgWidth, imgHeight);

      if (images[i][1]) {
        ctx.drawImage(images[i][1], x + 270 * scale, y + 20 * scale, rankIconSize, rankIconSize);
      }
    });

    exportImage(canvas);
  }

  function exportImage(canvas) {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:\-T]/g, '_').split('.')[0];
    link.download = `output_${timestamp}.png`;
    link.click();
    document.getElementById('picgen').style.display = 'none';
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
}
