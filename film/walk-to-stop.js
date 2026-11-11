/* Route the original character around street furniture. Sample at foot radius before simplifying each segment. */
window.walkRainStreet = function (player, goal, obstacles, bus, boarding=false) {
  const curbside=boarding&&bus.active;
  const minX=-3.84,minZ=-8.25,step=curbside?.125:.18,nx=Math.round(12.75/step),nz=Math.round(12.18/step),r=.145;
  const blocks=obstacles.slice();
  if(bus.root.visible)blocks.push(bus.footprint());
  // A bus can enter this bay before the walk finishes. Keep the boarding
  // path on the kerb even when the visible vehicle is still up the road.
  if(curbside)blocks.push(bus.footprint(bus.stop));
  function clear(x,z){
    return !blocks.some(b=>{
      const dx=x-Math.max(b.x0,Math.min(b.x1,x)),dz=z-Math.max(b.z0,Math.min(b.z1,z));
      return dx*dx+dz*dz<r*r;
    });
  }
  function visible(a,b){
    const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.075));
    for(let i=1;i<=n;i++)if(!clear(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;
    return true;
  }
  if(visible(player,goal)){
    player.path=[];player.target={x:goal.x,z:goal.z};player.stuck=0;return true;
  }
  const cells=new Uint8Array(nx*nz),coord=i=>({x:minX+i%nx*step,z:minZ+Math.floor(i/nx)*step});
  for(let i=0;i<cells.length;i++){const p=coord(i);cells[i]=clear(p.x,p.z)?1:0;}
  function nearest(p){
    let best=-1,d=Infinity;
    for(let i=0;i<cells.length;i++){if(!cells[i])continue;const q=coord(i),s=(q.x-p.x)**2+(q.z-p.z)**2;if(s<d){d=s;best=i;}}
    return best;
  }
  const start=nearest(player), end=nearest(goal), parent=new Int32Array(cells.length).fill(-1);
  if(start<0||end<0)return false;
  const queue=[start];parent[start]=start;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  for(let i=0;i<queue.length&&parent[end]===-1;i++){
    const a=queue[i],ax=a%nx,az=Math.floor(a/nx);
    for(const [dx,dz] of dirs){
      const x=ax+dx,z=az+dz,b=z*nx+x;
      if(x<0||z<0||x>=nx||z>=nz||!cells[b]||parent[b]!==-1)continue;
      if(dx&&dz&&(!cells[az*nx+x]||!cells[z*nx+ax]))continue;
      parent[b]=a;queue.push(b);
    }
  }
  if(parent[end]===-1)return false;
  const raw=[];for(let i=end;i!==start;i=parent[i])raw.push(coord(i));
  raw.push(coord(start));raw.reverse();
  if(visible(raw[raw.length-1],goal))raw.push({x:goal.x,z:goal.z});
  const way=[];let from=player;
  for(let i=0;i<raw.length;){
    let next=i;while(next+1<raw.length&&visible(from,raw[next+1]))next++;
    from=raw[next];way.push(from);i=next+1;
  }
  player.target=way.shift();player.path=way;player.stuck=0;
  return true;
};
