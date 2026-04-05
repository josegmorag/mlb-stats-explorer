import './style.css'

// API Endpoints
const API_BASE = "https://statsapi.mlb.com/api/v1/stats/leaders";

// DOM Elements
const form = document.getElementById("stats-form");
const categorySelect = document.getElementById("stat-category");
const thresholdInput = document.getElementById("stat-threshold");
const submitBtn = document.getElementById("btn-search");
const btn3000_500 = document.getElementById("btn-3000-500");
const resultsGrid = document.getElementById("results-grid");
const resultsTitle = document.getElementById("results-title");
const resultsCount = document.getElementById("results-count");
const universalSearchForm = document.getElementById("universal-search-form");
const universalSearchInput = document.getElementById("universal-search-input");
const loadingState = document.getElementById("loading-state");

let currentResults = [];

// Helper mappings
const categoryLabels = {
  hits: "Hits",
  homeRuns: "Home Runs",
  runsBattedIn: "RBI",
  stolenBases: "Bases Robadas",
  strikeOuts: "Ponches"
};

const countryCodes = {
  "USA": "us", "Puerto Rico": "pr", "Venezuela": "ve", 
  "Dominican Republic": "do", "D.R.": "do", "Cuba": "cu", "Japan": "jp",
  "Mexico": "mx", "Canada": "ca", "Colombia": "co", 
  "Panama": "pa", "Nicaragua": "ni", "South Korea": "kr",
  "Taiwan": "tw", "Australia": "au", "Curacao": "cw",
  "Aruba": "aw", "Bahamas": "bs", "Germany": "de",
  "Brazil": "br", "Honduras": "hn", "Netherlands": "nl",
  "United Kingdom": "gb", "US": "us", "Virgin Islands": "vi"
};

// State functions
function setLoading(isLoading) {
  if (isLoading) {
    submitBtn.disabled = true;
    btn3000_500.disabled = true;
    universalSearchInput.disabled = true;
    loadingState.style.display = "flex";
    resultsGrid.style.display = "none";
    resultsCount.textContent = "Cargando...";
  } else {
    submitBtn.disabled = false;
    btn3000_500.disabled = false;
    universalSearchInput.disabled = false;
    loadingState.style.display = "none";
    resultsGrid.style.display = "grid";
  }
}

