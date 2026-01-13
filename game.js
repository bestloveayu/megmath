const SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzD9U8pBqSDP7sl7vdbip6fW4Ckhsm8b8sC-q8tkr7yKMTFKw6kkgsKlIpKvL0ItZAw/exec"; // 你的 Apps Script Web App URL（一定要填）

const TOL_DEFAULT = 0.02;
const TOL_P = 0.002;
const MAX_HP = 5;

function toNum(v){
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(/^\.([0-9]+)/, "0.$1");
  return Number(s);
}
function approxEqual(a, b, tol){
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tol;
}
const el = (id)=>document.getElementById(id);

// ===== Overlay =====
function overlayShow({badge="通知", title="", html="", actions=[], fine="" , inputsHtml=""}){
  document.body.classList.add("overlay-on");
  el("overlayBadge").textContent = badge;
  el("overlayTitle").textContent = title;
  el("overlayText").innerHTML = html;

  const inputs = el("overlayInputs");
  if (inputsHtml){
    inputs.classList.remove("hidden");
    inputs.innerHTML = inputsHtml;
  }else{
    inputs.classList.add("hidden");
    inputs.innerHTML = "";
  }

  const act = el("overlayActions");
  act.innerHTML = "";
  actions.forEach(a=>{
    const b = document.createElement("button");
    b.className = a.className || "btn primary";
    b.textContent = a.text || "OK";
    b.addEventListener("click", a.onClick);
    act.appendChild(b);
  });

  el("overlayFine").innerHTML = fine || "";
  el("overlay").classList.remove("hidden");
}
function overlayHide(){
  document.body.classList.remove("overlay-on");
  el("overlay").classList.add("hidden");

  // ✅ 每次關閉敘事視窗時，允許再次提交（避免卡死）
  submitting = false;
  const btn = el("submitBtn");
  if (btn) btn.disabled = false;
}

// ===== Feedback =====
function shakeScreen(){
  const root = el("appRoot");
  root.classList.add("shake");
  setTimeout(()=>root.classList.remove("shake"), 520);
}
function flashBad(){
  const root = el("appRoot");
  root.classList.add("flash-red");
  setTimeout(()=>root.classList.remove("flash-red"), 260);
}
function flashOk(){
  const root = el("appRoot");
  root.classList.add("glow-ok");
  setTimeout(()=>root.classList.remove("glow-ok"), 320);
}

