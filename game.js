const WORKER_URL = "https://clickergame.j-olatunde.workers.dev";

let save = null;
let loaded = false;
const buildingsData = {
  cursor:{base:10}, farm:{base:100}, factory:{base:1000}, mine:{base:5000}
};

function toggleSidebar(){
  const s=document.getElementById("sidebar");
  s.style.display = s.style.display==="block"?"none":"block";
}

function render(){
  document.getElementById("cookies").innerText = Math.floor(save.cookies)+" Cookies";
  document.getElementById("cps").innerText = Math.floor(save.cps*save.multiplier)+" CPS";
  document.getElementById("multiplier").innerText = "x"+save.multiplier;

  // buildings
  let bHtml="";
  for(let b in buildingsData){
    bHtml += `<button onclick="buyBuilding('${b}')">${b}</button>
      <p>Owned: ${save.buildings[b]} | Cost: ${Math.floor(buildingsData[b].base*Math.pow(1.15, save.buildings[b]))}</p>`;
  }
  document.getElementById("buildings").innerHTML=bHtml;

  // click upgrade
  document.getElementById("clickCost").innerText = "Cost "+Math.floor(50*Math.pow(2, save.clickPower-1));

  // achievements
  const ach=[];
  if(save.totalCookies>=100) ach.push("100 Cookies");
  if(save.totalCookies>=1000) ach.push("1K Cookies");
  if(save.prestige>0) ach.push("First Prestige");
  document.getElementById("achievements").innerHTML = ach.map(a=>"<li>"+a+"</li>").join("");
}

// floating text effect
function floatText(e,text){
  const d=document.createElement("div");
  d.className="float";
  d.innerText=text;
  d.style.left=e.clientX+"px";
  d.style.top=e.clientY+"px";
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),1000);
}

// click
async function clickCookie(e){
  if(!loaded) return;
  save.cookies += save.clickPower*save.multiplier;
  floatText(e,"+"+(save.clickPower*save.multiplier));
  render();
  const res = await fetch(`${WORKER_URL}/api/click`, {method:"POST"});
  const s = await res.json();
  save = s; render();
}

// buy building
async function buyBuilding(type){
  const res = await fetch(`${WORKER_URL}/api/building/${type}`, {method:"POST"});
  save = await res.json(); render();
}

// upgrade click
async function upgradeClick(){
  const res = await fetch(`${WORKER_URL}/api/clickUpgrade`, {method:"POST"});
  save = await res.json(); render();
}

// prestige
async function prestige(){
  const res = await fetch(`${WORKER_URL}/api/prestige`, {method:"POST"});
  save = await res.json(); render();
}

// submit leaderboard
async function submitScore(){
  const n = document.getElementById("name").value.trim();
  if(!n) return;
  const res = await fetch(`${WORKER_URL}/api/leaderboard`, {
    method:"POST",
    body: JSON.stringify({name:n}),
    headers: {"Content-Type":"application/json"}
  });
  const board = await res.json();
  document.getElementById("leaderboard").innerHTML = board.map(e=>`<li>${e.name} - ${e.score}</li>`).join("");
}

// passive CPS
setInterval(()=>{
  if(!loaded) return;
  save.cookies += save.cps*save.multiplier;
  render();
},1000);

// load game
async function loadGame(){
  const res = await fetch(`${WORKER_URL}/api/load`);
  save = await res.json();
  loaded = true;
  render();
  const lbRes = await fetch(`${WORKER_URL}/api/leaderboard`);
  const board = await lbRes.json();
  document.getElementById("leaderboard").innerHTML = board.map(e=>`<li>${e.name} - ${e.score}</li>`).join("");
}

loadGame();
