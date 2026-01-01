const WORKER_URL = "https://clickergame.j-olatunde.workers.dev";

let save = {cookies:0,totalCookies:0,clickPower:1,cps:0,multiplier:1,prestige:0,buildings:{}};
const cookieBtn = document.getElementById("cookie-btn");
const cookieCounter = document.getElementById("cookie-counter");
const cpsCounter = document.getElementById("cps-counter");
const buildingsList = document.getElementById("buildings-list");
const upgradesList = document.getElementById("upgrades-list");
const prestigeBtn = document.getElementById("prestige-btn");
const floatingTextContainer = document.getElementById("floating-text-container");
const achievementsList = document.getElementById("achievements-list");
const leaderboardList = document.getElementById("leaderboard-list");
const playerNameInput = document.getElementById("player-name");
const submitScoreBtn = document.getElementById("submit-score-btn");

let userid="player1";

// --- Buildings ---
const buildingIcons = ["🖱️","🌾","🏭","⛏️","🔬","🛰️","🤖","🏰","🛳️","🚀"];
const buildings = [];
for(let i=1;i<=50;i++){
    const baseCPS = i*2;
    const baseCost = i*100;
    const icon = buildingIcons[(i-1)%buildingIcons.length];
    buildings.push({name:`Building ${i}`, baseCost, cps: baseCPS, icon});
}

// --- Upgrades ---
const upgrades = [
    {name:"Click Power +1", baseCost:50, effect:()=>save.clickPower+=1, icon:"⚡"},
    {name:"Click Power +2", baseCost:200, effect:()=>save.clickPower+=2, icon:"⚡"},
    {name:"Auto Clicker +1 CPS", baseCost:500, effect:()=>save.cps+=1, icon:"🤖"},
    {name:"Golden Cookie", baseCost:1000, effect:()=>save.cookies+=100, icon:"🍪"},
    {name:"Multiplier Boost", baseCost:2500, effect:()=>save.multiplier+=0.5, icon:"✨"}
];
upgrades.forEach(u=>u.cost=u.baseCost);

// --- Achievements ---
const achievements = [
    {name:"First 100 Cookies", condition:s=>s.totalCookies>=100, unlocked:false},
    {name:"1K Cookies", condition:s=>s.totalCookies>=1000, unlocked:false},
    {name:"10K Cookies", condition:s=>s.totalCookies>=10000, unlocked:false},
    {name:"First Prestige", condition:s=>s.prestige>=1, unlocked:false},
];

// --- Helpers ---
function updateDisplay(){
    cookieCounter.innerText=`Cookies: ${Math.floor(save.cookies)}`;
    cpsCounter.innerText=`CPS: ${save.cps} | Click x${(save.clickPower*save.multiplier).toFixed(1)}`;
    renderBuildings();
    renderUpgrades();
    renderAchievements();
}

function createFloatingText(amount,color="orange"){
    const span=document.createElement("span");
    span.className="floating-text";
    span.innerText=amount;
    span.style.color=color;
    floatingTextContainer.appendChild(span);
    setTimeout(()=>floatingTextContainer.removeChild(span),1000);
}

// --- Buildings ---
function renderBuildings(){
    buildingsList.innerHTML="";
    for(let i=0;i<buildings.length;i++){
        const b=buildings[i];
        const owned=save.buildings[b.name]||0;
        const cost=Math.floor(b.baseCost*Math.pow(1.15,owned));
        if(i>0 && (save.buildings[buildings[i-1].name]||0)==0) continue;
        const btn=document.createElement("button");
        btn.innerHTML=`<span>${b.icon}</span> ${b.name} (Cost: ${cost}) CPS: ${b.cps} Owned: ${owned}`;
        btn.onclick=()=>buyBuilding(i);
        buildingsList.appendChild(btn);
    }
}