// ===== Levels =====
const LEVELS = [
  {
    id: 1,
    title: "第一關：黏液王的試煉",
    monster: "黏液王",
    art: "🟩",
    img: "image/slime.png",
    hint: "遠征隊員加緊訓練，希望訓練後能打敗黏液王。",
    mission:
`你拿到的資料是遠征隊員們在兩個時間點的訓練表現。
先確認清楚是不是來自同一群人。`,
    story1:
`黏液王盤踞在入口廊道，黏液像鎖鏈纏住每一次揮擊。遠征隊為了救回毛丸，只能盡快確認「訓練是否真的有用」：勇者在訓練前後各測一次命中率，若命中率確實上升，隊伍就能在擊敗黏液王。`,
    story2:
`學術任務：比較勇者們在兩次測量的平均命中率是否有顯著差異，並回報檢定統計量與效果量。`,
    baseInputs: [
      { key:"t", label:"t 值", answer:8.73, tol:TOL_DEFAULT },
      { key:"d", label:"效果量（Cohen’s d）", answer:1.46, tol:TOL_DEFAULT }
    ],
    extraInput: null
  },

  {
    id: 2,
    title: "第二關：鏡靈的恐懼迷宮",
    monster: "鏡靈",
    art: "🪞",
    img: "image/mirror.png",
    hint: "樣本不大。可能不符合常態分佈。",
    mission:
`你拿到的是同一批勇者的兩次恐懼回報。
樣本不大，可能不符合常態分佈。`,
    // ✅ 故事更新
    story1:
`鏡靈會反射勇者的情緒，讓遠征隊的恐懼感逐漸加深，最後發狂逃跑，因此，遠征隊嘗試使用安定咒語來克服恐懼。若恐懼下降，才能繼續勇往直前，毛丸的牢籠也會更接近。`,
    // ✅ 學術任務更新（25人）
    story2:
`學術任務：比較遠征隊勇者25人，在使用安定咒語前與使用後的恐懼值是否顯著下降，回報 z 與 Wilcoxon 的 W。`,

    baseInputs: [
      { key:"z", label:"z 值", answer:3.62, tol:TOL_DEFAULT },
      { key:"w", label:"W 值", answer:153, tol:0.6 }
    ],
    extraInput: { key:"fearBefore", label:"加強挑戰：戰鬥後的恐懼感（平均數）", answer:2.21, tol:0.03 }
  },

  {
    id: 3,
    title: "第三關：逃離裂喉獸，雙路線突圍",
    monster: "裂喉獸群",
    art: "🐺",
    img: "image/wolves.png",
     // ✅ 提示更新
    hint: "眼前出現兩條岔路，遠征隊要兵分兩路前進，為了爭取時間，必須找出穿越速度最快的路徑。",
    mission:
`眼前出現兩條岔路，遠征隊要兵分兩路前進。
為了爭取時間，必須找出穿越速度最快的路徑。`,
    // ✅ 路徑命名更新：路徑A:濕冷岩道、路徑B:地下河流
    story1:
`裂谷像把王國剖開，遠征隊兵分兩路：路徑A「濕冷岩道」與路徑B「地下河流」。你手上的數據是每位隊員穿越路徑所花的時間，越短越能更快接近毛丸。`,
    // ✅ 學術任務更新
    story2:
`學術任務：比較兩條路徑的行進時間是否有顯著差異，以及哪條路徑需要的時間最短，回報 U 與 p。`,

    baseInputs: [
      { key:"u", label:"U 值", answer:446, tol:1.1 },
      { key:"p", label:"p 值", answer:0.010, tol:TOL_P }
    ],
    extraInput: { key:"meanPathB", label:"加強挑戰：路徑B（地下河流）平均時間", answer:67.66, tol:0.05 }
  },

  {
    id: 4,
    title: "第四關：最終魔王降臨",
    monster: "艾瑞克魔王",
    art: "🧿",
    img: "image/boss.png",
   hint: "對抗最後的魔王，需要確認使用哪種神器才能更有效提升勇者的戰鬥力。",
    mission:
`對抗最後的魔王，需要確認使用哪種神器才能更有效提升勇者的戰鬥力。`,
    // ✅ 故事更新 + 神器名
    story1:
`最終大魔王嘴裡發出光芒，準備吞掉勇者，你決定使用「符文寶石」或「星辰羅盤」來強化隊員戰鬥力，但時間不夠了，你必須確定哪種神器最有效，沒有失敗重來的機會!`,
    // ✅ 學術任務更新 + 欄位名更新
    story2:
`學術任務：檔案中有過去使用過兩種神器的隊員能力值，分為使用前與使用後，請檢定兩種神器對使用後能力值的差異，以確定哪種神器幫助更大。先檢驗交互作用F，再回報主效應 F 與星辰羅盤的調整後平均數。`,

    baseInputs: [
      { key:"fInt", label:"交互作用 F", answer:0.74, tol:0.05 },
      { key:"fMain", label:"Artifact 主效應 F", answer:59.64, tol:0.15 },
      { key:"adjStar", label:"使用星辰羅盤後的調整後平均數", answer:74.80, tol:0.03 }
    ],
    extraInput: null
  }
];

// ===== State =====
const state = {
  playerName: "",
  levelIndex: 0,
  injured: false,
  hp: MAX_HP,
  mistakes: 0,
  correctCount: 0,
  totalCount: 0,
  log: {},

  // ✅ 通關評分（成功結局會填）
  finalRank: "",
  finalTitle: ""
};

