// Run after verify-chapter.js in a second process using the same --profile.
const d=window.__diorama, hud=document.querySelector("#rain-film");
async function waitFor(f, hint) {
  const end=performance.now()+75000;
  while(!f()){if(performance.now()>end)throw Error(hint);await delay(100)}
}
await waitFor(()=>hud && !hud.hidden && d.film.info().sealed,"未还原已挂灯箱的上一卷");
const first=d.film.info(), key="rainy-night-store/last-frame/1";
const previous=JSON.parse(localStorage.getItem(key));
if(first.count!==3||!first.hasPrint||previous.title!=="末班巴士 / 伞下的人")throw Error("上一卷三张底片和展出顺序未恢复");
const departure=[d.st.x,d.st.z],phases=new Set(),t0=performance.now();
hud.querySelector('[data-f="ticket"]').click();
await waitFor(()=>{const v=d.film.info();phases.add(v.bus);return v.mode==="exhibit"},"未能步行回到上一卷灯箱");
const arrival=[d.st.x,d.st.z],routeSeconds=(performance.now()-t0)/1000;
if(Math.hypot(arrival[0]-departure[0],arrival[1]-departure[1])<2 || arrival[1]>=1.59 ||
   ![...phases].some(p=>["arriving","stopped","leaving"].includes(p)))throw Error("未在运营车流中实际回到站台");
await delay(1250);await window.webkit.messageHandlers.rainySnapshot.postMessage("07-重开后的灯箱");
hud.querySelector('[data-f="alt"]').click();
await waitFor(()=>d.film.info().mode==="street","未能回到街角");
hud.querySelector('[data-f="alt"]').click();
await waitFor(()=>d.film.info().mode==="finder","领取第二卷失败");
const fresh=d.film.info();const stored=JSON.parse(localStorage.getItem(key));
if(first.roll+1!==fresh.roll||fresh.sealed||fresh.count!==0||!stored.print||previous.title!==stored.title)throw Error("第二卷与已展出的印相状态不一致");
async function printPixels(src){
  const im=new Image();im.src=src;await im.decode();
  const c=document.createElement("canvas");c.width=im.width;c.height=im.height;
  const g=c.getContext("2d");g.drawImage(im,0,0);
  return {w:c.width,h:c.height,p:g.getImageData(0,0,c.width,c.height).data};
}
const a=await printPixels(previous.print),b=await printPixels(stored.print);
const sameSavedBytes=stored.print===previous.print;
if(!sameSavedBytes || !stored.print.startsWith("data:image/png;base64,"))throw Error("原始无损印相在跨进程换卷后被重新编码");
if(a.w!==b.w||a.h!==b.h)throw Error("第二卷重置了旧相纸尺寸");
let delta=0;
for(let i=0;i<a.p.length;i+=4){for(let k=0;k<3;k++)delta+=Math.abs(a.p[i+k]-b.p[i+k])}
const paperMeanRGBError=delta/(a.w*a.h*3);
if(paperMeanRGBError!==0)throw Error("第二卷替换了已展出相纸的图像："+paperMeanRGBError);
return {sameSavedBytes,paperMeanRGBError,paperSize:[a.w,a.h],route:{departure,arrival,elapsed:routeSeconds,busPhases:[...phases]},restored:{count:first.count,title:previous.title,roll:first.roll},fresh:{roll:fresh.roll,count:fresh.count},retainsExhibit:fresh.hasPrint};
