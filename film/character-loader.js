/* One copy of the original GLB. A classic local script can read it even when a
   browser gives file:// documents opaque origins; every material gets its
   original WebP through Three's LoadingManager before the scene is committed. */
window.RainyCharacterLoader=(()=>{
  "use strict";
  const source=new URL("film/character-pack.js",document.baseURI);
  const prefix="window.RainyCharacterPack=";
  const phases={asset:"人物资源",model:"模型数据",texture:"角色贴图",hair:"原始造型",moves:"骨架动作",umbrella:"透明伞"};
  let active=null,cached=null,sequence=0;
  const state={phase:"idle",attempt:0,transport:"",error:"",warnings:[]};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function valid(pack) {
    if(!pack || typeof pack.model!=="string" || !pack.model.length || !pack.textures ||
       typeof pack.textures!=="object" || Object.keys(pack.textures).length!==21 ||
       Object.values(pack.textures).some(value=>typeof value!=="string" || !value.length)) {
      throw Error("人物资源包不完整");
    }
    return pack;
  }
  function loadScript(url,readValue) {
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      let finished=false;
      function finish(error) {
        if(finished)return;finished=true;clearTimeout(timer);script.remove();
        if(error){reject(error);return}
        try{resolve(readValue())}catch(e){reject(e)}
      }
      const timer=setTimeout(()=>finish(Error("读取文件超时")),18000);
      script.src=url.href;script.onload=()=>finish();script.onerror=()=>finish(Error("无法打开人物资源包"));
      document.head.append(script);
    });
  }
  function viaScript(url){return loadScript(url,()=>valid(window.RainyCharacterPack))}
  async function component(T,name) {
    if(T[name])return;
    const url=new URL("vendor/three/"+name+".js",document.baseURI);
    url.searchParams.set("retry",String(++sequence));
    await loadScript(url,()=>{if(!T[name])throw Error(name+" 未能就绪")});
  }
  async function viaFetch(url) {
    const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),18000);
    try {
      const r=await fetch(url,{signal:ac.signal,cache:"no-cache"});
      if(!r.ok)throw Error("HTTP "+r.status);
      const text=(await r.text()).trim();
      if(!text.startsWith(prefix)||!text.endsWith(";"))throw Error("人物资源格式不正确");
      return valid(JSON.parse(text.slice(prefix.length,-1)));
    } finally{clearTimeout(timer)}
  }
  async function pack(attempt) {
    if(cached)return cached;
    const url=new URL(source);
    if(attempt>1)url.searchParams.set("retry",String(++sequence));
    const read=location.protocol==="file:" ? [["script",viaScript]] : [["fetch",viaFetch],["script",viaScript]];
    let error;
    for(const [kind,loader] of read){
      try{cached=await loader(url);state.transport=kind;return cached}catch(e){error=e}
    }
    throw error;
  }
  function manager(T,data) {
    const m=new T.LoadingManager();
    m.setURLModifier(url=>{
      const file=url.match(/(?:^|\/)gtex\/([^/?#]+\.webp)(?:[?#].*)?$/i);
      if(!file)return url;
      const b64=data.textures[file[1]];if(!b64)throw Error("缺少 "+file[1]);
      return "data:image/webp;base64,"+b64;
    });
    return m;
  }
  async function parse(T,data,stage) {
    stage("model");
    const raw=atob(data.model), bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    if(bytes.length<20)throw Error("GLB 已截断");
    const header=new DataView(bytes.buffer);
    if(header.getUint32(0,true)!==0x46546c67 || header.getUint32(4,true)!==2 || header.getUint32(8,true)!==bytes.length)throw Error("GLB 文件头与实际长度不符");
    await component(T,"GLTFLoader");
    if(!T.SkeletonUtils){
      try{await component(T,"SkeletonUtils")}catch(e){optional("后场人物骨架",()=>{throw e})}
    }
    const gltf=await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error("模型或贴图解码超时")),25000);
      const done=value=>{clearTimeout(timeout);resolve(value)};
      const fail=error=>{clearTimeout(timeout);reject(error)};
      try{new T.GLTFLoader(manager(T,data)).parse(bytes.buffer,"",done,fail)}catch(error){fail(error)}
    });
    stage("texture");
    const materials=await gltf.parser.getDependencies("material");
    const checked=new Set();
    for(const material of materials) {
      if(!material.map?.image?.width)throw Error("材质缺少原贴图："+material.name);
      checked.add(material.name);
    }
    if(checked.size<13)throw Error("原角色的十三套材质没有装齐");
    return gltf;
  }
  function optional(name,fn) {
    try{return fn()}catch(e){
      if(!state.warnings.includes(name))state.warnings.push(name);
      console.warn("雨夜 / "+name,e);return null;
    }
  }
  function start(T,install,notify) {
    if(active)return active;
    if(state.phase==="ready")return Promise.resolve();
    const stage=phase=>{state.phase=phase;notify(state)};
    async function run(){
      state.error="";
      for(let attempt=1;attempt<=2;attempt++){
        state.attempt=attempt;
        try{
          stage("asset");
          const data=await pack(attempt);
          const gltf=await parse(T,data,stage);
          install(gltf,data,stage);
          state.error="";stage("ready");return;
        }catch(e){
          state.error=String(e?.message||e);
          console.warn("雨夜 / "+(phases[state.phase]||state.phase),e);
          if(["asset","model","texture"].includes(state.phase)){cached=null;window.RainyCharacterPack=null}
          if(attempt===2){notify(state,true);throw e}
          await wait(360);
        }
      }
    }
    active=run().finally(()=>{active=null});return active;
  }
  return {start,manager,optional,phases,state};
})();
