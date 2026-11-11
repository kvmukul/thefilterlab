// ---------- 8-bit header scenery: procedural pixel-art sunset, drawn on a tiny canvas and scaled up with hard pixels.
(function(){
const hero=document.querySelector('.brand-hero');if(!hero)return;
const cv=document.createElement('canvas');cv.className='scene';cv.setAttribute('aria-hidden','true');hero.prepend(cv);
const ctx=cv.getContext('2d'),S=3; // S = on-screen size of one "8-bit pixel"
const px=h=>{const n=parseInt(h.slice(1),16);return(255<<24)|((n&255)<<16)|(n&0xff00)|(n>>16)}; // #rrggbb -> ABGR
const C={sky:['#120d2b','#1d1544','#2f1d5e','#4a2672','#6e2f80','#a33f80','#d4586f','#f07f5c','#f9ab5e','#fdd480'].map(px),
 star:px('#fff4d0'),star2:px('#9ed0ff'),sun1:px('#fff1b0'),sun2:px('#ffd066'),sun3:px('#ffae4a'),halo1:px('#f9ab5e'),halo2:px('#d4586f'),
 cloudA:px('#f08f9a'),cloudB:px('#c25c8a'),far:px('#2c1c63'),snow:px('#c4b5f5'),mid:px('#26418a'),near:px('#1c5560'),
 tree:px('#0c353b'),treeHi:px('#17594f'),ground:px('#07161d'),grass:px('#1c7449'),bird:px('#ffd9a8')};
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
let seed=7;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
const tri=t=>Math.abs(((t%2)+2)%2-1);
let W,H,GY,img,u32,sky,stars,clouds,trees,birds,R,SX,SY,raf=0,t0=performance.now(),lastDraw=0;
function build(){
 const r=hero.getBoundingClientRect();W=Math.ceil(r.width/S);H=Math.ceil(r.height/S);GY=Math.round(H*.80);
 cv.width=W;cv.height=H;cv.style.width=W*S+'px';cv.style.height=H*S+'px';img=ctx.createImageData(W,H);u32=new Uint32Array(img.data.buffer);
 // dithered sky
 sky=new Uint32Array(W*H);const n=C.sky.length-1;
 for(let y=0;y<H;y++){const p=Math.min(1,y/(GY-1))**1.15*n,i=Math.min(n-1,Math.floor(p)),f=p-i;
  for(let x=0;x<W;x++)sky[y*W+x]=C.sky[i+(f>BAYER[(y&3)*4+(x&3)]/16?1:0)]}
 seed=7;
 stars=Array.from({length:Math.round(W/9)},(_,i)=>({x:Math.floor(rnd()*W),y:Math.floor(rnd()*GY*.55),ph:Math.floor(rnd()*7),b:rnd()<.2,c:rnd()<.3}));
 clouds=Array.from({length:Math.max(3,Math.round(W/70))},(_,i)=>({x:rnd()*(W+60),y:Math.round(H*(.12+rnd()*.34)),w:12+Math.floor(rnd()*14),sp:i%2?2.2:3.6}));
 const P=420;trees=[];for(let x=3;x<P;x+=7+Math.floor(rnd()*9))trees.push({x,h:9+Math.floor(rnd()*7),v:rnd()<.5});trees.P=P;
 birds=[0,1,2].map(i=>({dx:-i*9,dy:i%2?5:-3*i,ph:i}));
 R=Math.max(6,Math.min(10,Math.round(H*.17)));SX=Math.round(W*.74);SY=Math.round(H*.30);
}
const mtn=(x,A,per,o)=>Math.round(A*(.5*tri(x/per+o)+.3*tri(x/(per*.43)+o*2.1)+.2*tri(x/(per*.19)+o*3.3)));
function frame(t){
 u32.set(sky);
 // stars (twinkle)
 const tw=Math.floor(t*2);
 for(const s of stars){if((tw+s.ph)%7===0)continue;const c=s.c?C.star2:C.star;u32[s.y*W+s.x]=c;
  if(s.b&&s.x>0&&s.x<W-1&&s.y>0){u32[s.y*W+s.x-1]=c;u32[s.y*W+s.x+1]=c;u32[(s.y-1)*W+s.x]=c;u32[(s.y+1)*W+s.x]=c}}
 // sun: halo (checker dither), body, scanline cut-outs that slowly crawl
 for(let y=Math.max(0,SY-R-7);y<Math.min(GY,SY+R+7);y++)for(let x=SX-R-7;x<=SX+R+7;x++){if(x<0||x>=W)continue;
  const d=Math.hypot(x-SX,y-SY+.5);
  if(d<=R){const row=y-(SY-R);if(row>R&&((row+Math.floor(t*1.5))%4)===0)continue;u32[y*W+x]=y<SY-R*.35?C.sun1:y<SY+R*.3?C.sun2:C.sun3}
  else if(d<=R+3.5&&((x+y)&1)===0)u32[y*W+x]=C.halo1;else if(d<=R+7&&((x+y)&1)===0&&((x>>1)+(y>>1)&1)===0)u32[y*W+x]=C.halo2}
 // clouds
 for(const c of clouds){const cx=Math.floor(((c.x-t*c.sp)%(W+60)+(W+60))%(W+60))-30,rows=[[.45,0],[.8,1],[1,2]];
  rows.forEach(([f,r],i)=>{const w=Math.round(c.w*f),x0=cx+Math.round((c.w-w)/2),y=c.y+i;
   for(let x=x0;x<x0+w;x++)if(x>=0&&x<W&&y>=0&&y<GY)u32[y*W+x]=i==2?C.cloudB:C.cloudA})}
 // birds
 const bx=Math.floor(((t*9)%(W+90))-45);
 for(const b of birds){const x=bx+b.dx,y=Math.round(H*.3)+b.dy,up=((Math.floor(t*4)+b.ph)&1)===0;
  for(const[dx,dy]of up?[[-2,-1],[-1,0],[0,0],[1,0],[2,-1]]:[[-2,0],[-1,1],[0,0],[1,1],[2,0]]){const X=x+dx,Y=y+dy;if(X>=0&&X<W&&Y>=0&&Y<GY)u32[Y*W+X]=C.bird}}
 // parallax land layers (far mountains -> hills -> trees -> ground)
 const so=Math.floor(t*1.6),mo=Math.floor(t*3.2),no=Math.floor(t*5.6),to=Math.floor(t*11);
 for(let x=0;x<W;x++){
  const hf=mtn(x+so,H*.46,190,.3)+3,hm=mtn(x+mo,H*.26,120,1.7)+2,hn=mtn(x+no,H*.14,70,2.9)+1;
  for(let y=GY-hf;y<GY;y++)if(y>=0)u32[y*W+x]=(hf>H*.34&&y<GY-hf+2)?C.snow:C.far;
  for(let y=GY-hm;y<GY;y++)u32[y*W+x]=C.mid;
  for(let y=GY-hn;y<GY;y++)u32[y*W+x]=C.near}
 for(const tr of trees){for(let rep=-1;rep<=Math.ceil(W/trees.P)+1;rep++){const bx2=tr.x+rep*trees.P-(to%trees.P);if(bx2<-8||bx2>W+8)continue;
  for(let r=0;r<tr.h;r++){const y=GY-1-r,half=Math.max(0,Math.min(4,Math.ceil((tr.h-r)/2.6)))-(r<2?1:0)+(tr.v&&r%4==3?1:0),hw=r<2?0:Math.min(4,1+Math.floor((tr.h-r)*.42)+(r%4==0?1:0));
   for(let dx=-hw;dx<=hw;dx++){const X=bx2+dx;if(X>=0&&X<W&&y>=0)u32[y*W+X]=(dx<0&&(r&1))?C.treeHi:C.tree}}}}
 for(let x=0;x<W;x++){for(let y=GY;y<H;y++)u32[y*W+x]=C.ground;u32[GY*W+x]=((x+to)%5===0)?C.ground:C.grass}
 ctx.putImageData(img,0,0)}
function tick(now){raf=requestAnimationFrame(tick);if(now-lastDraw<66)return;lastDraw=now;frame((now-t0)/1000)}
function start(){cancelAnimationFrame(raf);build();frame(0);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)raf=requestAnimationFrame(tick)}
let rt;new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(()=>{if(Math.ceil(hero.getBoundingClientRect().width/S)!==W||Math.ceil(hero.getBoundingClientRect().height/S)!==H)start()},120)}).observe(hero);
start();
})();
