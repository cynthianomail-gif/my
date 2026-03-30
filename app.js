// 從 data.js 載入遊戲資料
let G = (_DB && _DB.g) ? _DB.g.slice() : [];
let nid = (_DB && _DB.nid) ? _DB.nid : 1;
let eid=null, selId=null, cur='all', ss={k:'releaseDate',d:-1};

// ── 載入資料（data.js 優先，localStorage 補充本地未推送的變更）──
(function(){
  const lsKey='slotdb_v1';
  let lsD=null;
  try{const s=localStorage.getItem(lsKey);if(s){const d=JSON.parse(s);if(d&&d.g&&d.g.length)lsD=d;}}catch(e){}
  if(!lsD)return; // 無 localStorage，用 data.js 的資料即可
  const dbTs=(_DB&&_DB.ts)||0;
  const lsTs=lsD.ts||0;
  if(lsTs>dbTs){
    // localStorage 比 data.js 新 → 用 localStorage（含本地未推送的編輯）
    const lsIds=new Set(lsD.g.map(g=>g.id));
    const extra=G.filter(g=>!lsIds.has(g.id));
    G=[...lsD.g,...extra];
    nid=Math.max(lsD.nid||0,nid);
  }
  // 若 data.js 比較新（剛從 GitHub 拉回），保留 data.js 的 G 不動
})();

// ── PROVIDER CONFIG ──
const PROV = {
  'Hacksaw Gaming':{key:'hacksaw',color:'var(--hk)',stripe:'linear-gradient(var(--hk),#ff9a70)',bc:'b-hk',founded:'2017',hq:'Malta',about:'以高波動度、大膽主題著稱。旗下 <strong>OpenRGS</strong> 平台孵化多家小工作室（Bullshark、Backseat Gaming 等）。標誌性風格：黑白底色搭配鮮豔符號、Summoning Symbols 盤面動態擴展。每月約 2~4 款新遊戲。',web:'https://www.hacksawgaming.com',revenueYear:'2025 全年',revenue:'全年營收 <strong>€1.975 億</strong>（YoY +44%） · 調整後 EBIT <strong>€1.614 億</strong>（利潤率 82%） · 淨利潤 <strong>€1.428 億</strong> · 日均局數 YoY +58%<br>Q3 2025：營收 €5,200 萬（YoY +39%） · Q1-Q3 累計 €1.424 億（YoY +52%）<br><span style="font-size:11px;color:var(--tx4)">來源：Hacksaw AB 公開財報（Nasdaq Stockholm: HACK）</span>'},
  'NoLimit City':{key:'nolimit',color:'var(--nl)',stripe:'linear-gradient(var(--nl),#a07ee8)',bc:'b-nl',founded:'2013',hq:'Sweden',about:'以爭議性主題與自研 <strong>xWays / xNudge / xSplit</strong> 機制聞名。2022 年被 Evolution 以 €3.4 億收購。代表作：Tombstone 系列（Max Win 500,000x 業界紀錄）。每月約 1~2 款，以極端 Max Win 見長。',web:'https://nolimitcity.com',revenue:'2022 年被 Evolution Gaming 以 <strong>€3.4 億</strong>收購，財務數據併入 Evolution 集團報告，無獨立公開財報。'},
  'ELK Studios':{key:'elk',color:'var(--elk)',stripe:'linear-gradient(var(--elk),#28e8c0)',bc:'b-elk',founded:'2013',hq:'Stockholm',about:'瑞典獨立廠商，以 <strong>X-iter</strong>（多層 Bonus Buy）、Nitropolis 系列、Cygnus 系列著名。注重品質，每月約 1~2 款，RTP 通常 94%。代表作：Wild Toro（EGR 年度遊戲 2017）。',web:'https://www.elk-studios.com',revenue:'私人公司，無公開財報。'},
  'Pragmatic Play':{key:'prag',color:'var(--prag)',stripe:'linear-gradient(var(--prag),#e05cf0)',bc:'b-prag',founded:'2015',hq:'Gibraltar',about:'全球最大老虎機廠商之一，每週固定出版多款新遊戲。以 <strong>Gates of Olympus</strong> 系列引爆 Scatter Pays 風潮，後續推出 Sugar Rush、Sweet Bonanza、Zeus vs Hades 等熱門 IP。代表機制：Scatter Pays + 位置加成倍數 + Super Scatter 系列。量產型廠商，品質參差，但頂尖系列擁有業界最高人氣。',web:'https://www.pragmaticplay.com',revenue:'私人公司，無公開財報。'},
  "Play'n GO":{key:'playngo',color:'var(--png)',stripe:'linear-gradient(var(--png),#40d870)',bc:'b-png',founded:'2005',hq:'Växjö, Sweden',about:'老牌廠商，350+ 款遊戲。代表作：<strong>Book of Dead</strong>（業界最長壽 Slot）、Reactoonz、Rise of Olympus 系列。每月約 4~5 款，量產能力業界頂尖。',web:'https://www.playngo.com',revenue:'私人公司，無公開財報。每週固定發布新遊戲，是業界產量最高的廠商之一。'},
  'Shady Lady':{key:'shady',color:'var(--sl)',stripe:'linear-gradient(var(--sl),#ff709a)',bc:'b-sl',founded:'2024',hq:'Unknown',about:'2024 年新創廠商，以 <strong>黑色幽默與諷刺社會現象</strong> 為主題。全系列 Max Win <strong>20,000x</strong>，RTP 96%+，高波動度。每兩個月約 1 款，每款都引爆話題。',web:'https://shadylady.io'}
};
const CC={'Ways':'cw','Cluster Pays':'cc','Scatter Pays':'cs','Paylines':'cl','Meter Pay':'cm','特殊':'cx'};
const BC={'Hacksaw Gaming':'b-hk','NoLimit City':'b-nl','ELK Studios':'b-elk',"Play'n GO":'b-png','Shady Lady':'b-sl','Pragmatic Play':'b-prag'};
const VC={'Extreme':'ve','High':'vh','Medium-High':'vm','Medium':'vm'};


