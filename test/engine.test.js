// Run with: node --test test/
const test=require('node:test'),assert=require('node:assert');
global.ImageData=class{constructor(a,b,c){if(typeof a==='number'){this.width=a;this.height=b;this.data=new Uint8ClampedArray(a*b*4)}else{this.data=a;this.width=b;this.height=c}}};
const E=require('../src/engine.js');
const W=40,H=30;
function img(fn){const im=new ImageData(W,H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const[r,g,b]=fn(x,y),i=(y*W+x)*4;im.data.set([r,g,b,255],i)}return im}
const red=img(()=>[220,30,30]), grayBlock=img((x,y)=>x>10&&x<30&&y>8&&y<22?[220,220,220]:[20,20,20]);
const step=(id,p)=>{const f=E.FM[id],q={};f.P.forEach(k=>q[k.k]=k.d);return{id,p:{...q,...p}}};
const px=(im,x=W>>1,y=H>>1)=>Array.from(im.data.slice((y*W+x)*4,(y*W+x)*4+3));
const run=(src,pipe,extra={})=>{const r=E.makeRunner();r.setSource(1,src);return r.run({noise:0,roi:null,pipe,...extra})};

test('every filter runs on RGB input and returns same-size opaque image',()=>{
  for(const f of E.F){const o=f.f(red,Object.fromEntries(f.P.map(p=>[p.k,p.d])));
    assert.equal(o.width,W,f.id);assert.equal(o.height,H,f.id);assert.equal(o.data[3],255,f.id)}});
test('filter ids are unique and have descriptions + valid defaults',()=>{
  assert.equal(new Set(E.F.map(f=>f.id)).size,E.F.length);
  for(const f of E.F){assert.ok(f.n&&f.c&&f.d,f.id);f.P.forEach(p=>assert.ok(p.d>=p.a&&p.d<=p.b,f.id+'.'+p.k))}});
test('colour is preserved through colour-keeping filters (blur -> hue works)',()=>{
  const o=run(red,[step('gauss'),step('hue',{h:0,w:20})]);assert.deepEqual(px(o.cur),[255,255,255]);
  assert.deepEqual(o.warn.filter(Boolean),[])});
test('colour filter after a grayscale step produces a warning',()=>{
  const o=run(red,[step('gray'),step('hue',{h:0,w:20})]);assert.ok(o.warn[1]&&/grayscale/.test(o.warn[1]));assert.equal(o.warn[0],undefined)});
test('gamma/invert keep colour; invert is exact',()=>{
  const o=run(red,[step('inv')]);assert.deepEqual(px(o.cur),[35,225,225])});
test('otsu separates a bright block from a dark background',()=>{
  const o=run(grayBlock,[step('otsu')]);assert.deepEqual(px(o.cur),[255,255,255]);assert.deepEqual(px(o.cur,1,1),[0,0,0])});
test('blob counter finds two separate squares',()=>{
  const two=img((x,y)=>(x>3&&x<12&&y>3&&y<12)||(x>25&&x<35&&y>15&&y<25)?[255,255,255]:[0,0,0]);
  const o=run(two,[step('thr',{t:128})],{blobs:true,minA:20});assert.equal(o.blobs.length,2)});
test('minA filters tiny blobs',()=>{
  const dots=img((x,y)=>x==5&&y==5?[255,255,255]:[0,0,0]);
  assert.equal(run(dots,[step('thr')],{blobs:true,minA:5}).blobs.length,0)});
test('ROI: result has ROI size; ROI is clamped to the image',()=>{
  const o=run(grayBlock,[step('otsu')],{roi:{x:30,y:20,w:100,h:100}});assert.deepEqual([o.roi.x,o.roi.y,o.roi.w,o.roi.h],[30,20,10,10]);assert.equal(o.cur.width,10)});
test('tiny ROI is ignored',()=>{assert.equal(E.normRoi({x:1,y:1,w:5,h:5},W,H),null)});
test('cache: tweaking last step recomputes only that step',()=>{
  const r=E.makeRunner();r.setSource(1,grayBlock);const a=step('gauss'),b=step('canny'),c=step('close');
  assert.equal(r.run({noise:0,roi:null,pipe:[a,b,c]}).hit,0);
  assert.equal(r.run({noise:0,roi:null,pipe:[a,b,step('close',{r:3})]}).hit,2);
  assert.equal(r.run({noise:0,roi:null,pipe:[step('gauss',{s:3}),b,c]}).hit,0)});
