const express = require("express");
const http = require("http");
const os = require("os");
const QRCode = require("qrcode");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;
app.use(express.static("public"));
const rooms = new Map();

function code(){let c;do c=Math.random().toString(36).slice(2,7).toUpperCase();while(rooms.has(c));return c;}
function publicPlayers(room){return [...room.players.values()].map(p=>({id:p.id,name:p.name,solved:p.solved,time:p.time})).sort((a,b)=>(a.time??Infinity)-(b.time??Infinity));}
function broadcast(room){io.to(room.code).emit("room:update",{code:room.code,status:room.status,startedAt:room.startedAt,durationMs:room.durationMs,serverNow:Date.now(),finishReason:room.finishReason||null,players:publicPlayers(room)});}
function getLanIp(){const nets=os.networkInterfaces();for(const list of Object.values(nets))for(const n of list||[])if(n.family==="IPv4"&&!n.internal)return n.address;return "localhost";}
function finishRoom(room,reason="manual"){
  if(!room||room.status!=="running") return;
  room.status="finished";room.finishReason=reason;room.finishedAt=Date.now();
  if(room.timeout) clearTimeout(room.timeout); room.timeout=null;
  broadcast(room);
}
app.get("/api/qr",async(req,res)=>{
  const room=(req.query.room||"").toUpperCase();
  if(!rooms.has(room)) return res.status(404).send("Sala no encontrada");
  const url=`${process.env.RENDER_EXTERNAL_URL || `http://${getLanIp()}:${PORT}`}/?room=${room}`;
  const png=await QRCode.toDataURL(url,{width:420,margin:2});res.json({url,data:png});
});

io.on("connection",socket=>{
  socket.on("host:create",()=>{
    const c=code();const room={code:c,hostId:socket.id,status:"waiting",startedAt:0,durationMs:120000,players:new Map(),finishReason:null,timeout:null};
    rooms.set(c,room);socket.join(c);socket.data.room=c;socket.data.role="host";socket.emit("host:created",{code:c});broadcast(room);
  });

  socket.on("host:start",({room:c,durationMs})=>{
    const room=rooms.get(c);if(!room||room.hostId!==socket.id||room.status!=="waiting")return;
    let ms=Number(durationMs);if(!Number.isFinite(ms))ms=120000;ms=Math.min(Math.max(ms,30000),15*60*1000);
    room.status="running";room.startedAt=Date.now();room.durationMs=Math.round(ms);room.finishReason=null;
    for(const p of room.players.values()){p.solved=false;p.time=null;}
    if(room.timeout)clearTimeout(room.timeout);
    room.timeout=setTimeout(()=>finishRoom(room,"timeout"),room.durationMs+100);
    broadcast(room);
  });
  socket.on("host:finish",({room:c})=>{const room=rooms.get(c);if(!room||room.hostId!==socket.id)return;finishRoom(room,"manual");});
  socket.on("host:reset",({room:c})=>{const room=rooms.get(c);if(!room||room.hostId!==socket.id)return;if(room.timeout)clearTimeout(room.timeout);room.timeout=null;room.status="waiting";room.startedAt=0;room.finishReason=null;for(const p of room.players.values()){p.solved=false;p.time=null;}broadcast(room);});

  socket.on("player:join",({room:c,name})=>{
    c=(c||"").toUpperCase();const room=rooms.get(c);name=(name||"").trim().slice(0,24);
    if(!room)return socket.emit("error:msg","La sala no existe.");
    if(!name)return socket.emit("error:msg","Escribe tu nombre.");
    if(room.status!=="waiting")return socket.emit("error:msg","El reto ya comenzó. Pide al presentador una nueva ronda.");
    const p={id:socket.id,name,solved:false,time:null};room.players.set(socket.id,p);socket.join(c);socket.data.room=c;socket.data.role="player";socket.emit("player:joined",{code:c,playerId:socket.id});broadcast(room);
  });

  socket.on("player:solved",({room:c,time})=>{
    const room=rooms.get(c),p=room?.players.get(socket.id);if(!room||!p||room.status!=="running"||p.solved)return;
    const elapsed=Math.max(0,Math.round(Number(time)));if(!Number.isFinite(elapsed)||elapsed>room.durationMs+1000)return;
    p.solved=true;p.time=elapsed;broadcast(room);socket.emit("player:confirmed",{time:elapsed});
  });

  socket.on("disconnect",()=>{const c=socket.data.room,room=rooms.get(c);if(!room)return;if(socket.data.role==="player")room.players.delete(socket.id);broadcast(room);});
});

server.listen(PORT,"0.0.0.0",()=>{console.log(`\nReto de los 9 puntos`);console.log(`PC:  http://localhost:${PORT}`);console.log(`LAN: http://${getLanIp()}:${PORT}`);console.log(`\nUsa la dirección LAN para los teléfonos.\n`);});