function saveToStorage(){try{localStorage.setItem('slotdb_v1',JSON.stringify({g:G,nid,ts:Date.now()}));}catch(e){}}

// ── 清理 localStorage 舊版 weserv proxy 前綴，還原成乾淨的 bigwinboard URL ──
G.forEach(g=>{
  if(g.img&&g.img.includes('weserv.nl')){
    const m=g.img.match(/[?&]url=(.+?)(?:&(?!url=)|$)/);
    if(m){let u=decodeURIComponent(m[1]);if(!u.startsWith('http'))u='https://'+u;g.img=u;}
  }
});
// ── SVG placeholder generator ──

const PROV_COLORS = {
  'Hacksaw Gaming': {bg:'#fff0eb', c1:'#e85c30', c2:'#ff9a70', emoji:'⚔️'},
  'NoLimit City':   {bg:'#f3eeff', c1:'#7c4fd0', c2:'#b090f8', emoji:'☠️'},
  'ELK Studios':    {bg:'#e8f9f7', c1:'#1aad9a', c2:'#60ded0', emoji:'🦌'},
  "Play'n GO":      {bg:'#edfff3', c1:'#1ab868', c2:'#60e090', emoji:'🎮'},
  'Shady Lady':     {bg:'#fff0f3', c1:'#e83058', c2:'#ff7090', emoji:'🎭'},
};