function buyBuilding(index){
    const b=buildings[index];
    const owned=save.buildings[b.name]||0;
    const cost=Math.floor(b.baseCost*Math.pow(1.15,owned));
    if(save.cookies>=cost){
        save.cookies-=cost;
        save.buildings[b.name]=owned+1;
        save.cps+=b.cps;
        createFloatingText(`+${b.cps} CPS`,"green");
        updateDisplay();
        saveToWorker();
    }
}

// --- Upgrades ---
function renderUpgrades(){
    upgradesList.innerHTML="";
    for(let i=0;i<upgrades.length;i++){
        const u=upgrades[i];
        if(i>0 && !upgrades[i-1].purchased) continue;
        const btn=document.createElement("button");
        btn.innerHTML=`<span>${u.icon}</span> ${u.name} (Cost: ${Math.floor(u.cost)})`;
        btn.onclick=()=>{
            if(save.cookies>=u.cost){
                save.cookies-=u.cost;
                u.effect();
                u.purchased=true;
                u.cost *= 2;
                createFloatingText(`Upgrade!`,"purple");
                updateDisplay();
                saveToWorker();
            }
        };
        upgradesList.appendChild(btn);
    }
}

// --- Click ---
cookieBtn.onclick=()=>{
    const amount=save.clickPower*save.multiplier;
    save.cookies+=amount;
    save.totalCookies+=amount;
    createFloatingText(`+${amount}`,"yellow");
    updateDisplay();
    saveToWorker();
}

// --- Prestige ---
prestigeBtn.onclick=()=>{
    if(save.totalCookies>=100000){
        save.prestige+=1;
        save.multiplier=1+0.5*save.prestige;
        save.cookies=0; save.totalCookies=0; save.cps=0; save.clickPower=1; save.buildings={};
        upgrades.forEach(u=>{u.purchased=false; u.cost=u.baseCost;});
        updateDisplay();
        createFloatingText("Prestige!", "blue");
        saveToWorker();
    }
}

// --- Achievements ---
function renderAchievements(){
    achievementsList.innerHTML="";
    achievements.forEach(a=>{
        if(!a.unlocked && a.condition(save)){
            a.unlocked=true;
            createFloatingText(`Achievement: ${a.name}`,"purple");
        }
        const li=document.createElement("li");
        li.innerText=`${a.name} ${a.unlocked?"✓":""}`;
        achievementsList.appendChild(li);
    });
}

// --- Leaderboard ---
submitScoreBtn.onclick=async ()=>{
    const name=playerNameInput.value||"Anonymous";
    await fetch(`${WORKER_URL}/api/leaderboard?userid=${userid}`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name})
    });
    loadLeaderboard();
}

async function loadLeaderboard(){
    const res=await fetch(`${WORKER_URL}/api/leaderboard?userid=${userid}`);
    const data=await res.json();
    leaderboardList.innerHTML="";
    data.forEach((entry,i)=>{
        const li=document.createElement("li");
        li.innerText=`${i+1}. ${entry.name} - ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}

// --- Worker Save ---
async function saveToWorker(){
    try{
        await fetch(`${WORKER_URL}/api/load?userid=${userid}`,{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(save)
        });
        localStorage.setItem("clickerSave", JSON.stringify(save));
    } catch {
        localStorage.setItem("clickerSave", JSON.stringify(save));
    }
}

async function loadFromWorker(){
    try{
        const res = await fetch(`${WORKER_URL}/api/load?userid=${userid}`);
        if(res.ok){
            const data = await res.json();
            save = data || save;
        } else {
            const local = localStorage.getItem("clickerSave");
            if(local) save = JSON.parse(local);
        }
    } catch {
        const local = localStorage.getItem("clickerSave");
        if(local) save = JSON.parse(local);
    }
    updateDisplay();
    loadLeaderboard();
}

// --- CPS Increment ---
setInterval(()=>{
    save.cookies+=save.cps/2;
    save.totalCookies+=save.cps/2;
    updateDisplay();
},500);

// --- Initialize ---
loadFromWorker();
