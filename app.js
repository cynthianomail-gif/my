// ── GitHub 設定 ──
const GH_REPO='cynthianomail-gif/my';
const GH_FILE='data.js';

// 從 data.js 載入遊戲資料
let G = (_DB && _DB.g) ? _DB.g.slice() : [];
let nid = (_DB && _DB.nid) ? _DB.nid : 1;
// 統計模式欄位（全域共用）：使用者自訂，舊資料無此欄時補預設
let statModes = (_DB && _DB.statModes && _DB.statModes.length) ? _DB.statModes.slice() : ['NG 平均得分倍','FG 平均得分倍'];
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
    if(lsD.statModes&&lsD.statModes.length)statModes=lsD.statModes.slice();
  }
  // 若 data.js 比較新（剛從 GitHub 拉回），保留 data.js 的 G 不動
})();

// ── 啟動時自動從 GitHub 拉最新 data.js（確保本地不會吃到舊資料）──
async function syncFromGitHub(){
  try{
    const res=await fetch('https://raw.githubusercontent.com/'+GH_REPO+'/main/'+GH_FILE+'?_='+Date.now());
    if(!res.ok)return;
    const text=await res.text();
    const m=text.match(/var\s+_DB\s*=\s*(\{[\s\S]*\})\s*;/);
    if(!m)return;
    const remote=JSON.parse(m[1]);
    const localTs=(_DB&&_DB.ts)||0;
    if(remote.ts>localTs){
      G=remote.g.slice();
      nid=Math.max(remote.nid||0,nid);
      if(remote.statModes&&remote.statModes.length)statModes=remote.statModes.slice();
      _DB.ts=remote.ts;_DB.g=remote.g;_DB.nid=remote.nid;_DB.statModes=remote.statModes;
      saveToStorage();
      if(typeof renderMain==='function')renderMain();
      if(typeof populateFilters==='function')populateFilters();
      if(typeof updateFilterUI==='function')updateFilterUI();
      if(typeof renderStats==='function'&&cur==='stats')renderStats();
      console.log('[syncFromGitHub] 已從 GitHub 同步最新資料 (ts:'+remote.ts+')');
    }else{
      console.log('[syncFromGitHub] 本地資料已是最新');
    }
  }catch(e){console.log('[syncFromGitHub] 離線或無法連線，使用本地資料');}
}

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
const VC={'Extreme':'ve','High':'vh','Medium-High':'vm','Medium':'vm','Medium-Low':'vml','Low':'vl'};


function saveToStorage(){try{localStorage.setItem('slotdb_v1',JSON.stringify({g:G,nid,ts:Date.now(),statModes}));}catch(e){}}

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
function vcl(v){return{Extreme:'ve',High:'vh','Medium-High':'vm',Medium:'vm','Medium-Low':'vml',Low:'vl'}[v]||'vm'}
function scl(s){return{'提案候補':'cand','已提案':'active','庫存':'stock'}[s]||''}
function ccl(c){return{Ways:'cw','Cluster Pays':'cc','Scatter Pays':'cs',Paylines:'cl','Meter Pay':'cm'}[c]||'cw'}
function bcl(p){return{'Hacksaw Gaming':'b-hk','NoLimit City':'b-nl','ELK Studios':'b-elk',"Play'n GO":'b-png','Shady Lady':'b-sl','Pragmatic Play':'b-prag'}[p]||''}

const FEAT_ZH={'Cascading':'連爆消除','Multiplier':'加成倍數','Wilds':'WILD圖示','Sticky Wilds':'黏性WILD','Megaways':'Megaways','Jackpot':'累積彩金'};
function featZh(f){return FEAT_ZH[f]||f}
function hasFeat(g,f){const zh=featZh(f);return(g.feat||[]).some(t=>t===f||featZh(t)===zh||t===zh);}

// ── 主題：優先用 g.theme，否則從 sum 開頭的「…主題」自動萃取 ──
const _THEME_PROVS=["Pragmatic Play","Pragmatic","Hacksaw Gaming","Hacksaw","NoLimit City","Nolimit City","Play'n GO","ELK Studios","ELK","Shady Lady"];
function themeOf(g){
  if(g&&g.theme)return g.theme;
  const s=(g&&g.sum)||'';const i=s.indexOf('主題');
  if(i<0)return '';
  let pre=s.slice(0,i).split(/[。，]/).pop().trim();
  for(const p of _THEME_PROVS){if(pre.startsWith(p)){pre=pre.slice(p.length).trim();break;}}
  return pre.replace(/^的\s*/,'').replace(/[的\s]+$/,'').trim();
}
// 常用主題分類：依主題關鍵字歸類；可多重命中，篩選為 OR；「其他」= 有主題但不屬任何分類
const THEME_CATS=[
  {label:'海洋/釣魚', re:/海|釣魚|釣|金魚|鯊|深海|船|亞特蘭提斯|魔鬼魚|Tuna|Marlin|Tiki/i},
  {label:'神話/古文明', re:/神話|希臘|北歐|羅馬|埃及|木乃伊|圖坦卡門|歐西里斯|拉神|印加|阿茲特克|馬丘比丘|雅典娜|奧林帕斯|阿瑞斯|命運女神|冥|神曲|維京|長矛之王|天鵝座|潘朵拉|牛神|戰神/},
  {label:'龍/亞洲', re:/龍|亞洲|東方|中國|武士|廟|財神|貓熊|蟒蛇|圓環/},
  {label:'動物', re:/動物|猴|猩猩|猿|熊|豬|貓|虎|河狸|鼴鼠|蛇|草原|野生|大腳怪|金剛|長頸鹿|蜂|獅|鬥牛|野馬/},
  {label:'人物', re:/公主|女王|國王|王后|奶奶|主角|搭檔|警察|英雄|教授|醫生|將軍|名人|前女友|傳教士|政治人物|小丑|騎士/},
  {label:'恐怖/萬聖', re:/恐怖|吸血鬼|鬼|骷髏|惡魔|邪惡|怪獸|死神|死亡|血腥|屠夫|萬聖|療養院|哥德|地獄|冥界|越獄|監獄|犯罪|末日|黑暗/},
  {label:'水果/糖果', re:/糖果|水果|甜點|甜蜜|莓果|蜂巢|蜂蜜|爆炸|爆破/},
  {label:'西部/淘金', re:/西部|牛仔|賞金|狩獵|淘金|礦坑|採礦|金礦/},
  {label:'太空/科幻', re:/太空|宇宙|賽博|蒸汽朋克|天空城|科技|未來/},
  {label:'節慶', re:/聖誕|萬聖|復活節|嘉年華|節日|節慶|購物節|黑色星期五/},
  {label:'賭場/Vegas', re:/賭場|拉斯維加斯|Vegas|撲克|骰子|娛樂城|霓虹|鑽石|珠寶|度假村|夜店/i},
  {label:'運動', re:/足球|賽車|競速|鬥牛|世界盃/},
  {label:'諷刺/黑色幽默', re:/諷刺|黑色幽默|政治|詐騙|陰謀|大麻/},
];
function themeCatMatch(g,label){const t=themeOf(g);if(!t)return false;
  // 主題若是明確分類標籤（編輯時指定/已遷移）→ 只做精確比對，避免標籤內關鍵字誤觸其他分類（如「恐怖/萬聖」含「萬聖」誤判節慶）
  const exp=t==='其他'||THEME_CATS.some(c=>c.label===t);
  if(exp)return label==='其他'?t==='其他':t===label;
  // 自由文字主題（未指定的新遊戲，自動依摘要）→ 關鍵字比對
  if(label==='其他')return !THEME_CATS.some(c=>c.re.test(t));
  const c=THEME_CATS.find(x=>x.label===label);return c?c.re.test(t):false;}