function setHUD(){
  const L = LEVELS[state.levelIndex];
  el("hudName").textContent = state.playerName || "-";
  el("hudLevel").textContent = String(L.id);
  el("hudStatus").textContent = state.injured ? "受傷" : "健康";
  el("hudHP").textContent = `${state.hp}/${MAX_HP}`;
  el("hudMistakes").textContent = String(state.mistakes);
  el("hudCorrect").textContent = String(state.correctCount);
  el("hudTotal").textContent = String(state.totalCount);
}

function showResult(msg, type){
  const box = el("resultBox");
  box.classList.remove("ok","warn","danger");
  if (type === "ok") box.classList.add("ok");
  if (type === "warn") box.classList.add("warn");
  if (type === "danger") box.classList.add("danger");
  box.textContent = msg;
}

function getCurrentExpectedInputs(){
  const L = LEVELS[state.levelIndex];
  const inputs = [...L.baseInputs];
  if (state.injured && L.extraInput && L.id !== 4) inputs.push(L.extraInput);
  return inputs;
}

// ===== Sheets logging =====
async function sendToSheets(payload){
  if (!SHEETS_WEBAPP_URL) return;
  try{
    await fetch(SHEETS_WEBAPP_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload),
      mode:"no-cors"
    });
  }catch(e){
    console.warn("Sheets logging failed:", e);
  }
}

// ===== Word upload helpers =====
function fileToBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const res = reader.result; // data:...;base64,AAAA
      const base64 = String(res).split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadWord(file){
  if (!SHEETS_WEBAPP_URL) return;
  const base64 = await fileToBase64(file);

  const acc = state.totalCount > 0 ? (state.correctCount / state.totalCount) : 0;

  await sendToSheets({
    ts: new Date().toISOString(),
    action: "uploadWord",
    playerName: state.playerName,
    level: 0,
    levelTitle: "FINAL",
    injured: state.injured,
    hp: state.hp,
    mistakes: state.mistakes,
    gotMap: {},
    flags: {},
    conclusion: "",

    accuracy: acc,
    rank: state.finalRank,
    title: state.finalTitle,

    wordFileName: file.name,
    wordMimeType: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    wordBase64: base64
  });
}

function renderLevel(){
  const L = LEVELS[state.levelIndex];

  el("levelTitle").textContent = L.title;
  el("monsterName").textContent = L.monster;

  // ✅ 用圖片取代 emoji（monsterImg 需存在於 HTML）
  const imgEl = document.getElementById("monsterImg");
  if (imgEl){
    imgEl.src = L.img || "";
    imgEl.alt = L.monster || "monster";
    imgEl.onerror = ()=>{
      // fallback 回 emoji
    el("monsterArt").textContent = L.art;
};

  }else{
    el("monsterArt").textContent = L.art;
  }

  el("hpFill").style.width = "100%";
  el("levelHint").textContent = L.hint;
  el("missionText").textContent = L.mission;

  el("storyText").innerHTML = `
    <p>${L.story1}</p>
    <p class="acad">${L.story2}</p>
  `;

  const wrap = el("inputs");
  wrap.innerHTML = "";

  const expected = getCurrentExpectedInputs();
  expected.forEach(inp=>{
    const label = document.createElement("label");
    label.className = "field";
    label.innerHTML = `
      <span>${inp.label}</span>
      <input data-key="${inp.key}" type="text" inputmode="decimal" placeholder="輸入數值…">
    `;
    wrap.appendChild(label);
  });

  el("conclusionField").classList.remove("hidden");
  el("conclusion").value = "";

  el("submitBtn").disabled = false;
  submitting = false;

  showResult("請分析後輸入數值並提交。", "neutral");
  setHUD();
}

function buildCompareRows(){
  const rows = [];
  for (const L of LEVELS){
    const rec = state.log[L.id];
    if (!rec){
      rows.push(`<tr><td>${L.id}</td><td>${L.title}</td><td colspan="4">（無紀錄）</td></tr>`);
      continue;
    }
    for (const exp of rec.expected){
      const got = rec.inputs[exp.key] ?? "";
      const ok = rec.correctFlags[exp.key] ? "✅" : "❌";
      rows.push(`
        <tr>
          <td>${L.id}</td>
          <td>${rec.levelTitle}</td>
          <td>${exp.label}</td>
          <td>${got}</td>
          <td>${exp.answer}</td>
          <td>${ok}</td>
        </tr>
      `);
    }
  }
  return rows.join("");
}