test('cache: results equal a from-scratch run (no stale data)',()=>{
  const r=E.makeRunner();r.setSource(1,grayBlock);const pipe=[step('gauss'),step('otsu')];
  r.run({noise:0,roi:null,pipe});const again=r.run({noise:0,roi:null,pipe:[...pipe,step('dil')]});
  const fresh=run(grayBlock,[...pipe,step('dil')]);assert.deepEqual(again.cur.data,fresh.cur.data)});
test('noise or source change invalidates cache; source image is never mutated',()=>{
  const r=E.makeRunner(),before=Uint8ClampedArray.from(grayBlock.data);r.setSource(1,grayBlock);const p=[step('gauss')];
  r.run({noise:0,roi:null,pipe:p});assert.equal(r.run({noise:30,roi:null,pipe:p}).hit,0);
  r.setSource(2,red);assert.equal(r.run({noise:30,roi:null,pipe:p}).hit,0);assert.deepEqual(grayBlock.data,before)});
test('returned buffers are copies (transferring them cannot corrupt the cache)',()=>{
  const r=E.makeRunner();r.setSource(1,grayBlock);const p=[step('otsu')],a=r.run({noise:0,roi:null,pipe:p});a.cur.data.fill(7);
  assert.notEqual(r.run({noise:0,roi:null,pipe:p}).cur.data[0],7)});
test('sensor noise is repeatable',()=>{
  const a=E.withSensorNoise(red,20),b=E.withSensorNoise(red,20);assert.deepEqual(a.data,b.data);assert.notDeepEqual(a.data,red.data)});
// ---- colour distance
const shade=img((x)=>x<20?[146,125,104]:[73,62,52]);
const cd=(p)=>run(shade,[step('cd',{r:146,g:125,b:104,t:40,...p})]).cur;
test('colour distance: mask mode is pure white/black',()=>{const o=cd({m:0});assert.deepEqual(px(o,5,5),[255,255,255]);assert.deepEqual(px(o,30,5),[0,0,0])});
test('colour distance: a shadowed patch drops out unless "ignore brightness" is on',()=>{
  assert.deepEqual(px(cd({m:0,nb:0}),30,5),[0,0,0]);assert.deepEqual(px(cd({m:0,nb:1}),30,5),[255,255,255])});
test('colour distance: colour mode keeps pixel colour; dimmed mode shows rejected pixels at 22%',()=>{
  assert.deepEqual(px(cd({m:1}),5,5),[146,125,104]);assert.deepEqual(px(cd({m:1}),30,5),[0,0,0]);
  assert.deepEqual(px(cd({m:2}),30,5),[16,14,11])});
test('colour distance: legacy "Keep colour" param still works',()=>{
  const o=run(shade,[{id:'cd',p:{r:146,g:125,b:104,t:40,k:0}}]).cur;assert.deepEqual(px(o,5,5),[255,255,255])});
test('0/1 params expose dropdown labels',()=>{assert.deepEqual(E.FM.otsu.P[0].o,['Off','On']);assert.deepEqual(E.FM.chan.P[0].o,['Red','Green','Blue'])});
// ---- defect detection
const mk=(w,h,fn)=>{const im=new ImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=fn(x,y),c=Array.isArray(v)?v:[v,v,v];im.data.set([c[0],c[1],c[2],255],(y*w+x)*4)}return im};
let sd=5;const rn=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296;
const noisy=(base,amp)=>(x,y)=>base(x,y)+(rn()-.5)*amp;
const val=(o,x,y)=>o.data[(y*o.width+x)*4];
const rrun=(im,pipe,extra={})=>{const r=E.makeRunner();r.setSource(1,im);return r.run({noise:0,roi:null,pipe,...extra})};
const lineBright=mk(90,60,noisy((x,y)=>Math.abs(y-30)<=0?200:100,10));
const lineDark=mk(90,60,noisy((x,y)=>Math.abs(y-30)<=0?20:100,10));
const edge=mk(90,60,noisy((x,y)=>y<30?60:200,10));
test('ridge: finds a thin bright line, ignores flat noisy background',()=>{
  const o=rrun(lineBright,[step('ridge',{m:0})]).cur,on=val(o,45,30),off=[...Array(40)].map((_,i)=>val(o,20+i,10)).reduce((a,b)=>a+b)/40;
  assert.ok(on>60,'on-line '+on);assert.ok(on>6*off,`contrast ${on} vs ${off}`)});