function renderCards(data, categoryValLabel) {
  resultsGrid.innerHTML = "";
  
  if (data.length === 0) {
    resultsGrid.innerHTML = `
      <div class="empty-state">
        <p>No se encontraron jugadores que cumplan los criterios.</p>
      </div>`;
    resultsCount.textContent = "0 resultados";
    return;
  }
  
  resultsCount.textContent = `${data.length} lideres`;

  data.forEach((p, index) => {
    // Determine the stat value
    let statValView = "";
    if (p.both) {
       statValView = `<div class="stat-badge hits">H: ${p.hits}</div><div class="stat-badge hr">HR: ${p.hr}</div>`;
    } else {
       statValView = `<div class="stat-badge single">${p.primaryStat} ${categoryValLabel}</div>`;
    }

    const card = document.createElement("div");
    card.className = "player-card";
    card.style.animationDelay = `${index * 0.05}s`;
    
    const imgUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${p.id}/headshot/67/current`;
    
    card.innerHTML = `
      <div class="card-rank">#${index + 1}</div>
      <div class="player-photo">
        <img src="${imgUrl}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="card-info">
        <h3>${p.name}</h3>
        <div class="card-stats">
          ${statValView}
        </div>
      </div>
    `;
    resultsGrid.appendChild(card);
  });

  if (window.innerWidth <= 900) {
    setTimeout(() => {
      document.querySelector('.results-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// Render detailed trading cards for specific player searches
function renderDetailedCards(data) {
  resultsGrid.innerHTML = "";
  
  if (data.length === 0) {
    resultsGrid.innerHTML = `<div class="empty-state"><p>No se encontraron detalles.</p></div>`;
    resultsCount.textContent = "0 resultados";
    return;
  }
  
  resultsCount.textContent = `${data.length} coincidencias`;

  data.forEach((p, index) => {
    const imgUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${p.id}/headshot/67/current`;
    
    const card = document.createElement("div");
    card.className = "detailed-card";
    card.style.animationDelay = `${index * 0.05}s`;
    
    // Bio string construction
    let bioStr = "";
    if (p.birthDate) bioStr += `${p.birthDate} <span class="separator">|</span> `;
    
    // Check if we have an ISO country code to render an image flag
    const code = countryCodes[p.country];
    let flagHtml = "";
    if (code) {
       flagHtml = `<img src="https://flagcdn.com/24x18/${code}.png" alt="${p.country}" style="vertical-align: middle; border-radius: 2px;" title="${p.country}">`;
    } else if (p.country) {
       flagHtml = p.country;
    }

    if (flagHtml) bioStr += `${flagHtml} <span class="separator">|</span> `;
    if (p.position) bioStr += `${p.position}`;
    if (p.height && p.weight) bioStr += `<br/>${p.height}, ${p.weight} lbs`;

    // Stats Grid HTML
    let statsHtml = `<div class="stats-grid-extended">`;
    if (p.isPitcher && p.era) {
       statsHtml += `
         <div class="stat-box"><span class="stat-label">ERA</span><span class="stat-val">${p.era || '0.00'}</span></div>
         <div class="stat-box"><span class="stat-label">WHIP</span><span class="stat-val">${p.whip || '0.00'}</span></div>
         <div class="stat-box"><span class="stat-label">K</span><span class="stat-val">${p.so || '0'}</span></div>
         <div class="stat-box"><span class="stat-label">W</span><span class="stat-val">${p.wins || '0'}</span></div>
         <div class="stat-box"><span class="stat-label">SV</span><span class="stat-val">${p.saves || '0'}</span></div>
         <div class="stat-box"><span class="stat-label">IP</span><span class="stat-val">${p.ip || '0'}</span></div>
       `;
    } else {
       statsHtml += `
         <div class="stat-box"><span class="stat-label">AVG</span><span class="stat-val">${p.avg || '.000'}</span></div>
         <div class="stat-box"><span class="stat-label">OPS</span><span class="stat-val">${p.ops || '.000'}</span></div>
         <div class="stat-box"><span class="stat-label">HR</span><span class="stat-val">${p.hr || '0'}</span></div>
         <div class="stat-box"><span class="stat-label">H</span><span class="stat-val">${p.hits || '0'}</span></div>
         <div class="stat-box"><span class="stat-label">RBI</span><span class="stat-val">${p.rbi || '0'}</span></div>
         <div class="stat-box"><span class="stat-label">SB</span><span class="stat-val">${p.sb || '0'}</span></div>
       `;
    }
    statsHtml += `</div>`;

    card.innerHTML = `
      <div class="detailed-photo">
        <img src="${imgUrl}" alt="${p.name}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\' fill=\\'none\\' stroke=\\'%23ccc\\' stroke-width=\\'2\\'/></svg>'" />
      </div>
      <div class="detailed-info">
        <h3>${p.name}</h3>
        <div class="detailed-bio">${bioStr}</div>
        ${statsHtml}
      </div>
    `;
    resultsGrid.appendChild(card);
  });

  if (window.innerWidth <= 900) {
    setTimeout(() => {
      document.querySelector('.results-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}


// Fetch single category with pagination and optimization
async function fetchCategory(category, limit = 500, threshold = 0) {
  const statGroup = category === "strikeOuts" ? "pitching" : "hitting";
  const numPages = Math.ceil(limit / 100);
  let allLeaders = [];
  
  for(let i=0; i<numPages; i++) {
    const offset = i * 100;
    const url = `${API_BASE}?leaderCategories=${category}&statGroup=${statGroup}&statType=career&limit=100&offset=${offset}`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.leagueLeaders && data.leagueLeaders.length > 0) {
        const leaders = data.leagueLeaders[0].leaders;
        allLeaders = allLeaders.concat(leaders);
        
        // Early termination: if the last player on this page is below our threshold, stop fetching!
        if (threshold > 0 && leaders.length > 0) {
          const lastValue = parseInt(leaders[leaders.length - 1].value, 10);
          if (lastValue < threshold) {
            break; 
          }
        }
      } else {
        break; // No more data
      }
    } catch(e) { break; }
  }
  
  return allLeaders.slice(0, limit);
}

// Normal search handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const category = categorySelect.value;
  const threshold = parseInt(thresholdInput.value, 10);
  const label = categoryLabels[category];

  resultsTitle.textContent = `Líderes Históricos (> ${threshold} ${label})`;
  setLoading(true);

  try {
    const rawData = await fetchCategory(category, 2000, threshold); // Fetch up to top 2000, but intelligently stops early
    // Filter out exactly those below threshold
    const filtered = rawData.filter(p => parseInt(p.value, 10) >= threshold);
    
    // Map to normalized struct
    currentResults = filtered.map(p => ({
      id: p.person.id,
      name: p.person.fullName,
      primaryStat: p.value,
      both: false
    }));
    
    renderCards(currentResults, label);
  } catch (error) {
    console.error(error);
    resultsGrid.innerHTML = `<div class="empty-state"><p>Error al cargar datos.</p></div>`;
  } finally {
    setLoading(false);
  }
});

// Club 3000 H / 500 HR special handler
btn3000_500.addEventListener("click", async () => {
  resultsTitle.textContent = "Club 3000 Hits & 500 Home Runs";
  setLoading(true);
  
  try {
    const [hitsData, hrData] = await Promise.all([
      fetchCategory("hits", 500), 
      fetchCategory("homeRuns", 500)
    ]);
    
    // Convert arrays into searchable maps
    const hitsMap = {};
    hitsData.forEach(p => hitsMap[p.person.id] = { name: p.person.fullName, val: p.value });
    const hrMap = {};
    hrData.forEach(p => hrMap[p.person.id] = { name: p.person.fullName, val: p.value });
    
    // Find intersections
    const intersection = [];
    for (let id in hitsMap) {
      const hval = parseInt(hitsMap[id].val, 10);
      if (hval >= 3000 && hrMap[id] && parseInt(hrMap[id].val, 10) >= 500) {
        intersection.push({
          id,
          name: hitsMap[id].name,
          hits: hval,
          hr: parseInt(hrMap[id].val, 10),
          primaryStat: hrMap[id].val, // just for sorting
          both: true
        });
      }
    }
    
    // Sort by name
    intersection.sort((a,b) => a.name.localeCompare(b.name));
    
    currentResults = intersection;
    renderCards(currentResults, "Miembro");
    
  } catch (error) {
    console.error(error);
    resultsGrid.innerHTML = `<div class="empty-state"><p>Error al cargar el Club Especial.</p></div>`;
  } finally {
    setLoading(false);
  }
});

// Universal Player Search
universalSearchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = universalSearchInput.value.trim();
  if(!q) return;

  resultsTitle.textContent = `Buscando: "${q}"`;
  setLoading(true);

  try {
    // Search players by name
    const searchRes = await fetch(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(q)}`);
    const searchData = await searchRes.json();
    
    if(!searchData.people || searchData.people.length === 0) {
      renderCards([], "");
      resultsTitle.textContent = `Sin resultados para "${q}"`;
      return;
    }

    // Get stats for all matched players (Limit to top 15 to avoid saturating network)
    const promises = searchData.people.slice(0, 15).map(async (person) => {
      try {
        const statsRes = await fetch(`https://statsapi.mlb.com/api/v1/people/${person.id}?hydrate=stats(group=[hitting,pitching],type=[career])`);
        const statsData = await statsRes.json();
        
        let hitting = {};
        let pitching = {};
        let fullPerson = person;

        if (statsData.people && statsData.people.length > 0) {
           fullPerson = statsData.people[0];
           if(fullPerson.stats) {
              fullPerson.stats.forEach(st => {
                 if(st.group && st.group.displayName === "hitting" && st.type && st.type.displayName === "career") {
                    hitting = st.splits[0].stat;
                 }
                 if(st.group && st.group.displayName === "pitching" && st.type && st.type.displayName === "career") {
                    pitching = st.splits[0].stat;
                 }
              });
           }
        }
        
        const pos = fullPerson.primaryPosition ? fullPerson.primaryPosition.abbreviation : "??";
        const isPitcher = pos === "P" || (pitching.strikeOuts > 0 && !hitting.homeRuns);

        return {
          id: fullPerson.id,
          name: fullPerson.fullName,
          birthDate: fullPerson.birthDate || "",
          country: fullPerson.birthCountry || "",
          position: fullPerson.primaryPosition ? fullPerson.primaryPosition.name : "Jugador",
          height: fullPerson.height || "",
          weight: fullPerson.weight || "",
          isPitcher: isPitcher,
          
          avg: hitting.avg,
          ops: hitting.ops,
          hr: hitting.homeRuns,
          hits: hitting.hits,
          rbi: hitting.rbi,
          sb: hitting.stolenBases,
          
          era: pitching.era,
          whip: pitching.whip,
          so: pitching.strikeOuts,
          wins: pitching.wins,
          saves: pitching.saves,
          ip: pitching.inningsPitched
        };
      } catch (err) {
        return {
          id: person.id,
          name: person.fullName,
          position: "Datos no disponibles",
          isPitcher: false
        };
      }
    });

    const detailedResults = await Promise.all(promises);
    
    currentResults = detailedResults;
    renderDetailedCards(detailedResults);
    
  } catch (error) {
    console.error(error);
    resultsGrid.innerHTML = `<div class="empty-state"><p>Error al buscar jugador.</p></div>`;
  } finally {
    setLoading(false);
  }
});