// ===== 分歧結局（第4關未全對） =====
function endingBranchBoss(correctThis){
  const rows = buildCompareRows();

  let title = "結局（失敗）";
  let story = "";

  if (correctThis === 2){
    title = "結局（苦戰撤退）";
    story = `
      <p>🧿 你已看見魔王的弱點，但仍然差了一步。</p>
      <p>🐾 毛丸被拖入陰影深處消失了，但你拾起一枚星紋碎片，像尚未燃盡的地圖。</p>
      <p class="sub">你失去的是戰果，你保住的是線索。下一次，你會更準確。</p>
    `;
  } else if (correctThis === 1){
    title = "結局（王都失守）";
    story = `
      <p>🌑 你只看清了一小部分真相，魔王趁隙攻擊了你。</p>
      <p>🐾 毛丸被帶走，王都鐘聲熄滅，街燈被風一盞盞吹滅。</p>
      <p class="sub">遠征隊仍活著，但王國失守。你只能從頭再來。</p>
    `;
  } else {
    title = "結局（王國毀滅）";
    story = `
      <p>💥 你一步踏錯，魔王像潮水吞沒一切。</p>
      <p>🐾 毛丸的牢籠被黑影拖走，尖叫聲消失在石壁縫隙。</p>
      <p>🏰 城牆崩裂，王國化為灰燼。你只剩重新開始的機會。</p>
    `;
  }

  overlayShow({
    badge:"結局",
    title,
    html: `
      ${story}
      <div style="margin-top:14px;text-align:left;max-height:280px;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px;background:rgba(0,0,0,.18);">
        <div style="text-align:center;color:rgba(255,255,255,.85);margin-bottom:8px;">各關輸入與正確答案對照</div>
        <table class="table">
          <thead>
            <tr>
              <th>關卡</th><th>關卡名稱</th><th>欄位</th><th>你的輸入</th><th>正確答案</th><th>判定</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
    actions: [
      { text:"🔁 重新開始（從第一關）", className:"btn danger", onClick: ()=>{ overlayHide(); restartGame(false); } }
    ]
  });
}

// ===== 成功結局（含：通關總結寫入 Sheets + Word 上傳 UI） =====
function endingSuccess(){
  const rows = buildCompareRows();
  const acc = state.totalCount > 0 ? (state.correctCount / state.totalCount) : 0;

  let rank = "B";
  let title = "遠征隊小白-你的統計理論還可以再熟練";
  if (acc >= 0.95){ rank="SSS"; title="毛丸救援傳奇-你可以往更進階的統計方法邁進了!"; }
  else if (acc >= 0.85){ rank="SS"; title="MEG遠征隊大隊長-你已經可以自己掌握期刊的研究設計"; }
  else if (acc >= 0.70){ rank="S"; title="戰術大師-你大致瞭解期刊使用的統計方法"; }
  else if (acc >= 0.55){ rank="A"; title="合格冒險者-你具有一定統計基礎，但需要訓練活用"; }


  // ✅ 存進 state，方便 uploadWord 一起帶出去
  state.finalRank = rank;
  state.finalTitle = title;

  // ✅ 通關總結寫入 Sheets（新增一列）
  sendToSheets({
    ts: new Date().toISOString(),
    action: "finalSummary",
    playerName: state.playerName,
    level: 0,
    levelTitle: "FINAL",
    injured: state.injured,
    hp: state.hp,
    mistakes: state.mistakes,
    gotMap: {},
    flags: {},
    conclusion: "",
    accuracy: acc,
    rank,
    title
  });

  overlayShow({
    badge:"結局",
    title:"結局（成功）",
    html: `
      <p>🔓 鎖鏈碎裂，牢籠打開，毛丸跌跌撞撞地奔向你。</p>
      <p>🐾 毛丸開心的向你撒嬌，久違的感到親切與放鬆。</p>
      <p>🏰 魔王化為灰燼，王國的霧散去，街燈再次亮起，歡笑聲回來了，貝鳥教授宣布你通過了統計試煉。</p>
      <p class="sub">你用的是推論，不是運氣。</p>

      <div style="margin-top:14px;text-align:left;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px;background:rgba(0,0,0,.18);">
        <div style="text-align:center;margin-bottom:8px;">🏅 評分與紀錄</div>
        <div>勇者：<strong>${state.playerName}</strong></div>
        <div>你的成績：<strong>${rank}</strong>「<strong>${title}</strong>」</div>
        <div>正確欄位：${state.correctCount} / ${state.totalCount}（${(acc*100).toFixed(1)}%）</div>
      </div>

      <div style="margin-top:14px;text-align:left;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px;background:rgba(0,0,0,.18);">
        <div style="text-align:center;margin-bottom:8px;">📄 上傳你的 Word 操作檔</div>
        <input id="wordFileInput" type="file" accept=".doc,.docx" />
        <div style="margin-top:10px;display:flex;gap:10px;justify-content:center;">
          <button id="uploadWordBtn" class="btn primary">上傳 Word</button>
        </div>
        <div id="uploadHint" style="margin-top:8px;text-align:center;color:rgba(255,255,255,.8);font-size:.95rem;"></div>
      </div>

      <div style="margin-top:14px;text-align:left;max-height:280px;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px;background:rgba(0,0,0,.18);">
        <div style="text-align:center;color:rgba(255,255,255,.85);margin-bottom:8px;">各關輸入與正確答案對照</div>
        <table class="table">
          <thead>
            <tr>
              <th>關卡</th><th>關卡名稱</th><th>欄位</th><th>你的輸入</th><th>正確答案</th><th>判定</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
    actions: [
      { text:"🔁 重新開始（從第一關）", className:"btn danger", onClick: ()=>{ overlayHide(); restartGame(false);} }
    ]
  });

  // ✅ overlay 出現後才綁定上傳按鈕
  setTimeout(()=>{
    const input = document.getElementById("wordFileInput");
    const btn = document.getElementById("uploadWordBtn");
    const hint = document.getElementById("uploadHint");
    if (!input || !btn) return;

    btn.onclick = async ()=>{
      const f = input.files && input.files[0];
      if (!f){
        hint.textContent = "請先選擇 .doc 或 .docx 檔案。";
        shakeScreen();
        return;
      }
      hint.textContent = "上傳中…（完成後會寫入 Logs，並存到 Drive）";
      try{
        await uploadWord(f);
        hint.textContent = "✅ 已送出上傳！請到 Google Drive 資料夾與 Logs 檢查。";
        flashOk();
      }catch(e){
        hint.textContent = "❌ 上傳失敗，請確認 WebApp URL / 部署版本 / 資料夾ID。";
        flashBad();
        shakeScreen();
      }
    };
  }, 0);
}

