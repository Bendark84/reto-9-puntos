const socket=io();
const $=id=>document.getElementById(id);
let roomCode="",startedAt=0,durationMs=120000,timerId=null,solved=false,role="",clockOffset=0,players=[],roomStatus="waiting";
const params=new URLSearchParams(location.search);if(params.get("room"))$("room").value=params.get("room").toUpperCase();
function show(id){["home","host","waiting","game","done","expired"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function msg(t){$("msg").textContent=t||""}
function fmt(ms){let s=Math.max(0,ms)/1000,m=Math.floor(s/60),sec=(s%60).toFixed(2).padStart(5,"0");return String(m).padStart(2,"0")+":"+sec}
function renderPlayers(){
 $("count").textContent=players.length;$("waitingCount").textContent=players.length;
 const done=players.filter(p=>p.solved).sort((a,b)=>a.time-b.time);
 $("solved").textContent=done.length;
 const finished=roomStatus==="finished";
 $("list").innerHTML=players.length?players.map(p=>{
   const rank=p.solved?"#"+(done.findIndex(x=>x.id===p.id)+1):"—";
   const time=p.solved?fmt(p.time):"—";
   const status=p.solved?"✓ COMPLETADO":finished?"✕ NO COMPLETÓ LA TAREA":"En curso";
   return `<div class="row"><span class="rank">${rank}</span><b>${esc(p.name)}</b><span class="time">${time}</span><span class="status">${status}</span></div>`;
 }).join(""):"<p class='muted'>Aún no hay participantes.</p>";
}
function esc(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
$("showJoin").onclick=()=>{$("showJoin").classList.add("active");$("showHost").classList.remove("active");$("joinPanel").classList.remove("hidden");$("hostPanel").classList.add("hidden")};
$("showHost").onclick=()=>{$("showHost").classList.add("active");$("showJoin").classList.remove("active");$("hostPanel").classList.remove("hidden");$("joinPanel").classList.add("hidden")};
$("create").onclick=()=>socket.emit("host:create");
socket.on("host:created",async d=>{role="host";roomCode=d.code;$("roomCode").textContent=roomCode;show("host");const r=await fetch("/api/qr?room="+roomCode),j=await r.json();$("qr").innerHTML=`<img src="${j.data}" alt="QR para entrar">`;$('joinUrl').textContent=j.url;});
$("join").onclick=()=>{const name=$("name").value.trim(),c=$("room").value.trim().toUpperCase();if(!name||!c){msg("Escribe tu nombre y el código de sala.");return}socket.emit("player:join",{room:c,name})};
socket.on("player:joined",d=>{role="player";roomCode=d.code;show("waiting")});socket.on("error:msg",msg);
$("start").onclick=()=>{const d=Number($("duration").value);socket.emit("host:start",{room:roomCode,durationMs:d})};
$("finish").onclick=()=>socket.emit("host:finish",{room:roomCode});
$("reset").onclick=()=>socket.emit("host:reset",{room:roomCode});
function hostTimer(){clearInterval(timerId);timerId=setInterval(()=>{const elapsed=Date.now()-clockOffset-startedAt;$("hostCountdown").textContent=fmt(Math.max(0,durationMs-elapsed));if(elapsed>=durationMs)clearInterval(timerId)},50)}
function stopTimer(){clearInterval(timerId);timerId=null}
socket.on("room:update",d=>{
 roomCode=d.code;roomStatus=d.status||"waiting";players=d.players||[];clockOffset=Date.now()-(d.serverNow||Date.now());durationMs=d.durationMs||120000;renderPlayers();
 if(role==="host"){
   $("state").textContent=d.status==="running"?"EN CURSO":d.status==="finished"?"FINALIZADO":"LISTO";
   if(d.status==="running"){$("duration").disabled=true;startedAt=d.startedAt;hostTimer();$("hostMessage").className="hostMessage";$("hostMessageLabel").textContent="Tiempo restante";$("hostCountdown").textContent=fmt(durationMs)}
   if(d.status==="finished"){$("duration").disabled=false;stopTimer();const n=players.filter(p=>p.solved).length,total=players.length;$("hostMessage").className="hostMessage endMsg";$("hostMessage").innerHTML=d.finishReason==="timeout"?`Tiempo terminado · ${n} de ${total} completaron`:`Reto terminado · ${n} de ${total} completaron`}
 } else {
   if(d.status==="running"&&!solved){startedAt=d.startedAt;show("game");setup();tick()}
   if(d.status==="finished"&&!solved){stopTimer();show("expired")}
   if(d.status==="waiting"&&!solved){show("waiting")}
 }
});
socket.on("player:confirmed",d=>{solved=true;stopTimer();$("final").textContent=fmt(d.time);show("done")});

const canvas=$("board"),ctx=canvas.getContext("2d");
const dots=[[150,150],[300,150],[450,150],[150,300],[300,300],[450,300],[150,450],[300,450],[450,450]];
let trace=[],drawing=false,invalidTimer=null;
function setup(){trace=[];drawing=false;clearBoard();}
function drawBase(){
 ctx.clearRect(0,0,600,600);
 ctx.lineWidth=8;ctx.lineCap="round";ctx.lineJoin="round";
 ctx.setLineDash([8,8]);ctx.strokeStyle="#cfcfcf";ctx.strokeRect(105,105,390,390);ctx.setLineDash([]);
 ctx.fillStyle="#111";dots.forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill()});
}
function clearBoard(){drawBase();}
function drawTrace(color="#111"){
 drawBase(); if(trace.length<2)return;
 ctx.strokeStyle=color;ctx.lineWidth=9;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(trace[0][0],trace[0][1]);for(let i=1;i<trace.length;i++)ctx.lineTo(trace[i][0],trace[i][1]);ctx.stroke();
}
function p(e){const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)*600/r.width,(e.clientY-r.top)*600/r.height]}
function begin(e){if(solved||drawing)return;e.preventDefault();if(invalidTimer){clearTimeout(invalidTimer);invalidTimer=null}drawing=true;trace=[p(e)];try{canvas.setPointerCapture(e.pointerId)}catch(_){}drawTrace();}
function move(e){if(!drawing)return;e.preventDefault();trace.push(p(e));drawTrace();}
function end(e){if(!drawing)return;e.preventDefault();trace.push(p(e));drawing=false;try{canvas.releasePointerCapture(e.pointerId)}catch(_){}
 const ok=validate(trace); if(ok){drawTrace("#16833b");finishPlayer();}
 else {drawTrace("#c62828");$("drawMsg").textContent="✕ TRAZO EQUIVOCADO — inténtalo de nuevo";$("drawMsg").className="drawMsg wrong";invalidTimer=setTimeout(()=>{trace=[];drawBase();$("drawMsg").textContent="";$("drawMsg").className="drawMsg";invalidTimer=null},850)}
}
canvas.addEventListener("pointerdown",begin,{passive:false});canvas.addEventListener("pointermove",move,{passive:false});canvas.addEventListener("pointerup",end,{passive:false});canvas.addEventListener("pointercancel",e=>{if(drawing){drawing=false;trace=[];drawBase()}});
$("clear").onclick=()=>{if(!solved){trace=[];drawBase();$("drawMsg").textContent="";$("drawMsg").className="drawMsg"}};
function dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])}
function onSeg(p,a,b,t=34){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1)return false;const cross=Math.abs(dx*(p[1]-a[1])-dy*(p[0]-a[0]));const dot=(p[0]-a[0])*dx+(p[1]-a[1])*dy;return cross/len<t&&dot>-t&&dot<len*len+t}
function rdp(points,epsilon){if(points.length<3)return points;let max=0,index=0,a=points[0],b=points[points.length-1];for(let i=1;i<points.length-1;i++){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;const d=Math.abs(dx*(a[1]-points[i][1])-dy*(a[0]-points[i][0]))/len;if(d>max){max=d;index=i}}if(max>epsilon){const left=rdp(points.slice(0,index+1),epsilon),right=rdp(points.slice(index),epsilon);return left.slice(0,-1).concat(right)}return [a,b]}
function validate(points){
 if(points.length<8)return false;
 // The canonical solution uses four continuous straight segments and may leave the visible square.
 // We simplify the hand/mouse trace, then test every possible 4-segment partition.
 const s=rdp(points,22);if(s.length<5)return false;
 for(let i=1;i<s.length-3;i++)for(let j=i+1;j<s.length-2;j++)for(let k=j+1;k<s.length-1;k++){
   const v=[s[0],s[i],s[j],s[k],s[s.length-1]];
   const segs=[[v[0],v[1]],[v[1],v[2]],[v[2],v[3]],[v[3],v[4]]];
   if(segs.every(x=>dist(x[0],x[1])>55)&&dots.every(d=>segs.some(x=>onSeg(d,x[0],x[1],38))))return true;
 }
 return false;
}
function tick(){stopTimer();timerId=setInterval(()=>{if(!solved){const elapsed=Date.now()-clockOffset-startedAt;const left=Math.max(0,durationMs-elapsed);$("timer").textContent=fmt(left);if(left<=0)stopTimer()}},30)}
function finishPlayer(){solved=true;stopTimer();socket.emit("player:solved",{room:roomCode,time:Math.min(durationMs,Date.now()-clockOffset-startedAt)})}
