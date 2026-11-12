// Run through the visible interactions in a fresh native test profile.
const d=window.__diorama, q=s=>document.querySelector(s);
const info=()=>d.streetWalk.info(), pose=()=>d.acting.info();
const press=()=>{const el=q("#rain-walk .rw-action");if(el.hidden)throw Error("街角操作不可见");el.click();};
async function until(fn,label,seconds=35){
  const untilTime=performance.now()+seconds*1000;
  while(!fn()){
    if(performance.now()>untilTime)throw Error(label+" "+JSON.stringify({x:d.st.x,z:d.st.z,walk:info(),pose:pose(),cat:d.cat.state,film:d.film.info()}));
    await delay(70);
  }
}
const picture=async name=>{await window.webkit.messageHandlers.rainySnapshot.postMessage(name);};
const key=(code,down)=>window.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{code,bubbles:true,cancelable:true}));
await until(()=>d?.girl.ready&&q("#rain-walk")&&!q("#rain-walk").hidden&&info().near==="front","店门口寻猫启事");
const spawn=[d.st.x,d.st.z];press();await until(()=>info().view==="front","走近店窗");await delay(850);await picture("01-店窗寻猫启事");
if(!info().following)throw Error("寻猫启事没有留下线索");
press();await until(()=>info().view==="cat","沿脚印走到猫的身边",65);
let maxBend=0,maxSmile=0,maxHand=0,catShot=false;
for(let i=0;i<420&&!info().seen;i++){
 const a=pose();maxBend=Math.max(maxBend,a.crouch||0);maxHand=Math.max(maxHand,a.hand||0);
 if(a.phase==="answer"&&!catShot){await picture("02-三花侧耳");catShot=true;}
 if(i%25===24 && d.cat.state!=="eat"&&d.cat.state!=="toDish"&&info().near==="cat"&&!info().seen)press();
 await delay(90);
}
if(!info().seen)throw Error("猫未回应 "+JSON.stringify(pose()));
for(let i=0;i<18;i++){maxSmile=Math.max(maxSmile,pose().smile||0);await delay(55);}
if(!catShot||maxBend<.35||maxHand<.36||maxSmile<.35)throw Error("猫与女孩的回应缺了一拍 "+JSON.stringify({catShot,maxBend,maxHand,maxSmile}));
await picture("03-她和三花");
const catMet=[d.st.x,d.st.z,d.cat.x,d.cat.z];
const seenBefore=localStorage.getItem("rainy-night-store/cat-notice/1");
key("Escape",true);key("Escape",false);
// Use the game's own click-to-walk route for a long walk out of the back lot.
d.setTarget(6.90,.54);
await until(()=>info().near==="chime"&&Math.hypot(d.st.x-6.90,d.st.z-.54)<.45,"公园木牌旁",65);
press();await until(()=>info().chime.rings>=1,"第一次拨动");
await delay(750);await picture("04-玻璃风铃");
press();await until(()=>info().chime.rings>=2&&info().chime.drops>=1,"再拨和落水");
key("Escape",true);key("Escape",false);
d.setTarget(5.74,1.40);
await until(()=>info().near==="wait"&&d.st.z<1.60&&Math.hypot(d.st.x-5.74,d.st.z-1.40)<.22,"站内候车",50);
press();await until(()=>d.film.info().bus==="arriving"&&pose().phase==="headlights","她看向驶来的车灯");
await delay(1000);await picture("05-候车时看车灯");
await until(()=>d.film.info().bus==="stopped"&&pose().phase==="door-opens","停靠时的回应",30);
await delay(650);await picture("06-车门打开");
key("KeyS",true);await delay(420);key("KeyS",false);
if(info().view)throw Error("移动后未交还镜头");
return {spawn,catMet,catShot,maxBend,maxSmile,maxHand,notice:seenBefore,replies:info().replies,chime:info().chime,bus:d.film.info().bus,model:d.characterLoad.phase};