function fv(id){const e=document.getElementById(id);return e?e.value:'';}
// 連線分類：各種線數類（X 線 / Lines / Paylines）併為單一 Paylines，其餘原樣（表格仍顯示原始線數）
function connCat(c){return c?(/線|[Ll]ines?/.test(c)?'Paylines':c):'';}

function gameLink(g){
  if(g.link&&g.link!=='https://www.bigwinboard.com/')return g.link;
  const ps={'Hacksaw Gaming':'hacksaw-gaming','NoLimit City':'nolimit-city','ELK Studios':'elk-studios',"Play'n GO":'playn-go','Shady Lady':'shady-lady','Pragmatic Play':'pragmatic-play'}[g.provider]||'';
  if(!ps)return g.link||'#';
  const slug=g.name.toLowerCase().replace(/&/g,'and').replace(/[''\']/g,'').replace(/\+/g,'plus').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return`https://www.bigwinboard.com/${slug}-${ps}-slot-review/`;
}

function filt(pf=null){
  const q=(document.getElementById('q')||{}).value?.toLowerCase()||'';
  const fProv=fv('f-prov'),fConn=fv('f-conn'),fGrid=fv('f-grid'),fVol=fv('f-vol'),fSt=fv('f-status'),fTheme=fv('f-theme'),dFrom=fv('f-date-from'),dTo=fv('f-date-to');
  let r=G.filter(g=>{
    if(pf&&g.provider!==pf)return false;
    if(q&&!(g.name.toLowerCase().includes(q)||g.provider.toLowerCase().includes(q)||(g.sum||'').toLowerCase().includes(q)))return false;
    if(fProv&&g.provider!==fProv)return false;
    if(fConn&&connCat(g.conn||'')!==fConn)return false;
    if(fGrid&&(g.grid||'')!==fGrid)return false;
    if(fVol&&(g.vol||'')!==fVol)return false;
    if(fSt&&(g.status||'庫存')!==fSt)return false;
    if(fTheme&&!themeCatMatch(g,fTheme))return false;
    if(dFrom&&(g.releaseDate||'')<dFrom)return false;
    if(dTo&&(g.releaseDate||'')>dTo)return false;
    return true;
  });
  const VOL_ORD={'Low':1,'Medium-Low':2,'Medium':3,'Medium-High':4,'High':5,'Extreme':6};
  r.sort((a,b)=>{let av=a[ss.k]||'',bv=b[ss.k]||'';
    if(ss.k==='theme'){av=themeOf(a);bv=themeOf(b)}
    if(ss.k==='rtp'||ss.k==='maxwin'){av=parseFloat(av)||0;bv=parseFloat(bv)||0}
    if(ss.k==='vol'){av=VOL_ORD[av]||0;bv=VOL_ORD[bv]||0}
    if(ss.k==='grid'){const p=v=>{const m=v.match(/(\d+)[×x](\d+)/);return m?parseInt(m[1])*100+parseInt(m[2]):0};av=p(av);bv=p(bv)}
    if(ss.k==='status'){const o={'已提案':1,'提案候補':2,'庫存':3,'':4};av=o[av]??4;bv=o[bv]??4}
    return av<bv?-ss.d:av>bv?ss.d:0});
  return r;
}

// ── 篩選列：填入各欄唯一值 + 清除 ──
function populateFilters(){
  const cfg=[['f-prov','provider','廠商'],['f-conn','__conn','連線'],['f-grid','grid','盤面'],['f-vol','vol','波動'],['f-status','status','狀態']];
  const VOL_ORD={'Low':1,'Medium-Low':2,'Medium':3,'Medium-High':4,'High':5,'Extreme':6};
  cfg.forEach(([id,key,allLbl])=>{
    const sel=document.getElementById(id);if(!sel)return;
    const prev=sel.value;
    let vals;
    if(key==='__conn')vals=[...new Set(G.map(g=>connCat(g.conn||'')).filter(Boolean))];
    else if(key==='status')vals=[...new Set(G.map(g=>g.status||'庫存').filter(Boolean))];
    else vals=[...new Set(G.map(g=>g[key]||'').filter(Boolean))];
    if(id==='f-vol')vals.sort((a,b)=>(VOL_ORD[a]||9)-(VOL_ORD[b]||9));
    else vals.sort((a,b)=>String(a).localeCompare(String(b),'zh-Hant'));
    sel.innerHTML='<option value="">'+allLbl+'</option>'+vals.map(v=>'<option>'+v+'</option>').join('');
    if(prev&&vals.includes(prev))sel.value=prev;
  });
  // 主題：常用分類下拉（含筆數）+ 其他
  const th=document.getElementById('f-theme');
  if(th&&th.tagName==='SELECT'){
    const prev=th.value;
    const cats=THEME_CATS.map(c=>({label:c.label,n:G.filter(g=>themeCatMatch(g,c.label)).length})).filter(c=>c.n>0);
    const otherN=G.filter(g=>themeCatMatch(g,'其他')).length;
    let html='<option value="">主題</option>';
    cats.forEach(c=>html+='<option value="'+c.label+'">'+c.label+' ('+c.n+')</option>');
    if(otherN>0)html+='<option value="其他">其他 ('+otherN+')</option>';
    th.innerHTML=html;
    if(prev)th.value=prev;
  }
}
function clearFilters(){
  ['f-prov','f-conn','f-grid','f-vol','f-status','f-theme','f-date-from','f-date-to','q'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  renderCurrent();
}
// 篩選器：標記啟用中欄位 + 顯示啟用數量徽章
function updateFilterUI(){
  const ids=['f-prov','f-conn','f-grid','f-vol','f-status','f-theme','f-date-from','f-date-to'];
  let n=0;
  ids.forEach(id=>{const e=document.getElementById(id);if(!e)return;const on=!!e.value;e.classList.toggle('on',on);if(on)n++;});
  const panel=document.getElementById('fpanel');
  if(panel){panel.classList.toggle('has-active',n>0);const c=document.getElementById('fcount');if(c)c.textContent=n;}
}
// 篩選器：收 / 開（狀態記憶於 localStorage）
function toggleFilters(){
  const p=document.getElementById('fpanel');if(!p)return;
  p.classList.toggle('collapsed');
  try{localStorage.setItem('fbar_collapsed',p.classList.contains('collapsed')?'1':'0');}catch(e){}
}
function initFilterPanel(){
  const p=document.getElementById('fpanel');if(!p)return;
  let c='0';try{c=localStorage.getItem('fbar_collapsed')||'0';}catch(e){}
  p.classList.toggle('collapsed',c==='1');
  updateFilterUI();
}

function rowHtml(g,i){
  const ft=(g.feat||[]).map(f=>`<span class="ftag">${f}</span>`).join('');
  return`<tr data-id="${g.id}" style="animation-delay:${i*.022}s" class="${g.id===selId?'sel':''}" onclick="openPanel(${g.id})">
    <td>${imgWithFallback(g.img, g.name, g.provider, 't-thumb')}</td>
    <td><div class="t-name">${g.name}</div><div class="t-sub">${g.sum?g.sum.slice(0,55)+'…':''}</div></td>
    <td><span class="badge ${bcl(g.provider)}">${g.provider}</span></td>
    <td class="t-theme">${themeOf(g)?`<span class="thm" title="${themeOf(g)}">${themeOf(g)}</span>`:'—'}</td>
    <td style="color:var(--tx3);font-size:11px;font-weight:700;white-space:nowrap">${fd(g.releaseDate)}</td>
    <td>${g.conn?`<span class="conn ${ccl(connCat(g.conn))}">${connCat(g.conn)}</span>`:'—'}</td>
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
  else if(cur==='stats')statRefresh();
  else if(provMap[cur])renderProv(provMap[cur]);
  updateFilterUI();
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
    if(m!==last){last=m;html+=`<tr class="mdiv"><td colspan="12" style="padding:14px 14px 4px"><span class="mlbl">📅 ${m}</span></td></tr>`}
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
          <tr><td>連線類型</td><td>${g.conn?`<span class="conn ${ccl(connCat(g.conn))}">${connCat(g.conn)}</span>`:'—'}</td></tr>
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
  const VOL_ORD={'Low':1,'Medium-Low':2,'Medium':3,'Medium-High':4,'High':5,'Extreme':6};
  const pG=G.filter(g=>g.provider===pname&&(!q||g.name.toLowerCase().includes(q)||g.sum?.toLowerCase().includes(q)));
  pG.sort((a,b)=>{let av=a[ss.k]||'',bv=b[ss.k]||'';
    if(ss.k==='theme'){av=themeOf(a);bv=themeOf(b)}
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
      <td class="t-theme">${themeOf(g)?`<span class="thm" title="${themeOf(g)}">${themeOf(g)}</span>`:'—'}</td>
      <td style="color:var(--tx3);font-size:11px;font-weight:700;white-space:nowrap">${fd(g.releaseDate)}</td>
      <td>${g.conn?`<span class="conn ${ccl(connCat(g.conn))}">${connCat(g.conn)}</span>`:'—'}</td>
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
      <thead><tr><th style="width:52px"></th><th onclick="sort('name')">遊戲名稱</th><th onclick="sort('theme')">主題</th><th onclick="sort('releaseDate')">發布日期</th><th onclick="sort('conn')">連線</th><th onclick="sort('grid')">盤面</th><th onclick="sort('maxwin')">Max Win</th><th onclick="sort('vol')">波動</th><th onclick="sort('status')">狀態</th><th>功能</th><th>Demo</th></tr></thead>
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
  const titles={all:'全部遊戲 🎮',hacksaw:'Hacksaw Gaming',nolimit:'NoLimit City',elk:'ELK Studios',playngo:"Play'n GO",shady:'Shady Lady','prag':'Pragmatic Play',stats:'📊 統計數據'};
  document.getElementById('page-h').textContent=titles[name]||name;
  const pm={hacksaw:'Hacksaw Gaming',nolimit:'NoLimit City',elk:'ELK Studios',playngo:"Play'n GO",shady:'Shady Lady','prag':'Pragmatic Play'};
  if(name==='stats')renderStats();
  else if(pm[name])renderProv(pm[name]);
  closePanel();closeMobMenu();
}

// ── 統計數據分頁 ──
const STAT_PROV_ORDER=['Hacksaw Gaming','NoLimit City','ELK Studios',"Play'n GO",'Shady Lady','Pragmatic Play'];
let statChartMode=0; // 長條圖目前選的項目索引
let statSort={k:null,d:-1}; // 表格排序：k=null(預設廠商+名稱)/'name'/項目名；d=-1大到小,1小到大
function _statEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _statAttr(s){return _statEsc(s).replace(/"/g,'&quot;');}
function statProvIdx(p){const i=STAT_PROV_ORDER.indexOf(p);return i<0?99:i;}

function renderStats(){
  const el=document.getElementById('pg-stats');if(!el)return;
  // 尚未記錄的遊戲 → 新增記錄下拉（依廠商分組）
  const avail=G.filter(g=>!(g.stats&&typeof g.stats==='object'));
  const byProv={};avail.forEach(g=>{(byProv[g.provider]=byProv[g.provider]||[]).push(g)});
  const provs=[...STAT_PROV_ORDER.filter(p=>byProv[p]),...Object.keys(byProv).filter(p=>!STAT_PROV_ORDER.includes(p))];
  const opts=provs.map(p=>`<optgroup label="${_statAttr(p)}">`+byProv[p].sort((a,b)=>a.name.localeCompare(b.name)).map(g=>`<option value="${g.id}">${_statEsc(g.name)}</option>`).join('')+`</optgroup>`).join('');
  const recCount=G.filter(g=>g.stats&&typeof g.stats==='object').length;
  const emptyNo=`<div class="stat-empty">📊 還沒有任何統計記錄<br><span>從上方「＋ 新增記錄」選一款遊戲開始填寫</span></div>`;
  // 動態區（總攬為全部記錄；篩選列＋表格作用在下方遊戲清單）
  const dyn=recCount
    ? statOverviewHtml()+statFilterBarHtml()+`<div id="stat-tablewrap">${statTableHtml(statSortRows(statFiltered()))}</div>`
    : emptyNo;

  el.innerHTML=`
  <style>
    .stat-page{animation:fadeIn .3s}
    .stat-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
    .stat-add-sel{padding:8px 14px;border:1.5px solid var(--border2,#d8d0c4);border-radius:10px;background:var(--white,#fff);font-size:12.5px;font-family:inherit;font-weight:700;color:var(--tx,#2d2720);cursor:pointer;max-width:260px}
    .stat-add-sel:focus{outline:none;border-color:var(--accent,#e8748a);box-shadow:0 0 0 3px var(--accent-bg,#fdf0f2)}
    .stat-btn{padding:8px 16px;border:1.5px solid var(--accent,#e8748a);border-radius:10px;background:var(--accent-bg,#fdf0f2);color:var(--accent,#e8748a);font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;transition:background .15s}
    .stat-btn:hover{background:var(--accent,#e8748a);color:#fff}
    .stat-btn.ghost{border-color:var(--border2,#d8d0c4);background:var(--white,#fff);color:var(--tx,#2d2720)}
    .stat-btn.ghost:hover{background:var(--bg,#f5f3ef);color:var(--tx,#2d2720)}
    .stat-meta{margin-left:auto;font-size:11.5px;color:var(--tx3,#9e9085);font-weight:700}
    .stat-tcard{margin-top:0;overflow-x:auto}
    .stat-table{border-collapse:collapse;width:100%;min-width:520px}
    .stat-table th{font-size:11px;font-weight:800;color:var(--tx3,#9e9085);text-align:left;padding:11px 14px;border-bottom:1.5px solid var(--border,#e8e2d8);white-space:nowrap;background:var(--bg,#f5f3ef)}
    .stat-table td{padding:9px 14px;border-bottom:1px solid var(--border,#e8e2d8);vertical-align:middle}
    .stat-table tr:last-child td{border-bottom:none}
    .stat-game-h{min-width:180px}
    .stat-game-cell{display:flex;align-items:center;gap:10px}
    .stat-game-cell .t-thumb{width:42px;height:30px;border-radius:6px;object-fit:cover;flex:none}
    .stat-game-txt .t-name{font-size:12.5px;font-weight:800;color:var(--tx,#2d2720);line-height:1.25}
    .stat-game-txt .t-sub{font-size:10.5px;color:var(--tx3,#9e9085);font-weight:700}
    .stat-mh{position:relative}
    .stat-mh-name{display:inline-block;max-width:140px;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom}
    .stat-mh-x{display:inline-block;margin-left:7px;width:16px;height:16px;line-height:15px;text-align:center;border-radius:50%;color:var(--tx3,#9e9085);background:rgba(0,0,0,.05);cursor:pointer;font-weight:800;font-size:12px}
    .stat-mh-x:hover{background:var(--accent,#e8748a);color:#fff}
    .stat-inp{width:96px;padding:7px 10px;border:1.5px solid var(--border2,#d8d0c4);border-radius:8px;font-size:13px;font-family:inherit;font-weight:700;color:var(--tx,#2d2720);text-align:right;background:var(--white,#fff)}
    .stat-inp::placeholder{color:#cfc7bb;font-weight:700}
    .stat-inp:hover{border-color:var(--tx3,#9e9085)}
    .stat-inp:focus{outline:none;border-color:var(--accent,#e8748a);box-shadow:0 0 0 3px var(--accent-bg,#fdf0f2)}
    .stat-del-h{width:40px}
    .stat-del-btn{border:none;background:none;cursor:pointer;font-size:15px;opacity:.5;transition:opacity .15s}
    .stat-del-btn:hover{opacity:1}
    .stat-empty{text-align:center;padding:60px 20px;color:var(--tx3,#9e9085);font-size:14px;font-weight:800;line-height:2}
    .stat-empty span{font-size:12px;font-weight:700;color:#bbb}
    .stat-ov{margin:0 0 16px}
    .stat-ov-title{font-size:12px;font-weight:800;color:var(--tx3,#9e9085);letter-spacing:.5px;margin:0 0 10px}
    .ov-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:10px;margin-bottom:12px}
    .ovcard{background:var(--bg,#f5f3ef);border-radius:12px;padding:12px 14px}
    .ovc-l{font-size:11.5px;color:var(--tx3,#9e9085);font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ovc-n{font-size:24px;font-weight:800;color:var(--tx,#2d2720);margin:3px 0 4px;font-variant-numeric:tabular-nums}
    .ovc-s{font-size:10.5px;color:var(--tx3,#9e9085);font-weight:700;line-height:1.55}
    .ovc-s i{font-style:normal;color:var(--tx,#2d2720)}
    .ov-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .ov-block{background:var(--bg,#f5f3ef);border:none;border-radius:12px;padding:12px 14px;min-width:0}
    .ov-body{flex-direction:column;align-items:stretch;gap:12px}
    .ov-body .ov-cards{margin-bottom:0}
    .stat-sec-title{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;color:var(--tx,#2d2720);letter-spacing:.3px;margin:0 0 10px}
    .stat-sec-title .scnt{font-size:11px;font-weight:700;color:var(--tx3,#9e9085)}
    .ov-blk-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;font-weight:800;color:var(--tx,#2d2720);margin-bottom:10px}
    .ov-tablewrap{overflow-x:auto}
    .ov-table{border-collapse:collapse;width:100%;font-size:12px}
    .ov-table th{text-align:left;font-weight:800;color:var(--tx3,#9e9085);font-size:11px;padding:6px 8px;border-bottom:1.5px solid var(--border,#e8e2d8);white-space:nowrap}
    .ov-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e8e2d8);color:var(--tx,#2d2720);font-weight:700;white-space:nowrap}
    .ov-table td.num,.ov-table th.num{text-align:right;font-variant-numeric:tabular-nums}
    .ov-table tr:last-child td{border-bottom:none}
    .ov-chart-sel{padding:4px 9px;border:1.5px solid var(--border2,#d8d0c4);border-radius:8px;background:var(--white,#fff);font-size:11px;font-family:inherit;font-weight:700;color:var(--tx,#2d2720);cursor:pointer;max-width:160px}
    .ov-bar-row{display:flex;align-items:center;gap:8px;margin:7px 0}
    .ov-bar-name{width:92px;flex:none;font-size:11.5px;font-weight:700;color:var(--tx,#2d2720);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ov-bar{flex:1;height:14px;background:var(--bg,#f5f3ef);border-radius:4px;overflow:hidden;min-width:0}
    .ov-bar-fill{display:block;height:100%;background:var(--accent,#e8748a);opacity:.72;border-radius:4px}
    .ov-bar-v{width:52px;flex:none;text-align:right;font-size:11.5px;font-weight:800;color:var(--tx,#2d2720);font-variant-numeric:tabular-nums}
    .ov-chart-empty{font-size:11.5px;color:var(--tx3,#9e9085);font-weight:700;padding:6px 0}
    .stat-filt{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
    .sf-sel,.sf-num{padding:6px 10px;border:1.5px solid var(--border2,#d8d0c4);border-radius:9px;background:var(--white,#fff);font-size:11.5px;font-family:inherit;font-weight:700;color:var(--tx,#2d2720);cursor:pointer}
    .sf-sel:focus,.sf-num:focus{outline:none;border-color:var(--accent,#e8748a);box-shadow:0 0 0 3px var(--accent-bg,#fdf0f2)}
    .sf-sel.on,.sf-num.on{border-color:var(--accent,#e8748a);background:var(--accent-bg,#fdf0f2);color:var(--accent,#e8748a)}
    .sf-num{width:62px;cursor:text;text-align:right}
    .stat-filt-range{display:inline-flex;align-items:center;gap:5px;padding:3px 5px;border-radius:9px;background:var(--bg,#f5f3ef)}
    .sf-tilde{font-size:11px;color:var(--tx3,#9e9085);font-weight:800}
    .sf-clr{padding:6px 12px;font-size:11.5px}
    .stat-cnt{font-size:11px;color:var(--tx3,#9e9085);font-weight:700;margin:2px 0 8px}
    .stat-mh-name.sortable,.stat-game-h.sortable{cursor:pointer}
    .stat-mh-name.sortable:hover,.stat-game-h.sortable:hover{color:var(--accent,#e8748a)}
    .stat-mh-name.sorted,.stat-game-h.sorted{color:var(--accent,#e8748a)}
    @media(max-width:720px){.ov-grid{grid-template-columns:1fr}}
  </style>
  <div class="stat-page">
    <div class="pnote" style="margin-bottom:14px">記錄統計數據（NG／FG 平均得分倍等）。更新資料後，請點擊「📤 儲存」同步到 GitHub。</div>
    <div class="stat-bar">
      <select class="stat-add-sel" onchange="if(this.value){statAddRow(+this.value);this.value=''}">
        <option value="">＋ 新增記錄（選一款遊戲）…</option>
        ${opts}
      </select>
      <button class="stat-btn" onclick="statAddMode()">＋ 新增項目</button>
      <button class="stat-btn ghost" onclick="statExportCSV()">⬇ 匯出 CSV</button>
      <span class="stat-meta">已記錄 ${recCount} 款 ${statModes.length} 個項目</span>
    </div>
    ${dyn}
  </div>`;
  if(recCount)statMarkFilters();
}

// ── 排序 / 篩選 ──
function statFv(id){const e=document.getElementById(id);return e?e.value:'';}
function statMarkFilters(){
  ['sf-prov','sf-vol','sf-conn','sf-status','sf-theme','sf-mode','sf-min','sf-max'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.toggle('on',!!e.value);});
  let n=0;['sf-prov','sf-vol','sf-conn','sf-status','sf-theme'].forEach(id=>{if((document.getElementById(id)||{}).value)n++;});
  if((document.getElementById('sf-mode')||{}).value)n++; // 數值範圍算一項
  const p=document.getElementById('stat-fpanel');
  if(p){p.classList.toggle('has-active',n>0);const c=document.getElementById('stat-fcount');if(c)c.textContent=n;}
}
function statFiltered(){
  const q=((document.getElementById('q')||{}).value||'').toLowerCase();
  const fp=statFv('sf-prov'),fvl=statFv('sf-vol'),fc=statFv('sf-conn'),fs=statFv('sf-status'),ft=statFv('sf-theme');
  const fm=statFv('sf-mode'),fmin=parseFloat(statFv('sf-min')),fmax=parseFloat(statFv('sf-max'));
  return G.filter(g=>g.stats&&typeof g.stats==='object').filter(g=>{
    if(q&&!(g.name.toLowerCase().includes(q)||(g.provider||'').toLowerCase().includes(q)))return false;
    if(fp&&g.provider!==fp)return false;
    if(fvl&&(g.vol||'')!==fvl)return false;
    if(fc&&connCat(g.conn||'')!==fc)return false;
    if(fs&&(g.status||'庫存')!==fs)return false;
    if(ft&&!themeCatMatch(g,ft))return false;
    if(fm){const v=parseFloat(g.stats[fm]);if(isNaN(v))return false;if(!isNaN(fmin)&&v<fmin)return false;if(!isNaN(fmax)&&v>fmax)return false;}
    return true;
  });
}
function statSortRows(rows){
  const k=statSort.k,d=statSort.d;
  if(!k)return rows.sort((a,b)=>(b.statAddedAt||0)-(a.statAddedAt||0)||b.id-a.id); // 預設：最新加入的在最上方
  if(k==='name')return rows.sort((a,b)=>d*a.name.localeCompare(b.name));
  return rows.sort((a,b)=>{
    const av=parseFloat(a.stats[k]),bv=parseFloat(b.stats[k]),an=isNaN(av),bn=isNaN(bv);
    if(an&&bn)return a.name.localeCompare(b.name);
    if(an)return 1; if(bn)return -1; // 缺值墊底
    return d===-1?(bv-av):(av-bv);
  });
}
function statSortBy(arg){
  const key=(arg==='name')?'name':statModes[arg];
  if(key==null)return;
  if(statSort.k!==key){statSort.k=key;statSort.d=-1;}      // 新欄位 → 大到小
  else if(statSort.d===-1){statSort.d=1;}                  // 再點 → 小到大
  else {statSort.k=null;statSort.d=-1;}                    // 第三次 → 回到預設（最新優先）
  statRefresh();
}
function statRefresh(){
  const wrap=document.getElementById('stat-tablewrap');
  if(!wrap){renderStats();return;}
  wrap.innerHTML=statTableHtml(statSortRows(statFiltered()));
  statMarkFilters();
}
function statClearFilters(){
  ['sf-prov','sf-vol','sf-conn','sf-status','sf-theme','sf-mode','sf-min','sf-max'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const q=document.getElementById('q');if(q)q.value='';
  statRefresh();
}
function statFilterBarHtml(){
  const recorded=G.filter(g=>g.stats&&typeof g.stats==='object');
  const uniq=arr=>[...new Set(arr.filter(Boolean))];
  const VOL_ORD={'Low':1,'Medium-Low':2,'Medium':3,'Medium-High':4,'High':5,'Extreme':6};
  const provVals=[...STAT_PROV_ORDER.filter(p=>recorded.some(g=>g.provider===p)),...uniq(recorded.map(g=>g.provider)).filter(p=>!STAT_PROV_ORDER.includes(p))];
  const volVals=uniq(recorded.map(g=>g.vol)).sort((a,b)=>(VOL_ORD[a]||9)-(VOL_ORD[b]||9));
  const connVals=uniq(recorded.map(g=>connCat(g.conn||''))).sort((a,b)=>String(a).localeCompare(String(b)));
  const statusVals=uniq(recorded.map(g=>g.status||'庫存')).sort((a,b)=>String(a).localeCompare(String(b)));
  const themeVals=(typeof THEME_CATS!=='undefined'?THEME_CATS.map(c=>c.label):[]).filter(lbl=>recorded.some(g=>themeCatMatch(g,lbl)));
  if(recorded.some(g=>themeCatMatch(g,'其他')))themeVals.push('其他');
  const opt=vals=>vals.map(v=>`<option value="${_statAttr(v)}">${_statEsc(v)}</option>`).join('');
  const modeOpts=statModes.map(m=>`<option value="${_statAttr(m)}">${_statEsc(statTrunc(m,14))}</option>`).join('');
  let collapsed='0';try{collapsed=localStorage.getItem('stat_fbar_collapsed')||'0';}catch(e){}
  return `<div class="fpanel${collapsed==='1'?' collapsed':''}" id="stat-fpanel">
    <div class="fhead" onclick="statToggleFilters()">
      <span class="ic">🔍</span><span class="fhead-title">篩選器</span>
      <span class="fcount" id="stat-fcount">0</span>
      <span class="fhead-right">
        <button class="fclr-mini" onclick="event.stopPropagation();statClearFilters()">清除</button>
        <span class="fchev">▾</span>
      </span>
    </div>
    <div class="fbody">
      <select id="sf-prov" class="sf-sel" onchange="statRefresh()"><option value="">廠商</option>${opt(provVals)}</select>
      <select id="sf-vol" class="sf-sel" onchange="statRefresh()"><option value="">波動</option>${opt(volVals)}</select>
      <select id="sf-conn" class="sf-sel" onchange="statRefresh()"><option value="">連線</option>${opt(connVals)}</select>
      <select id="sf-status" class="sf-sel" onchange="statRefresh()"><option value="">狀態</option>${opt(statusVals)}</select>
      <select id="sf-theme" class="sf-sel" onchange="statRefresh()"><option value="">主題</option>${opt(themeVals)}</select>
      <span class="stat-filt-range">
        <select id="sf-mode" class="sf-sel" onchange="statRefresh()"><option value="">項目範圍</option>${modeOpts}</select>
        <input id="sf-min" class="sf-num" type="number" inputmode="decimal" placeholder="min" oninput="statRefresh()">
        <span class="sf-tilde">~</span>
        <input id="sf-max" class="sf-num" type="number" inputmode="decimal" placeholder="max" oninput="statRefresh()">
      </span>
      <button class="fclr" onclick="statClearFilters()">✕ 清除篩選</button>
    </div>
  </div>`;
}
function statToggleFilters(){
  const p=document.getElementById('stat-fpanel');if(!p)return;
  p.classList.toggle('collapsed');
  try{localStorage.setItem('stat_fbar_collapsed',p.classList.contains('collapsed')?'1':'0');}catch(e){}
}
function statTableHtml(rows){
  const recCount=G.filter(g=>g.stats&&typeof g.stats==='object').length;
  const secTitle=`<div class="stat-sec-title">📋 遊戲清單 <span class="scnt">顯示 ${rows.length} / ${recCount} 款</span></div>`;
  if(!rows.length)return secTitle+`<div class="stat-empty">🔍 沒有符合篩選條件的記錄</div>`;
  const arrow=act=>act?(statSort.d===-1?' ▾':' ▴'):'';
  const nameAct=statSort.k==='name';
  const modeCols=statModes.map((m,i)=>{
    const act=statSort.k===m;
    return `<th class="stat-mh"><span class="stat-mh-name sortable${act?' sorted':''}" title="${_statAttr(m)}（點擊排序）" onclick="statSortBy(${i})">${_statEsc(m)}${arrow(act)}</span><span class="stat-mh-x" title="刪除此項目欄位" onclick="event.stopPropagation();statDelMode(${i})">×</span></th>`;
  }).join('');
  const body=rows.map(g=>{
    const cells=statModes.map((m,i)=>{
      const v=g.stats[m];
      return `<td class="stat-cell"><input class="stat-inp" type="text" inputmode="decimal" value="${v==null?'':_statAttr(String(v))}" placeholder="＋" onchange="statSetVal(${g.id},${i},this.value)"></td>`;
    }).join('');
    return `<tr>
      <td class="stat-game"><div class="stat-game-cell">${imgWithFallback(g.img,g.name,g.provider,'t-thumb')}<div class="stat-game-txt"><div class="t-name">${_statEsc(g.name)}</div><div class="t-sub">${_statEsc(g.provider||'')}</div></div></div></td>
      ${cells}
      <td class="stat-del"><button class="stat-del-btn" title="刪除此記錄" onclick="statDelRow(${g.id})">🗑️</button></td>
    </tr>`;
  }).join('');
  return secTitle+`<div class="tcard stat-tcard"><table class="stat-table">
      <thead><tr><th class="stat-game-h sortable${nameAct?' sorted':''}" title="點擊排序" onclick="statSortBy('name')">遊戲${arrow(nameAct)}</th>${modeCols}<th class="stat-del-h"></th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
}

// 總攬：A 項目摘要卡片 · B 廠商比較表 · D 視覺長條圖
function statNumVals(mode){
  return G.filter(g=>g.stats&&typeof g.stats==='object'&&g.stats[mode]!=null&&String(g.stats[mode]).trim()!=='')
    .map(g=>({g,v:parseFloat(g.stats[mode])}))
    .filter(x=>!isNaN(x.v));
}
function statFmt(n){return isFinite(n)?String(Math.round(n*100)/100):'—';}
function statTrunc(s,n){s=String(s);return s.length>n?s.slice(0,n-1)+'…':s;}
function statChartBars(){
  if(!statModes.length)return '<div class="ov-chart-empty">尚無項目</div>';
  const mode=statModes[Math.min(statChartMode,statModes.length-1)];
  const vals=statNumVals(mode).sort((a,b)=>b.v-a.v);
  if(!vals.length)return '<div class="ov-chart-empty">此項目尚無數值</div>';
  const max=Math.max(...vals.map(x=>x.v))||1;
  return vals.map(x=>`<div class="ov-bar-row"><span class="ov-bar-name" title="${_statAttr(x.g.name)}">${_statEsc(x.g.name)}</span><span class="ov-bar"><span class="ov-bar-fill" style="width:${Math.max(3,Math.round(x.v/max*100))}%"></span></span><span class="ov-bar-v">${_statEsc(String(x.g.stats[mode]))}</span></div>`).join('');
}
function statChartPick(idx){statChartMode=idx;const b=document.getElementById('stat-chart-body');if(b)b.innerHTML=statChartBars();}
function statOverviewHtml(){
  const recorded=G.filter(g=>g.stats&&typeof g.stats==='object');
  if(!recorded.length||!statModes.length)return '';
  // A · 項目摘要卡片
  const cards=statModes.map(m=>{
    const vals=statNumVals(m);
    const avg=vals.length?vals.reduce((a,b)=>a+b.v,0)/vals.length:NaN;
    return `<div class="ovcard"><div class="ovc-l" title="${_statAttr(m)}">${_statEsc(m)}</div><div class="ovc-n">${statFmt(avg)}</div></div>`;
  }).join('');
  // B · 廠商比較表
  const provsRec=[...STAT_PROV_ORDER.filter(p=>recorded.some(g=>g.provider===p)),...[...new Set(recorded.map(g=>g.provider))].filter(p=>!STAT_PROV_ORDER.includes(p))];
  const provRow=(label,games)=>{
    const cells=statModes.map(m=>{
      const nums=games.map(g=>parseFloat(g.stats[m])).filter(n=>!isNaN(n));
      return `<td class="num">${nums.length?statFmt(nums.reduce((a,b)=>a+b,0)/nums.length):'—'}</td>`;
    }).join('');
    return `<tr><td>${label}</td>${cells}<td class="num">${games.length}</td></tr>`;
  };
  const bRows=provsRec.map(p=>provRow(_statEsc(p),recorded.filter(g=>g.provider===p))).join('');
  const allRow=provsRec.length>1?provRow('<b>全部平均</b>',recorded):'';
  const bTable=`<div class="ov-tablewrap"><table class="ov-table"><thead><tr><th>廠商</th>${statModes.map(m=>`<th class="num" title="${_statAttr(m)}">${_statEsc(statTrunc(m,8))}</th>`).join('')}<th class="num">記錄數</th></tr></thead><tbody>${bRows}${allRow}</tbody></table></div>`;
  // D · 視覺長條圖
  const sel=Math.min(statChartMode,statModes.length-1);
  const chartSel=`<select class="ov-chart-sel" onchange="statChartPick(this.selectedIndex)">${statModes.map((m,i)=>`<option${i===sel?' selected':''} title="${_statAttr(m)}">${_statEsc(statTrunc(m,16))}</option>`).join('')}</select>`;
  let collapsed='0';try{collapsed=localStorage.getItem('stat_ovpanel_collapsed')||'0';}catch(e){}
  return `<div class="fpanel${collapsed==='1'?' collapsed':''}" id="stat-ovpanel">
    <div class="fhead" onclick="statToggleOv()">
      <span class="ic">📊</span><span class="fhead-title">總攬</span>
      <span class="fhead-right"><span class="fchev">▾</span></span>
    </div>
    <div class="fbody ov-body">
      <div class="ov-cards">${cards}</div>
      <div class="ov-grid">
        <div class="ov-block"><div class="ov-blk-h">廠商比較</div>${bTable}</div>
        <div class="ov-block"><div class="ov-blk-h"><span>長條圖</span>${chartSel}</div><div id="stat-chart-body">${statChartBars()}</div></div>
      </div>
    </div>
  </div>`;
}
function statToggleOv(){
  const p=document.getElementById('stat-ovpanel');if(!p)return;
  p.classList.toggle('collapsed');
  try{localStorage.setItem('stat_ovpanel_collapsed',p.classList.contains('collapsed')?'1':'0');}catch(e){}
}

function statAddRow(id){
  const g=G.find(x=>x.id===id);if(!g)return;
  if(!g.stats||typeof g.stats!=='object'){g.stats={};g.statAddedAt=Date.now();}
  saveToStorage();markUnsaved();renderStats();
}
function statDelRow(id){
  const g=G.find(x=>x.id===id);if(!g)return;
  if(!confirm('刪除「'+g.name+'」的統計記錄？'))return;
  delete g.stats;
  saveToStorage();markUnsaved();renderStats();
}
function statSetVal(id,modeIdx,val){
  const g=G.find(x=>x.id===id);if(!g)return;
  const m=statModes[modeIdx];if(m==null)return;
  if(!g.stats||typeof g.stats!=='object')g.stats={};
  const v=(val||'').trim();
  if(v==='')delete g.stats[m];else g.stats[m]=v;
  saveToStorage();markUnsaved();
}
function statAddMode(){
  const name=prompt('新增項目名稱（例如：購買FG 平均得分倍、超級FG 平均得分倍）');
  if(name==null)return;
  const n=name.trim();if(!n)return;
  if(statModes.includes(n)){alert('已有相同項目「'+n+'」');return}
  statModes.push(n);
  saveToStorage();markUnsaved();renderStats();
}
function statDelMode(idx){
  const m=statModes[idx];if(m==null)return;
  if(!confirm('刪除項目「'+m+'」？所有記錄中這一欄的數值會一併移除。'))return;
  statModes.splice(idx,1);
  G.forEach(g=>{if(g.stats&&typeof g.stats==='object'&&(m in g.stats))delete g.stats[m]});
  saveToStorage();markUnsaved();renderStats();
}
function statExportCSV(){
  const rows=G.filter(g=>g.stats&&typeof g.stats==='object');
  if(!rows.length){alert('還沒有任何統計記錄可匯出 😊');return}
  rows.sort((a,b)=>statProvIdx(a.provider)-statProvIdx(b.provider)||a.name.localeCompare(b.name));
  const esc=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const head=['遊戲名稱','廠商',...statModes];
  const body=rows.map(g=>[g.name,g.provider,...statModes.map(m=>g.stats[m])].map(esc).join(','));
  const csv='﻿'+[head.map(esc).join(','),...body].join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download=`slot-stats-${new Date().toISOString().slice(0,10)}.csv`;a.click();
  showToast('✅ 已匯出統計 CSV！');
}

// ── MODAL ──
// 編輯表單「主題」下拉：（自動依摘要）+ 常用分類 + 其他
function fillModalTheme(){
  const s=document.getElementById('m-theme');if(!s)return;
  s.innerHTML='<option value="">（自動依摘要）</option>'+THEME_CATS.map(c=>'<option value="'+c.label+'">'+c.label+'</option>').join('')+'<option value="其他">其他</option>';
}
function openModal(id=null){
  eid=id;clearMod();fillModalTheme();
  document.getElementById('m-title').textContent=id?'✏️ 編輯遊戲':'＋ 新增遊戲 ✨';
  if(id){
    const g=G.find(x=>x.id===id);
    if(g){
      const m={name:g.name,prov:g.provider,date:g.releaseDate,conn:g.conn,grid:g.grid,rtp:g.rtp,mw:g.maxwin,vol:g.vol,status:g.status||'',theme:g.theme||'',bet:g.bet,img:g.img,link:g.link,sum:g.sum,rules:g.rules,
        mechs:g.mechs?JSON.stringify(g.mechs,null,2):''};
      Object.entries(m).forEach(([k,v])=>{const el=document.getElementById('m-'+k);if(el)el.value=v||''});
      document.querySelectorAll('.chks input[type=checkbox]').forEach(c=>c.checked=(g.feat||[]).some(t=>t===c.value||featZh(t)===c.value));
    }
  }else{document.getElementById('m-date').value=new Date().toISOString().slice(0,10)}
  document.getElementById('modal-ov').classList.add('open');
}
function closeModal(){document.getElementById('modal-ov').classList.remove('open');eid=null}
function clearMod(){
  ['m-name','m-prov','m-date','m-conn','m-grid','m-rtp','m-mw','m-vol','m-status','m-theme','m-bet','m-img','m-link','m-sum','m-rules','m-mechs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
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
    vol:document.getElementById('m-vol').value,status:document.getElementById('m-status').value,theme:document.getElementById('m-theme').value,bet:document.getElementById('m-bet').value.trim(),
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
  const content='// ── SLOT DB DATA ── (此檔案由系統自動更新，請勿手動編輯)\nvar _DB='+JSON.stringify({ts,nid,g:G,statModes})+';\n';
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
    const dataContent='// ── SLOT DB DATA ── (此檔案由系統自動更新，請勿手動編輯)\nvar _DB='+JSON.stringify({ts,nid,g:G,statModes})+';\n';
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
  if(!lbl)return;
  if(ghToken()){lbl.textContent='✓ GitHub';lbl.style.color='var(--mint,#4caf7d)';}
  else{lbl.textContent='⚙️ GitHub';lbl.style.color='';}
}
function toggleFabMenu(){
  const items=document.getElementById('fab-items');
  const trigger=document.getElementById('fab-trigger');
  if(!items)return;
  const open=items.classList.toggle('open');
  if(trigger)trigger.textContent=open?'✕':'☰';
  if(open){
    const close=e=>{if(!document.getElementById('fab-wrap')?.contains(e.target)){items.classList.remove('open');if(trigger)trigger.textContent='☰';document.removeEventListener('click',close);}};
    setTimeout(()=>document.addEventListener('click',close),0);
  }
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
populateFilters();
initFilterPanel();
// 頁面載入後自動同步 GitHub 最新資料
syncFromGitHub();
