// ── v2.3 weather widget (Open-Meteo, no key required) ──
// v2.4.30: store 角色只顯示自家所在城市；agent 看全部 3 個城市
const KIMONO_WX_ALL_CITIES = [
  { name: '京都', lat: 35.0116, lng: 135.7681, stores: ['kyoto1','kyoto2'] },
  { name: '大阪', lat: 34.6937, lng: 135.5023, stores: ['osaka1'] },
  { name: '東京', lat: 35.6762, lng: 139.6503, stores: ['tokyo1'] }
];
function getKimonoWxCities() {
  if (currentRole === 'store' && currentStoreKey) {
    const own = KIMONO_WX_ALL_CITIES.filter(c => c.stores.indexOf(currentStoreKey) >= 0);
    return own.length ? own : KIMONO_WX_ALL_CITIES;  // fallback 若 storeKey 對不上 city map
  }
  return KIMONO_WX_ALL_CITIES;
}
const KIMONO_WX_CITIES = KIMONO_WX_ALL_CITIES;  // legacy alias for backward compat
const WX_CACHE_KEY = 'kimono_wx_cache_v1';
const WX_CACHE_TTL = 30 * 60 * 1000;  // 30 minutes
function wxIcon(code){
  if(code===0) return '☀️';
  if(code<=3) return '🌤';
  if(code<=48) return '🌫';
  if(code<=57) return '🌦';
  if(code<=67) return '🌧';
  if(code<=77) return '🌨';
  if(code<=82) return '🌧';
  if(code<=86) return '🌨';
  if(code===95) return '⛈';
  if(code>=96) return '⛈';
  return '·';
}
function wxLabel(code){
  if(code===0) return '晴';
  if(code<=3) return '多雲';
  if(code<=48) return '霧';
  if(code<=57) return '毛雨';
  if(code<=67) return '雨';
  if(code<=77) return '雪';
  if(code<=82) return '陣雨';
  if(code<=86) return '雪';
  if(code>=95) return '雷雨';
  return '—';
}
async function loadWeather(force){
  const container = document.getElementById('weather-container');
  if(!container) return;
  // v2.4.30: cache 比對城市清單，role 切換時自動 refetch
  const expectedCities = getKimonoWxCities().map(c => c.name).join(',');
  if(!force){
    try{
      const cached = JSON.parse(localStorage.getItem(WX_CACHE_KEY)||'null');
      if(cached && cached.ts && Date.now() - cached.ts < WX_CACHE_TTL){
        const cachedCities = (cached.data||[]).map(d => d.city).join(',');
        if (cachedCities === expectedCities) {
          renderWeather(cached.data);
          return;
        }
        // 城市清單變了（換角色登入）→ 不用 cache，去 refetch
      }
    }catch(_){}
  }
  try{
    const results = await Promise.all(getKimonoWxCities().map(async c=>{
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Tokyo&forecast_days=7`;
      const r = await fetch(url);
      const d = await r.json();
      return { city: c.name, daily: d.daily };
    }));
    localStorage.setItem(WX_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: results }));
    renderWeather(results);
  }catch(e){
    container.innerHTML = '<div class="text-red-500 text-center py-4 col-span-3">天氣資料載入失敗：'+e.message+'</div>';
  }
}
function renderWeather(results){
  const container = document.getElementById('weather-container');
  if(!container) return;
  // Update fetch timestamp
  try {
    const cached = JSON.parse(localStorage.getItem(WX_CACHE_KEY)||'null');
    const ts = cached && cached.ts ? new Date(cached.ts) : new Date();
    const m = String(ts.getMonth()+1).padStart(2,'0');
    const d = String(ts.getDate()).padStart(2,'0');
    const hh = String(ts.getHours()).padStart(2,'0');
    const mm = String(ts.getMinutes()).padStart(2,'0');
    const fetchedEl = document.getElementById('weather-fetched-at');
    if (fetchedEl) fetchedEl.textContent = m + '/' + d + ' ' + hh + ':' + mm + ' (本地時間)';
  } catch(_){}

  // v2.4.26: 氣象台風格 — 日期 column 共用，各城市一 row
  const mdLabels = ['一','二','三','四','五','六','日'];
  // 取共用的日期 (用第一個有資料的城市的時間軸，預設 7 天)
  const firstCity = results.find(r => r.daily && r.daily.time);
  if (!firstCity) {
    container.innerHTML = '<div class="text-red-500 text-center py-4">無天氣資料</div>';
    return;
  }
  const dates = firstCity.daily.time.slice(0, 7);

  // Header row: city label cell + date cells
  let html = '<div class="bg-white border border-slate-100 rounded-lg overflow-x-auto"><table class="w-full text-sm" style="border-collapse:collapse">';
  // Header
  html += '<thead><tr>';
  html += '<th class="text-left px-3 py-2 bg-slate-50 sticky left-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider" style="min-width:60px">地點</th>';
  dates.forEach((iso, i) => {
    const dt = new Date(iso);
    const isToday = i === 0;
    const md = mdLabels[(dt.getDay()+6)%7];
    html += '<th class="text-center px-2 py-2 ' + (isToday?'bg-amber-50':'bg-slate-50') + '" style="min-width:54px">';
    html += '<div class="text-[11px] font-bold ' + (isToday?'text-amber-700':'text-slate-700') + '">' + (isToday?'今':(dt.getMonth()+1)+'/'+dt.getDate()) + '</div>';
    html += '<div class="text-[10px] text-slate-500 font-normal">' + md + '</div>';
    html += '</th>';
  });
  html += '</tr></thead>';

  // Body rows: one per city
  html += '<tbody>';
  results.forEach((r, rowIdx) => {
    const d = r.daily;
    html += '<tr class="border-t border-slate-100">';
    // City name cell
    html += '<td class="px-3 py-2 sticky left-0 bg-white font-bold text-[#1A365D] text-sm" style="min-width:60px">' + r.city + '</td>';
    if (!d) {
      html += '<td colspan="' + dates.length + '" class="text-center text-xs text-red-400 py-2">無資料</td>';
    } else {
      d.time.slice(0, 7).forEach((iso, i) => {
        const isToday = i === 0;
        const code = d.weathercode[i];
        const tmax = Math.round(d.temperature_2m_max[i]);
        const tmin = Math.round(d.temperature_2m_min[i]);
        const pop = d.precipitation_probability_max[i];
        html += '<td class="text-center px-1 py-2 ' + (isToday?'bg-amber-50/40':'') + '" title="' + wxLabel(code) + '">';
        html += '<div class="text-xl leading-none mb-1">' + wxIcon(code) + '</div>';
        html += '<div class="text-[11px] font-bold leading-tight"><span class="text-rose-600">' + tmax + '°</span><span class="text-slate-400 mx-0.5">/</span><span class="text-blue-600">' + tmin + '°</span></div>';
        if (pop >= 20) html += '<div class="text-[10px] text-blue-500 mt-0.5">💧' + pop + '%</div>';
        html += '</td>';
      });
    }
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  // Override grid layout: take full width, no internal grid
  container.className = 'text-sm';
  container.innerHTML = html;
}
// Auto-load on dashboard show or initial load
document.addEventListener('DOMContentLoaded', () => {
  // Delay so dashboard is mounted
  setTimeout(loadWeather, 300);
});