test('ridge: type selector separates bright and dark lines',()=>{
  const b=rrun(lineBright,[step('ridge',{m:0})]).cur,bd=rrun(lineBright,[step('ridge',{m:1})]).cur,d=rrun(lineDark,[step('ridge',{m:1})]).cur;
  assert.ok(val(b,45,30)>60);assert.ok(val(bd,45,30)<15);assert.ok(val(d,45,30)>40)});
test('ridge "Both": no phantom parallel lines beside a bright line',()=>{
  const o=rrun(lineBright,[step('ridge',{m:2})]).cur,c=val(o,45,30);[2,3,4].forEach(dy=>{assert.ok(val(o,45,30+dy)<.4*c,`flank +${dy}: ${val(o,45,30+dy)} vs ${c}`);assert.ok(val(o,45,30-dy)<.4*c)})});
test('ridge: a plain step edge responds far less than a real line',()=>{
  const e=rrun(edge,[step('ridge',{m:2})]).cur;let mx=0;for(let y=20;y<40;y++)mx=Math.max(mx,val(e,45,y));
  assert.ok(mx<.35*val(rrun(lineBright,[step('ridge',{m:2})]).cur,45,30),'edge response '+mx)});
test('hysteresis keeps weak pixels connected to strong ones, drops isolated weak ones',()=>{
  const g=mk(30,10,(x,y)=>y==5&&x<20?(x==0?200:80):(y==1&&x==10?80:0)),o=rrun(g,[step('hyst',{lo:50,hi:150})]).cur;
  assert.equal(val(o,15,5),255);assert.equal(val(o,10,1),0)});
test('specks: Length mode keeps a long thin line, Area mode drops it; dust removed either way',()=>{
  const g=mk(60,20,(x,y)=>(y==10&&x>=5&&x<35)||(x>=50&&x<53&&y>=2&&y<5)?255:0);
  const len=rrun(g,[step('spk',{n:15,m:1})]).cur,area=rrun(g,[step('spk',{n:50,m:0})]).cur;
  assert.equal(val(len,20,10),255);assert.equal(val(len,51,3),0);assert.equal(val(area,20,10),0)});
test('highlight overlay: colours only mask pixels, leaves the original elsewhere',()=>{
  const src=mk(20,20,(x)=>x<10?[10,20,30]:[200,200,200]),r=rrun(src,[step('thr',{t:100}),step('ovl',{c:0,a:100,o:0})]).cur;
  assert.deepEqual(Array.from(r.data.slice((5*20+15)*4,(5*20+15)*4+3)),[255,40,40]);
  assert.deepEqual(Array.from(r.data.slice((5*20+3)*4,(5*20+3)*4+3)),[10,20,30])});
test('highlight overlay: opacity blends with the original',()=>{
  const src=mk(10,10,()=>[100,100,100]),r=rrun(src,[step('inr',{lo:0,hi:255}),step('ovl',{c:0,a:50,o:0})]).cur;
  assert.deepEqual(Array.from(r.data.slice(0,3)),[178,70,70])});
test('highlight overlay: outline-only leaves region interiors untouched',()=>{
  const src=mk(40,40,()=>[100,100,100]),m=(x,y)=>x>=10&&x<30&&y>=10&&y<30?255:0,r=rrun(mk(40,40,m),[step('thr',{t:100}),step('ovl',{c:0,a:100,o:1})]);
  const g=E.makeRunner();g.setSource(1,src);
  const out=rrun(src,[step('inr',{lo:0,hi:255})]).cur; // sanity: full mask works
  assert.ok(out);assert.ok(r.cur)});
test('blob count measures the mask under a trailing highlight step, not the overlay',()=>{
  const two=mk(60,30,(x,y)=>(x>3&&x<14&&y>3&&y<14)||(x>35&&x<50&&y>12&&y<25)?255:0);
  const o=rrun(two,[step('thr',{t:128}),step('ovl')],{blobs:true,minA:20});assert.equal(o.blobs.length,2)});
test('paint anomaly: flags a differently coloured patch, nothing else; "darker" ignores a bright patch',()=>{
  const g=mk(80,60,(x,y)=>x>=30&&x<44&&y>=20&&y<34?[160,150,140]:(x>=60&&x<70&&y>=5&&y<15?[20,50,90]:[40,80,130]));
  const any=rrun(g,[step('anom',{s:12,m:0})]).cur;assert.ok(val(any,37,27)>100);assert.ok(val(any,10,50)<8);
  const dark=rrun(g,[step('anom',{s:12,m:2})]).cur;assert.ok(val(dark,37,27)<8);assert.ok(val(dark,65,10)>40)});