function makeSvgPlaceholder(name, provider) {
  const pc = PROV_COLORS[provider] || {bg:'#f5f3ef', c1:'#9e9085', c2:'#c4bbb0', emoji:'🎰'};
  const short = name.length > 14 ? name.slice(0,13)+'…' : name;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="130" viewBox="0 0 200 130">
    <defs>
      <linearGradient id="g${name.replace(/\W/g,'')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${pc.c1};stop-opacity:.15"/>
        <stop offset="100%" style="stop-color:${pc.c2};stop-opacity:.3"/>
      </linearGradient>
    </defs>
    <rect width="200" height="130" fill="${pc.bg}"/>
    <rect width="200" height="130" fill="url(#g${name.replace(/\W/g,'')})"/>
    <circle cx="100" cy="52" r="28" fill="${pc.c1}" opacity=".12"/>
    <circle cx="100" cy="52" r="20" fill="${pc.c1}" opacity=".1"/>
    <text x="100" y="62" text-anchor="middle" font-size="28" font-family="serif">${pc.emoji}</text>
    <text x="100" y="90" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="${pc.c1}">${short}</text>
    <text x="100" y="106" text-anchor="middle" font-size="9" font-family="sans-serif" fill="${pc.c1}" opacity=".7">${provider}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function makeThumbSvg(name, provider) {
  const pc = PROV_COLORS[provider] || {bg:'#f5f3ef', c1:'#9e9085', c2:'#c4bbb0', emoji:'🎰'};
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64">
    <rect width="96" height="64" fill="${pc.bg}"/>
    <rect width="96" height="64" fill="${pc.c1}" opacity=".1"/>
    <text x="48" y="40" text-anchor="middle" font-size="22" font-family="serif">${pc.emoji}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── 圖片載入：直連(no-referrer) → proxy fallback → SVG ──
function _imgErr(el){
  const proxy=el.dataset.proxy;
  if(proxy&&!el._p){
    el._p=1;
    el.onerror=function(){el.onerror=null;el.src=makeThumbSvg(el.alt,el.dataset.pv||'');};
    el.src=proxy;
  }else{el.onerror=null;el.src=makeThumbSvg(el.alt,el.dataset.pv||'');}
}
function _heroErr(el){
  const proxy=el.dataset.proxy;
  if(proxy&&!el._p){
    el._p=1;
    el.onerror=function(){el.onerror=null;el.src=makeSvgPlaceholder(el.alt,el.dataset.pv||'');};
    el.src=proxy;
  }else{el.onerror=null;el.src=makeSvgPlaceholder(el.alt,el.dataset.pv||'');}
}
function imgWithFallback(src, name, provider, cls, style='') {
  if (!src) return `<img class="${cls}" src="${makeThumbSvg(name,provider)}" alt="${name}" style="${style}">`;
  const proxy=(location.protocol!=='file:'&&src.includes('bigwinboard.com')&&!src.includes('weserv.nl'))
    ?'https://images.weserv.nl/?url='+encodeURIComponent(src):'';
  return `<img class="${cls}" src="${src}" alt="${name}" style="${style}" referrerpolicy="no-referrer" data-proxy="${proxy}" data-pv="${provider}" onerror="_imgErr(this)">`;
}
function heroImg(src, name, provider) {
  if (!src) return `<img src="${makeSvgPlaceholder(name,provider)}" alt="${name}" style="width:100%;height:100%;object-fit:cover;display:block">`;
  const proxy=(location.protocol!=='file:'&&src.includes('bigwinboard.com')&&!src.includes('weserv.nl'))
    ?'https://images.weserv.nl/?url='+encodeURIComponent(src):'';
  return `<img src="${src}" alt="${name}" style="width:100%;height:100%;object-fit:cover;display:block" referrerpolicy="no-referrer" data-proxy="${proxy}" data-pv="${provider}" onerror="_heroErr(this)">`;
}

// ── helpers ──
function pk(p){return{'Hacksaw Gaming':'hacksaw','NoLimit City':'nolimit','ELK Studios':'elk',"Play'n GO":'playngo','Shady Lady':'shady','Pragmatic Play':'prag'}[p]||''}
function fd(s){return s?new Date(s).toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit'}):'—'}
function ml(s){if(!s)return'';const d=new Date(s);return`${d.getFullYear()} 年 ${d.getMonth()+1} 月`}
function vcl(v){return{Extreme:'ve',High:'vh','Medium-High':'vm',Medium:'vm'}[v]||'vm'}
function scl(s){return{'提案候補':'cand','已提案':'active','庫存':'stock'}[s]||''}
function ccl(c){return{Ways:'cw','Cluster Pays':'cc','Scatter Pays':'cs',Paylines:'cl','Meter Pay':'cm'}[c]||'cw'}
function bcl(p){return{'Hacksaw Gaming':'b-hk','NoLimit City':'b-nl','ELK Studios':'b-elk',"Play'n GO":'b-png','Shady Lady':'b-sl','Pragmatic Play':'b-prag'}[p]||''}

const FEAT_ZH={'Cascading':'連爆消除','Multiplier':'加成倍數','Wilds':'WILD圖示','Sticky Wilds':'黏性WILD','Megaways':'Megaways','Jackpot':'累積彩金'};
function featZh(f){return FEAT_ZH[f]||f}
function hasFeat(g,f){const zh=featZh(f);return(g.feat||[]).some(t=>t===f||featZh(t)===zh||t===zh);}

function gameLink(g){
  if(g.link&&g.link!=='https://www.bigwinboard.com/')return g.link;
  const ps={'Hacksaw Gaming':'hacksaw-gaming','NoLimit City':'nolimit-city','ELK Studios':'elk-studios',"Play'n GO":'playn-go','Shady Lady':'shady-lady','Pragmatic Play':'pragmatic-play'}[g.provider]||'';
  if(!ps)return g.link||'#';
  const slug=g.name.toLowerCase().replace(/&/g,'and').replace(/[''\']/g,'').replace(/\+/g,'plus').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return`https://www.bigwinboard.com/${slug}-${ps}-slot-review/`;
}

function filt(pf=null){
  const q=(document.getElementById('q')||{}).value?.toLowerCase()||'';
  let r=G.filter(g=>(pf?g.provider===pf:true)&&(!q||g.name.toLowerCase().includes(q)||g.provider.toLowerCase().includes(q)));
  const VOL_ORD={'Low':1,'Medium':2,'Medium-High':3,'High':4,'Extreme':5};
  r.sort((a,b)=>{let av=a[ss.k]||'',bv=b[ss.k]||'';
    if(ss.k==='rtp'||ss.k==='maxwin'){av=parseFloat(av)||0;bv=parseFloat(bv)||0}
    if(ss.k==='vol'){av=VOL_ORD[av]||0;bv=VOL_ORD[bv]||0}
    if(ss.k==='grid'){const p=v=>{const m=v.match(/(\d+)[×x](\d+)/);return m?parseInt(m[1])*100+parseInt(m[2]):0};av=p(av);bv=p(bv)}
    if(ss.k==='status'){const o={'已提案':1,'提案候補':2,'庫存':3,'':4};av=o[av]??4;bv=o[bv]??4}
    return av<bv?-ss.d:av>bv?ss.d:0});
  return r;
}

function rowHtml(g,i){
  const ft=(g.feat||[]).map(f=>`<span class="ftag">${f}</span>`).join('');
  return`<tr data-id="${g.id}" style="animation-delay:${i*.022}s" class="${g.id===selId?'sel':''}" onclick="openPanel(${g.id})">
    <td>${imgWithFallback(g.img, g.name, g.provider, 't-thumb')}</td>
    <td><div class="t-name">${g.name}</div><div class="t-sub">${g.sum?g.sum.slice(0,55)+'…':''}</div></td>
    <td><span class="badge ${bcl(g.provider)}">${g.provider}</span></td>
    <td style="color:var(--tx3);font-size:11px;font-weight:700;white-space:nowrap">${fd(g.releaseDate)}</td>
    <td>${g.conn?`<span class="conn ${ccl(g.conn)}">${g.conn}</span>`:'—'}</td>
    <td class="grd">${g.grid||'—'}</td>
    <td class="mxw">${g.maxwin?'x'+Number(g.maxwin).toLocaleString():'—'}</td>
    <td>${g.vol?`<span class="vbadge ${vcl(g.vol)}">${g.vol}</span>`:'—'}</td>
    <td><span class="stbadge st-${scl(g.status||'庫存')}">${g.status||'庫存'}</span></td>
    <td><div style="display:flex;gap:4px;flex-wrap:wrap">${ft}</div></td>
    <td class="act" onclick="event.stopPropagation()"><div style="display:flex;gap:4px">
      <button onclick="openModal(${g.id})">✏️</button>
      <button class="d" onclick="delG(${g.id})">🗑️</button>
    </div></td>
  </tr>`;
}

function renderCurrent(){
  const provMap={hacksaw:'Hacksaw Gaming',nolimit:'NoLimit City',elk:'ELK Studios',playngo:"Play'n GO",shady:'Shady Lady',prag:'Pragmatic Play'};
  if(cur==='all')renderMain();
  else if(provMap[cur])renderProv(provMap[cur]);
}

function renderMain(){
  const list=filt();
  const tb=document.getElementById('tb');
  const empty=document.getElementById('empty');
  if(!list.length){tb.innerHTML='';empty.style.display='block';return}
  empty.style.display='none';
  let html='',last='';
  list.forEach((g,i)=>{
    const m=ml(g.releaseDate);
    if(m!==last){last=m;html+=`<tr class="mdiv"><td colspan="11" style="padding:14px 14px 4px"><span class="mlbl">📅 ${m}</span></td></tr>`}
    html+=rowHtml(g,i);
  });
  tb.innerHTML=html;
  const now=new Date();
  const mo=G.filter(g=>{const d=new Date(g.releaseDate);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}).length;
  document.getElementById('st-tot').textContent=G.length;
  document.getElementById('st-mo').textContent=mo;
}

function sort(k){ss.k===k?ss.d*=-1:(ss.k=k,ss.d=-1);renderCurrent()}

// ── SIDE PANEL ──
function openPanel(id){
  const g=G.find(x=>x.id===id);if(!g)return;
  selId=id;
  document.querySelectorAll('tbody tr[data-id]').forEach(r=>r.classList.toggle('sel',+r.dataset.id===id));
  const pi=PROV[g.provider]||{color:'var(--peach)',bc:'b-hk',stripe:'var(--peach)'};
  const rtpRows=(g.rtps||[{label:'標準',val:parseFloat(g.rtp)||96}]).map(r=>{
    const mn=50,mx=99,w=Math.max(0,Math.min(100,(r.val-mn)/(mx-mn)*100));
    const c=r.val>=96?'var(--mint)':r.val>=93?'var(--yellow)':'var(--rose)';
    return`<div class="rtp-row">
      <span class="rtp-lbl">${r.label}</span>
      <div class="rtp-bar-bg"><div class="rtp-bar-fill" style="width:${w}%;background:${c}"></div></div>
      <span class="rtp-v">${r.val}%</span>
    </div>`;
  }).join('');
  const mechHtml=(g.mechs||[]).map(m=>`
    <div class="mech-card">
      <div class="mech-icon">${m.icon}</div>
      <div>
        <div class="mech-name">${m.name}</div>
        ${m.type?`<span class="mech-tag">${m.type}</span>`:''}
        <div class="mech-desc">${m.desc||''}</div>
      </div>
    </div>`).join('');
  const prosHtml=(g.pros||[]).map(p=>`<li>${p}</li>`).join('');
  const consHtml=(g.cons||[]).map(c=>`<li>${c}</li>`).join('');

  document.getElementById('sp-body').innerHTML=`
    <div class="sp-hero">
      ${heroImg(g.img, g.name, g.provider)}
      <div class="sp-hero-overlay"></div>
      <div class="sp-hero-info">
        <div class="sp-hero-name">${g.name}</div>
        <div class="sp-hero-sub">
          <span class="badge ${pi.bc}">${g.provider}</span>
          ${g.vol?`<span class="vbadge ${vcl(g.vol)}">${g.vol}</span>`:''}
        </div>
      </div>
    </div>
    <div class="sp-strip">
      <div class="sp-strip-item"><div class="sv rtp">${g.rtp?g.rtp+'%':'—'}</div><div class="sk">RTP</div></div>
      <div class="sp-strip-item"><div class="sv mxw">${g.maxwin?'x'+Number(g.maxwin).toLocaleString():'—'}</div><div class="sk">Max Win</div></div>
      <div class="sp-strip-item"><div class="sv grd">${g.grid||'—'}</div><div class="sk">盤面</div></div>
      <div class="sp-strip-item"><div class="sv" style="color:var(--tx2);font-size:11px;font-weight:800">${g.bet?g.bet:'—'}</div><div class="sk">下注範圍</div></div>
    </div>
    <div class="sp-tabs">
      <div class="sp-tab on" onclick="stab(this,'pn-ov')">概覽</div>
      <div class="sp-tab" onclick="stab(this,'pn-rules')">完整規則</div>
      <div class="sp-tab" onclick="stab(this,'pn-mechs')">機制說明</div>
    </div>

    <div id="pn-ov" class="sp-pane on">
      <div class="sec"><div class="sec-h">基本規格</div>
        <table class="spec-tbl">
          <tr><td>廠商</td><td><span class="badge ${pi.bc}">${g.provider}</span></td></tr>
          <tr><td>發布日期</td><td>${fd(g.releaseDate)}</td></tr>
          <tr><td>連線類型</td><td>${g.conn?`<span class="conn ${ccl(g.conn)}">${g.conn}</span>`:'—'}</td></tr>
          <tr><td>盤面</td><td><span class="grd">${g.grid||'—'}</span></td></tr>
          <tr><td>波動度</td><td>${g.vol?`<span class="vbadge ${vcl(g.vol)}">${g.vol}</span>`:'—'}</td></tr>
          <tr><td>下注範圍</td><td style="font-weight:800">${g.bet||'—'}</td></tr>
          <tr><td>Max Win</td><td class="mxw">${g.maxwin?'x'+Number(g.maxwin).toLocaleString():'—'}</td></tr>
          <tr><td>Hit Freq</td><td style="font-weight:700;color:var(--tx2)">${g.hitFreq||'—'}</td></tr>
          <tr><td>BWB Score</td><td>${g.bwbScore&&g.bwbScore!='N/A'?`<span style="display:inline-flex;align-items:center;gap:4px;background:${+g.bwbScore>=9?'#e8fff5':+g.bwbScore>=7?'#fff8e8':'#fff0f0'};border:1.5px solid ${+g.bwbScore>=9?'var(--mint)':+g.bwbScore>=7?'var(--yellow)':'var(--rose)'};color:${+g.bwbScore>=9?'var(--mint)':+g.bwbScore>=7?'#c89820':'var(--rose)'};font-weight:900;font-size:13px;padding:2px 10px;border-radius:50px">${g.bwbScore}<span style="font-size:10px;font-weight:600;opacity:.7">/10</span></span>`:'<span style="color:var(--tx4);font-weight:700">N/A</span>'}</td></tr>
        </table>
      </div>
      <div class="sec"><div class="sec-h">功能標籤</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${(g.feat||[]).map(f=>`<span class="ftag">${featZh(f)}</span>`).join('')}</div>
      </div>
      <div class="sec"><div class="sec-h">主題摘要</div>
        <div style="font-size:12.5px;line-height:1.8;color:var(--tx2);font-weight:500">${g.sum||'—'}</div>
      </div>
      <div class="sec"><div class="sec-h">RTP 版本比較</div>
        <div class="rtp-wrap">${rtpRows}</div>
      </div>
      ${g.bwbVerdict?`<div class="sec"><div class="sec-h">BWB Verdict</div><div style="font-size:12px;line-height:1.8;color:var(--tx2);font-style:italic;font-weight:600;background:var(--bg);border-radius:var(--r-sm);padding:10px 12px;border-left:3px solid var(--peach)">"${g.bwbVerdict}"</div></div>`:''}
      <a class="demo-btn" href="${gameLink(g)}" target="_blank">🎮 Demo / Review →</a>
    </div>

    <div id="pn-rules" class="sp-pane">
      <div class="rules-body">${g.rules||'<p>規則說明尚未填寫。</p>'}</div>
    </div>

    <div id="pn-mechs" class="sp-pane">
      <div class="sec-h" style="margin-bottom:12px">核心機制卡片</div>
      <div class="mech-list">${mechHtml||'<p style="color:var(--tx3);font-size:12px;font-weight:600">機制說明尚未填寫。</p>'}</div>
    </div>

  `;
  document.getElementById('sp').classList.add('open');
}

function closePanel(){
  document.getElementById('sp').classList.remove('open');
  selId=null;
  document.querySelectorAll('tbody tr.sel').forEach(r=>r.classList.remove('sel'));
}
function stab(el,id){
  document.querySelectorAll('.sp-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.sp-pane').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
  document.getElementById(id)?.classList.add('on');
}

// ── PROVIDER PAGES ──
function renderProv(pname){
  const key=pk(pname);const pi=PROV[pname]||{};const el=document.getElementById('pg-'+key);
  const q=(document.getElementById('q')||{}).value?.toLowerCase()||'';
  const VOL_ORD={'Low':1,'Medium':2,'Medium-High':3,'High':4,'Extreme':5};
  const pG=G.filter(g=>g.provider===pname&&(!q||g.name.toLowerCase().includes(q)||g.sum?.toLowerCase().includes(q)));
  pG.sort((a,b)=>{let av=a[ss.k]||'',bv=b[ss.k]||'';
    if(ss.k==='maxwin'){av=parseFloat(av)||0;bv=parseFloat(bv)||0}
    if(ss.k==='vol'){av=VOL_ORD[av]||0;bv=VOL_ORD[bv]||0}
    if(ss.k==='grid'){const p=v=>{const m=v.match(/(\d+)[×x](\d+)/);return m?parseInt(m[1])*100+parseInt(m[2]):0};av=p(av);bv=p(bv)}
    if(ss.k==='status'){const o={'已提案':1,'提案候補':2,'庫存':3,'':4};av=o[av]??4;bv=o[bv]??4}
    return av<bv?-ss.d:av>bv?ss.d:0});
  const scores=pG.map(g=>parseInt(g.bwbScore)).filter(n=>!isNaN(n));
  const avgBwb=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)+'/10':'—';
  const maxWins=pG.map(g=>parseInt(g.maxwin)).filter(n=>!isNaN(n)&&n>0);
  const topMw=maxWins.length?'x'+Math.max(...maxWins).toLocaleString():'—';
  const rows=pG.map((g,i)=>{
    const ft=(g.feat||[]).map(f=>`<span class="ftag">${featZh(f)}</span>`).join('');
    return`<tr style="animation-delay:${i*.03}s;cursor:pointer" onclick="openPanel(${g.id})">
      <td>${imgWithFallback(g.img,g.name,g.provider,'t-thumb')}</td>
      <td><div class="t-name">${g.name}</div><div class="t-sub">${g.sum?g.sum.slice(0,50)+'…':''}</div></td>
      <td style="color:var(--tx3);font-size:11px;font-weight:700;white-space:nowrap">${fd(g.releaseDate)}</td>
      <td>${g.conn?`<span class="conn ${ccl(g.conn)}">${g.conn}</span>`:'—'}</td>
      <td class="grd">${g.grid||'—'}</td>
      <td class="mxw">${g.maxwin?'x'+Number(g.maxwin).toLocaleString():'—'}</td>
      <td>${g.vol?`<span class="vbadge ${vcl(g.vol)}">${g.vol}</span>`:'—'}</td>
      <td><span class="stbadge st-${scl(g.status||'庫存')}">${g.status||'庫存'}</span></td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">${ft}</div></td>
      <td onclick="event.stopPropagation()"><a class="demo-btn" href="${gameLink(g)}" target="_blank" style="padding:5px 12px;font-size:11px;margin-top:0">🎮 →</a></td>
    </tr>`;
  }).join('');
  el.innerHTML=`
    <div class="prov-banner">
      <div class="prov-stripe" style="background:${pi.stripe||pi.color}"></div>
      <div>
        <div class="prov-name">${pname}</div>
        <div class="prov-info">成立：${pi.founded||'—'} · ${pi.hq||'—'} · <a href="${pi.web||'#'}" target="_blank">${pi.web||''}</a></div>
      </div>
    </div>
    <div class="pnote" style="margin-bottom:0;border-radius:var(--r) var(--r) 0 0;border-bottom:1px solid var(--bg2)">${pi.about||'—'}${pi.revenue?`<br><br><strong>📊 公開財報（${pi.revenueYear||''}）：</strong><br>${pi.revenue}`:''}
    </div>
    <div class="pstats" style="border-radius:0 0 var(--r) var(--r);margin-top:0">
      <div class="stat s0"><div class="n">${pG.length}</div><div class="l">遊戲數量</div></div>
      <div class="stat s1"><div class="n">${avgBwb}</div><div class="l">平均 BWB Score</div></div>
      <div class="stat s3"><div class="n">${topMw}</div><div class="l">最高 Max Win</div></div>
    </div>
    <div class="tcard" style="margin-top:0"><table>
      <thead><tr><th style="width:52px"></th><th onclick="sort('name')">遊戲名稱</th><th onclick="sort('releaseDate')">發布日期</th><th onclick="sort('conn')">連線</th><th onclick="sort('grid')">盤面</th><th onclick="sort('maxwin')">Max Win</th><th onclick="sort('vol')">波動</th><th onclick="sort('status')">狀態</th><th>功能</th><th>Demo</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  `;
}

function filterPM(btn,key,m){
  const el=document.getElementById('pg-'+key);
  el.querySelectorAll('.mtab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  const t=document.getElementById('pt-'+key);
  if(t&&el._t)t.innerHTML=el._t(el._m[m]||[]);
  // update stats for selected month
  const list=el._m[m]||[];
  const cntEl=document.getElementById('pst-cnt-'+key);
  const bwbEl=document.getElementById('pst-bwb-'+key);
  const mwEl=document.getElementById('pst-mw-'+key);
  if(cntEl)cntEl.textContent=list.length;
  if(bwbEl){const sc=list.map(g=>parseInt(g.bwbScore)).filter(n=>!isNaN(n));bwbEl.textContent=sc.length?(sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(1)+'/10':'—';}
  if(mwEl){const mw=list.map(g=>parseInt(g.maxwin)).filter(n=>!isNaN(n)&&n>0);mwEl.textContent=mw.length?'x'+Math.max(...mw).toLocaleString():'—';}
}

function toggleMobMenu(){
  document.querySelector('aside').classList.toggle('mob-open');
  document.querySelector('.mob-backdrop').classList.toggle('mob-open');
}
function closeMobMenu(){
  document.querySelector('aside').classList.remove('mob-open');
  document.querySelector('.mob-backdrop').classList.remove('mob-open');
}

function goPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(n=>n.classList.remove('on'));
  document.getElementById('pg-'+name).classList.add('on');
  document.getElementById('nb-'+name).classList.add('on');
  cur=name;
  const titles={all:'全部遊戲 🎮',hacksaw:'Hacksaw Gaming',nolimit:'NoLimit City',elk:'ELK Studios',playngo:"Play'n GO",shady:'Shady Lady','prag':'Pragmatic Play'};
  document.getElementById('page-h').textContent=titles[name]||name;
  if(name!=='all'){const pm={hacksaw:'Hacksaw Gaming',nolimit:'NoLimit City',elk:'ELK Studios',playngo:"Play'n GO",shady:'Shady Lady','prag':'Pragmatic Play'};renderProv(pm[name])}
  closePanel();closeMobMenu();
}

// ── MODAL ──
function openModal(id=null){
  eid=id;clearMod();
  document.getElementById('m-title').textContent=id?'✏️ 編輯遊戲':'＋ 新增遊戲 ✨';
  if(id){
    const g=G.find(x=>x.id===id);
    if(g){
      const m={name:g.name,prov:g.provider,date:g.releaseDate,conn:g.conn,grid:g.grid,rtp:g.rtp,mw:g.maxwin,vol:g.vol,status:g.status||'',bet:g.bet,img:g.img,link:g.link,sum:g.sum,rules:g.rules,
        mechs:g.mechs?JSON.stringify(g.mechs,null,2):''};
      Object.entries(m).forEach(([k,v])=>{const el=document.getElementById('m-'+k);if(el)el.value=v||''});
      document.querySelectorAll('.chks input[type=checkbox]').forEach(c=>c.checked=(g.feat||[]).some(t=>t===c.value||featZh(t)===c.value));
    }
  }else{document.getElementById('m-date').value=new Date().toISOString().slice(0,10)}
  document.getElementById('modal-ov').classList.add('open');
}
function closeModal(){document.getElementById('modal-ov').classList.remove('open');eid=null}
function clearMod(){
  ['m-name','m-prov','m-date','m-conn','m-grid','m-rtp','m-mw','m-vol','m-status','m-bet','m-img','m-link','m-sum','m-rules','m-mechs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  document.querySelectorAll('.chks input[type=checkbox]').forEach(c=>c.checked=false);
}
function saveGame(){
  const name=document.getElementById('m-name').value.trim();
  const prov=document.getElementById('m-prov').value;
  if(!name||!prov){alert('請填寫遊戲名稱和廠商 😊');return}
  let mechs=null;try{const v=document.getElementById('m-mechs').value.trim();if(v)mechs=JSON.parse(v)}catch(e){}
  const d={name,provider:prov,releaseDate:document.getElementById('m-date').value,
    conn:document.getElementById('m-conn').value,grid:document.getElementById('m-grid').value.trim(),
    rtp:document.getElementById('m-rtp').value.trim(),maxwin:document.getElementById('m-mw').value.trim(),
    vol:document.getElementById('m-vol').value,status:document.getElementById('m-status').value,bet:document.getElementById('m-bet').value.trim(),
    img:document.getElementById('m-img').value.trim(),link:document.getElementById('m-link').value.trim(),
    sum:document.getElementById('m-sum').value.trim(),rules:document.getElementById('m-rules').value.trim(),
    mechs,feat:[...document.querySelectorAll('.chks input[type=checkbox]:checked')].map(c=>c.value)};
  if(eid){const i=G.findIndex(g=>g.id===eid);if(i!==-1)G[i]={...G[i],...d}}else G.push({id:nid++,...d});
  closeModal();renderMain();saveToStorage();markUnsaved();
}
function delG(id){if(!confirm('確定刪除？'))return;G=G.filter(g=>g.id!==id);if(selId===id)closePanel();renderMain();saveToStorage();pushToGitHub();}

function exportCSV(){
  const h=['遊戲名稱','廠商','發布日期','連線','盤面','RTP%','Max Win','波動','下注範圍','功能','摘要','連結'];
  const rows=filt().map(g=>[g.name,g.provider,g.releaseDate,g.conn,g.grid,g.rtp,g.maxwin,g.vol,g.bet,(g.feat||[]).join('/'),g.sum,g.link].map(v=>`"${(v||'').replace(/"/g,'""')}"`).join(','));
  const csv='\uFEFF'+[h.join(','),...rows].join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download=`slotdb-${new Date().toISOString().slice(0,10)}.csv`;a.click();
}

function exportHTML(){
  const ts=Date.now();
  const content='// ── SLOT DB DATA ── (此檔案由系統自動更新，請勿手動編輯)\nvar _DB='+JSON.stringify({ts,nid,g:G})+';\n';
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type:'text/javascript;charset=utf-8;'}));
  a.download='data-backup-'+new Date().toISOString().slice(0,10)+'.js';a.click();
  showToast('✅ 已匯出 data.js 備份！');
}

function resetStorage(){
  if(!confirm('確定清除本機所有編輯紀錄？（資料將恢復為原始內容）'))return;
  localStorage.removeItem('slotdb_v1');
  showToast('🗑️ 本機資料已清除，重新整理後生效');
}

// ── GitHub 自動同步 ──

const GH_REPO='cynthianomail-gif/my';
const GH_FILE='data.js';

function ghToken(){return localStorage.getItem('gh_token')||'';}

function markUnsaved(){
  const lbl=document.getElementById('push-lbl');
  if(lbl)lbl.textContent='儲存 *';
}
async function pushToGitHub(){
  const token=ghToken();
  if(!token){showToast('⚠️ 請先在 ⚙️ GitHub 設定 Token');openGHModal();return;}
  const btn=document.getElementById('push-btn');
  const lbl=document.getElementById('push-lbl');
  if(lbl)lbl.textContent='推送中…';
  if(btn)btn.disabled=true;
  try{
    // 取得現有檔案的 SHA（若檔案不存在則為 undefined，API 仍允許 PUT 建立新檔）
    const infoRes=await fetch('https://api.github.com/repos/'+GH_REPO+'/contents/'+GH_FILE,{
      headers:{Authorization:'token '+token,Accept:'application/vnd.github.v3+json'}
    });
    const info=await infoRes.json();
    if(infoRes.status!==200&&infoRes.status!==404)throw new Error(info.message||'API 錯誤 '+infoRes.status);
    const sha=info.sha; // 新檔案時為 undefined，GitHub API 允許不帶 sha 建立新檔
    const ts=Date.now();
    const dataContent='// ── SLOT DB DATA ── (此檔案由系統自動更新，請勿手動編輯)\nvar _DB='+JSON.stringify({ts,nid,g:G})+';\n';
    const encoded=btoa(unescape(encodeURIComponent(dataContent)));
    const body={message:'資料更新 '+new Date().toISOString().slice(0,16).replace('T',' '),content:encoded};
    if(sha)body.sha=sha; // 更新現有檔案才需要 sha
    const res=await fetch('https://api.github.com/repos/'+GH_REPO+'/contents/'+GH_FILE,{
      method:'PUT',
      headers:{Authorization:'token '+token,Accept:'application/vnd.github.v3+json','Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    if(res.ok){
      _DB.ts=ts;
      saveToStorage();
      showToast('✅ 已同步至 GitHub！');
    }else{
      const e=await res.json();throw new Error(e.message||'上傳失敗');
    }
  }catch(e){showToast('❌ 同步失敗：'+e.message);}
  finally{if(btn)btn.disabled=false;if(lbl)lbl.textContent='儲存';}
}

function ghSetToken(t){localStorage.setItem('gh_token',t);}
function updateGHBtn(){
  const lbl=document.getElementById('gh-lbl');
  const btn=document.getElementById('gh-btn');
  if(!lbl||!btn)return;
  if(ghToken()){lbl.textContent='✓ GitHub';btn.style.color='var(--mint,#4caf7d)';}
  else{lbl.textContent='⚙️ GitHub';btn.style.color='';}
}
function openGHModal(){
  const cur=ghToken();
  document.getElementById('gh-modal-wrap')?.remove();
  const m=document.createElement('div');
  m.id='gh-modal-wrap';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;';
  m.innerHTML='<div style="background:#fff;border-radius:16px;padding:28px 32px;width:380px;box-shadow:0 8px 32px rgba(0,0,0,.2);font-family:inherit">'
    +'<h3 style="margin:0 0 6px;font-size:16px;font-weight:700">⚙️ GitHub 同步設定</h3>'
    +'<p style="font-size:12px;color:#888;margin:0 0 18px">儲存遊戲後自動同步到 GitHub Pages</p>'
    +'<label style="font-size:13px;color:#555;font-weight:600;display:block;margin-bottom:6px">Personal Access Token</label>'
    +'<input id="gh-token-inp" type="password" placeholder="ghp_xxxxxxxxxxxxxxxx" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;outline:none" value="'+(cur||'')+'">'
    +'<p style="font-size:12px;color:#aaa;margin:8px 0 0">需要 <b>repo</b> 權限 &nbsp;·&nbsp; <a href="https://github.com/settings/tokens/new?scopes=repo&description=SlotDB" target="_blank" style="color:#6875d8">點此建立 Token →</a></p>'
    +'<div style="display:flex;gap:10px;margin-top:22px;justify-content:flex-end">'
    +(cur?'<button onclick="ghSetToken(\'\');document.getElementById(\'gh-modal-wrap\').remove();updateGHBtn();showToast(\'🗑️ Token 已清除\')" style="padding:8px 16px;border:1.5px solid #f5c6c6;color:#e05;border-radius:8px;background:#fff9f9;cursor:pointer;font-size:13px">移除</button>':'')
    +'<button onclick="document.getElementById(\'gh-modal-wrap\').remove()" style="padding:8px 16px;border:1.5px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:13px">取消</button>'
    +'<button onclick="const t=document.getElementById(\'gh-token-inp\').value.trim();if(!t){alert(\'請輸入 Token\');return;}ghSetToken(t);document.getElementById(\'gh-modal-wrap\').remove();updateGHBtn();showToast(\'✅ Token 已儲存，下次儲存時自動同步！\')" style="padding:8px 20px;background:#2d2720;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">儲存</button>'
    +'</div></div>';
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById('gh-token-inp')?.focus(),50);
}
document.addEventListener('DOMContentLoaded',updateGHBtn);

function showToast(msg){
  let t=document.getElementById('_toast');
  if(!t){t=document.createElement('div');t.id='_toast';
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#2d2720;color:#fff;padding:10px 22px;border-radius:50px;font-size:13px;font-weight:700;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;';
    document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';
  clearTimeout(t._tid);t._tid=setTimeout(()=>t.style.opacity='0',2800);
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()});
document.getElementById('modal-ov').addEventListener('click',e=>{if(e.target===document.getElementById('modal-ov'))closeModal()});
renderMain();
