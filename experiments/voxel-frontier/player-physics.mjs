export const EYE_HEIGHT=1.60,PLAYER_RADIUS=.28,PLAYER_HEIGHT=1.78;
const EPS=.000001;
export function canOccupy(world,x,y,z){
for(let bx=Math.ceil(x-PLAYER_RADIUS-.5+EPS);bx<=Math.floor(x+PLAYER_RADIUS+.5-EPS);bx++)
for(let bz=Math.ceil(z-PLAYER_RADIUS-.5+EPS);bz<=Math.floor(z+PLAYER_RADIUS+.5-EPS);bz++)
for(let by=Math.ceil(y-.5+EPS);by<=Math.floor(y+PLAYER_HEIGHT+.5-EPS);by++)
if(world.solid(bx,by,bz))return false;
return true;
}
export function spawnPlayer(world,x=0,z=5){return {x,y:world.highestAt(Math.round(x),Math.round(z))+.5,z,vy:0,yaw:-.2,pitch:-.12,grounded:true};}
function moveHorizontal(world,p,axis,delta){
if(!delta)return;
const x=axis==='x'?p.x+delta:p.x,z=axis==='z'?p.z+delta:p.z;
if(canOccupy(world,x,p.y,z)){p[axis]+=delta;return;}
if(p.grounded&&canOccupy(world,p.x,p.y+1.001,p.z)&&canOccupy(world,x,p.y+1.001,z)){p.y+=1.001;p.vy=0;p[axis]+=delta;}
}
function moveVertical(world,p,delta){
if(!delta)return;
const target=p.y+delta;
if(canOccupy(world,p.x,target,p.z)){p.y=target;return;}
let safe=p.y,blocked=target;
for(let i=0;i<17;i++){const middle=(safe+blocked)/2;if(canOccupy(world,p.x,middle,p.z))safe=middle;else blocked=middle;}
p.y=safe;p.vy=0;if(delta<0)p.grounded=true;
}
export function stepPlayer(world,p,input,elapsed){
const dt=Math.max(0,Math.min(.05,elapsed));if(!dt)return p;
const f=Math.max(-1,Math.min(1,input.forward||0)),s=Math.max(-1,Math.min(1,input.strafe||0));
const length=Math.hypot(f,s)||1,speed=input.sprint?7.4:4.9;
const dx=(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)/length*speed*dt;
const dz=(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)/length*speed*dt;
const max=world.radius-PLAYER_RADIUS-.22;
moveHorizontal(world,p,'x',Math.max(-max,Math.min(max,p.x+dx))-p.x);
moveHorizontal(world,p,'z',Math.max(-max,Math.min(max,p.z+dz))-p.z);
p.grounded=!canOccupy(world,p.x,p.y-.035,p.z);
if(input.jump&&p.grounded){p.vy=8;p.grounded=false;}
if(!p.grounded)p.vy=Math.max(-24,p.vy-21*dt);
else if(p.vy<0)p.vy=0;
const vertical=p.vy*dt,steps=Math.max(1,Math.ceil(Math.abs(vertical)/.24));
for(let i=0;i<steps;i++){if(!p.vy)break;moveVertical(world,p,vertical/steps);}
p.grounded=!canOccupy(world,p.x,p.y-.035,p.z);
return p;
}