// ===== 每關結算 Overlay =====
function levelResultOverlay({badge, title, html, actions}){
  overlayShow({ badge, title, html, actions });
}

function goNext(){
  if (state.levelIndex < LEVELS.length - 1){
    state.levelIndex += 1;
    renderLevel();

    const L = LEVELS[state.levelIndex];
    const extra = (state.injured && L.extraInput && L.id !== 4);

    overlayShow({
      badge:"進入關卡",
      title:`${L.title}`,
      html: `
        <p>${L.monster} 正在前方等待。</p>
        <p class="sub">提示：${L.hint}</p>
        ${extra ? `<p class="sub">⚠️ 你帶傷前進，本關多一個挑戰：<strong>${L.extraInput.label}</strong></p>` : ""}
      `,
      actions:[{text:"開始", className:"btn primary", onClick: ()=>overlayHide()}]
    });

    setHUD();
  }
}

// ✅ 防止重複寫入：防連點鎖
let submitting = false;

function evaluate(){
  if (submitting) return;
  submitting = true;
  el("submitBtn").disabled = true;

  const L = LEVELS[state.levelIndex];
  const expected = getCurrentExpectedInputs();

  const wrap = el("inputs");
  const fields = wrap.querySelectorAll("input[data-key]");
  const gotMap = {};
  fields.forEach(f=>{ gotMap[f.dataset.key] = f.value.trim(); });

  let correctThis = 0;
  const flags = {};
  expected.forEach(inp=>{
    const got = toNum(gotMap[inp.key]);
    const ok = approxEqual(got, inp.answer, inp.tol ?? TOL_DEFAULT);
    flags[inp.key] = ok;
    if (ok) correctThis += 1;
  });

  const totalThis = expected.length;
  const allCorrect = (correctThis === totalThis);

  // 扣血規則：不是全對就扣
  if (!allCorrect){
    state.mistakes += 1;
    state.hp = Math.max(0, state.hp - 1);
  }

  state.totalCount += totalThis;
  state.correctCount += correctThis;

  const conclusion = el("conclusion").value;

  // 本地紀錄
  state.log[L.id] = {
    levelTitle: L.title,
    expected: expected.map(x=>({ key:x.key, label:x.label, answer:x.answer })),
    inputs: { ...gotMap },
    conclusion,
    correctFlags: { ...flags }
  };

  // ✅ 寫入 Sheets（每次提交一列）
  sendToSheets({
  ts: new Date().toISOString(),
  requestId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
  action: "log",
  playerName: state.playerName,
  level: L.id,
  levelTitle: L.title,
  injured: state.injured,
  hp: state.hp,
  mistakes: state.mistakes,
  gotMap: gotMap,
  flags: flags,
  conclusion: conclusion
});


  setHUD();

if (allCorrect){
  flashOk();
}else{
  monsterAttack();   // ✅ 新增
  shakeScreen();
  flashBad();
}


  // 血量歸零：回第一關
  if (state.hp === 0){
    levelResultOverlay({
      badge:"死亡",
      title:"☠️ 生命歸零",
      html:`<p>你的步伐永遠的停住，被黑暗吞噬。</p><p class="sub">遠征隊被迫撤退，回到第一關重新整隊。</p>`,
      actions:[
        { text:"重新整隊", className:"btn danger", onClick: ()=>{ overlayHide(); restartGame(true); } }
      ]
    });
    return;
  }

  // 第四關：全對成功 / 否則分歧結局
  if (L.id === 4){
    if (allCorrect){
      overlayShow({
        badge:"勝利",
        title:"✅ 成功擊退魔王",
        html:`<p>你在最後一刻做出正確的決策。</p><p class="sub">毛丸的牢籠就在眼前…</p>`,
        actions:[{text:"🎬 進入結局", className:"btn primary", onClick: ()=>{ overlayHide(); endingSuccess(); }}]
      });
    }else{
      overlayShow({
        badge:"王國崩毀",
        title:"💥 你在最後一刻做出錯誤選擇",
        html:`<p>你沒有足夠時間修正。</p><p class="sub">結局走向分歧的路線…</p>`,
        actions:[{text:"🎬 進入結局", className:"btn danger", onClick: ()=>{ overlayHide(); endingBranchBoss(correctThis); }}]
      });
    }
    return;
  }

  // 非第四關：結果 overlay
  if (allCorrect){
    state.injured = false;
    el("hpFill").style.width = "0%";

    levelResultOverlay({
      badge:"勝利",
      title:"✅ 任務成功",
      html:`<p>你發現了怪物的破綻，成功擊中他的傷口。</p><p class="sub">你答對了 ${correctThis}/${totalThis} 個欄位。</p>`,
      actions:[
        { text:"🚪 挑戰下一關", className:"btn primary", onClick: ()=>{ overlayHide(); goNext(); } },
        { text:"留在本關", className:"btn ghost", onClick: ()=>overlayHide() }
      ]
    });
    return;
  }

  if (correctThis > 0){
    state.injured = true;
    el("hpFill").style.width = "35%";

    levelResultOverlay({
      badge:"負傷",
      title:"⚠️ 擊退怪物，但你受傷了",
      html:`<p>你擋下了致命一擊，卻也被劃開護甲。</p><p class="sub">你答對了 ${correctThis}/${totalThis} 個欄位，仍可前進，但下一關會多一個挑戰。</p>`,
      actions:[
        { text:"🚪 帶傷前進", className:"btn primary", onClick: ()=>{ overlayHide(); goNext(); } },
        { text:"重試本關", className:"btn ghost", onClick: ()=>{ overlayHide(); } }
      ]
    });
    return;
  }

  el("hpFill").style.width = "100%";
  levelResultOverlay({
    badge:"失敗",
    title:"☠️ 你被擊倒（本關重試）",
    html:`<p>怪物看穿了你的破綻，你被狠狠咬傷。</p><p class="sub">你答對了 ${correctThis}/${totalThis} 個欄位，已扣 1 生命。</p>`,
    actions:[
      { text:"重試本關", className:"btn primary", onClick: ()=>{ 
          overlayHide();
          wrap.querySelectorAll("input").forEach(i=>i.value="");
        } 
      }
    ]
  });
}

