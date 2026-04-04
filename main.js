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
        
        let hits = 0;
        let hr = 0;
        let isPitcher = false;
        let so = 0;

        if(statsData.people && statsData.people[0].stats) {
          const statsArray = statsData.people[0].stats;
          statsArray.forEach(st => {
             if(st.group && st.group.displayName === "hitting" && st.type && st.type.displayName === "career") {
                const s = st.splits[0].stat;
                hits = s.hits || 0;
                hr = s.homeRuns || 0;
             }
             if(st.group && st.group.displayName === "pitching" && st.type && st.type.displayName === "career") {
                const s = st.splits[0].stat;
                so = s.strikeOuts || 0;
                isPitcher = true;
             }
          });
        }
        
        const primaryStatLabel = isPitcher && so > 0 ? `${so} Ponches | ${hits} Hits` : `${hits} Hits | ${hr} HR`;

        return {
          id: person.id,
          name: person.fullName,
          primaryStat: primaryStatLabel,
          both: false
        };
      } catch (err) {
        return {
          id: person.id,
          name: person.fullName,
          primaryStat: "Datos no disponibles",
          both: false
        };
      }
    });

    const detailedResults = await Promise.all(promises);
    
    currentResults = detailedResults;
    renderCards(detailedResults, "");
    
  } catch (error) {
    console.error(error);
    resultsGrid.innerHTML = `<div class="empty-state"><p>Error al buscar jugador.</p></div>`;
  } finally {
    setLoading(false);
  }
});
