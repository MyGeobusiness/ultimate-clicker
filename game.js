const WORKER_URL = "https://clickergame.j-olatunde.workers.dev";

let save = {cookies:0,totalCookies:0,clickPower:1,cps:0,multiplier:1,prestige:0,buildings:{}};
const cookieBtn = document.getElementById("cookie-btn");
const cookieCounter = document.getElementById("cookie-counter");
const cpsCounter = document.getElementById("cps-counter");
const buildingsList = document.getElementById("buildings-list");
const clickUpgradeBtn = document.getElementById("click-upgrade-btn");
const prestigeBtn = document.getElementById("prestige-btn");
const floatingTextContainer = document.getElementById("floating-text-container");
const achievementsList = document.getElementById("achievements-list");
const leaderboardList = document.getElementById("leaderboard-list");
const playerNameInput = document.getElementById("player-name");
const submitScoreBtn = document.getElementById("submit-score-btn");
const clickSound = document.getElementById("click-sound");
const purchaseSound = document.getElementById("purchase-sound");
const achievementSound = document.getElementById("achievement-sound");

let userid="player1";

const buildings = [];
for(let i=1;i<=50;i++){
    buildings.push({name:`Building ${i}`, baseCost: Math.pow(10, Math.floor(i/5)+1), cps: Math.pow(10,Math.floor(i/5))});
}

const achievements = [
    {name:"First 100 Cookies", condition:s=>s.totalCookies>=100, unlocked:false},
    {name:"1K Cookies", condition:s=>s.totalCookies>=1000, unlocked:false},
    {name:"10K Cookies", condition:s=>s.totalCookies>=10000, unlocked:false},
    {name:"First Prestige", condition:s=>s.prestige>=1, unlocked:false},
];

function updateDisplay(){
    cookieCounter.innerText=`Cookies: ${Math.floor(save.cookies)}`;
    cpsCounter.innerText=`CPS: ${save.cps} | Click x${save.clickPower * save.multiplier}`;
    renderBuildings();
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
        const btn=document.createElement("button");
        btn.innerText=`${b.name} (Cost: ${cost}) CPS: ${b.cps} Owned: ${owned}`;
        btn.disabled=i>0 && (save.buildings[buildings[i-1].name]||0)==0;
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
        purchaseSound.play();
        saveToWorker();
        updateDisplay();
    }
}

// --- Click ---
cookieBtn.onclick=()=>{
    const amount=save.clickPower*save.multiplier;
    save.cookies+=amount;
    save.totalCookies+=amount;
    createFloatingText(`+${amount}`,"yellow");
    clickSound.play();
    saveToWorker();
    updateDisplay();
}

// --- Click Upgrade ---
clickUpgradeBtn.onclick=()=>{
    const cost=50*Math.pow(2,save.clickPower-1);
    if(save.cookies>=cost){
        save.cookies-=cost;
        save.clickPower+=1;
        purchaseSound.play();
        saveToWorker();
        updateDisplay();
    }
}

// --- Prestige ---
prestigeBtn.onclick=()=>{
    if(save.totalCookies>=100000){
        save.prestige+=1;
        save.multiplier=1+0.5*save.prestige;
        save.cookies=0; save.totalCookies=0; save.cps=0; save.clickPower=1; save.buildings={};
        saveToWorker(); updateDisplay();
        createFloatingText("Prestige!", "blue");
        achievementSound.play();
    }
}

// --- Achievements ---
function renderAchievements(){
    achievementsList.innerHTML="";
    achievements.forEach(a=>{
        if(!a.unlocked && a.condition(save)){
            a.unlocked=true;
            createFloatingText(`Achievement: ${a.name}`,"purple");
            achievementSound.play();
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
    await fetch(`${WORKER_URL}/api/load?userid=${userid}`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(save)
    });
}

async function loadFromWorker(){
    const res=await fetch(`${WORKER_URL}/api/load?userid=${userid}`);
    save=await res.json();
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