function restartGame(silent=false){
  state.levelIndex = 0;
  state.injured = false;
  state.hp = MAX_HP;
  state.mistakes = 0;
  state.correctCount = 0;
  state.totalCount = 0;
  state.log = {};
  state.finalRank = "";
  state.finalTitle = "";

  el("submitBtn").disabled = false;
  submitting = false;
  renderLevel();

  if (!silent){
    overlayShow({
      badge:"重啟",
      title:"重新整隊",
      html:`<p>你把地圖重新攤開，決定改變過去。</p><p class="sub">從第一關再次出發。</p>`,
      actions:[{text:"開始", className:"btn primary", onClick: ()=>overlayHide()}]
    });
  }
}

// ===== 序幕：輸入勇者名 =====
function showPrologue(){
  overlayShow({
    badge:"序幕",
    title:"遠征隊集結",
    html: `
      <p>出事了!MEG王國的精神象徵-毛丸，被魔物掳走了，王國壟罩在一片陰影之下，貝鳥教授非常擔憂。</p>
      <p>身為遠征隊的一員，你需要善用你的統計魔法，才能通過重重關卡，打敗魔王救出毛丸。</p>
      <p class="sub">請先輸入勇者姓名/暱稱。</p>
    `,
    inputsHtml: `
      <label class="field">
        <span>勇者姓名 / 暱稱（必填）</span>
        <input id="nameInput" type="text" placeholder="例如：MEG-01 或 王小明" maxlength="30" />
      </label>
    `,
    actions: [
      {
        text:"出發",
        className:"btn primary",
        onClick: ()=>{
          const v = document.getElementById("nameInput").value.trim();
          if (!v){
            shakeScreen();
            return;
          }
          state.playerName = v;
          setHUD();
          overlayHide();

          const L = LEVELS[0];
          overlayShow({
            badge:"進入關卡",
            title:`${L.title}`,
            html:`<p>${L.monster} 盤踞在前方。</p><p class="sub">提示：${L.hint}</p>`,
            actions:[{text:"開始", className:"btn primary", onClick: ()=>overlayHide()}]
          });
        }
      }
    ]
  });
}

// events
el("submitBtn").addEventListener("click", evaluate);
el("resetBtn").addEventListener("click", ()=>{
  el("inputs").querySelectorAll("input").forEach(i=>i.value="");
  el("conclusion").value = "";
  showResult("已清空本關輸入。", "neutral");
});
el("restartBtn").addEventListener("click", ()=>restartGame(false));

// start
renderLevel();
showPrologue();

function monsterAttack(){
  const box = el("monsterArt"); // 小方框
  if (!box) return;
  box.classList.add("monster-attack","hit-flash");
  setTimeout(()=>box.classList.remove("monster-attack","hit-flash"), 500);
}

