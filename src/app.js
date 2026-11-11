const ENGINE_SRC=document.getElementById('engine-src').textContent;
const {F,FM,cx,normRoi,makeRunner,crop}=new Function(ENGINE_SRC+'\nreturn {F,FM,cx,normRoi,makeRunner,crop}')();
const $=s=>document.querySelector(s);
let pipe=[],SRC=null,live=false,vid=null,stream=null,part=null,sourceMode='sample';
const c0=$('#c0'),c1=$('#c1');
// ---------- engine: same source runs on the main thread (UI metadata) and in a Web Worker (heavy work)
let ROI=null,drag=null,srcId=0,srcSent=-1,seq=0,inflight=false,dirty=false,last=null,worker=null,localRunner=null,busyT=0;
const setSrc=im=>{SRC=im;srcId++};
const WORKER_MAIN=`
const __r=makeRunner();
const __pk=im=>im&&{w:im.width,h:im.height,buf:im.data.buffer};
onmessage=e=>{const m=e.data;try{
if(m.t==='src'){__r.setSource(m.sid,new ImageData(new Uint8ClampedArray(m.buf),m.w,m.h));return}
const o=__r.run(m.req),tr=[o.cur.data.buffer];if(o.noisy)tr.push(o.noisy.data.buffer);
postMessage({t:'res',seq:m.seq,o:{...o,cur:__pk(o.cur),noisy:__pk(o.noisy)}},tr)}
catch(err){postMessage({t:'err',seq:m.seq,msg:String(err&&err.message||err)})}};`;
function initWorker(){try{const url=URL.createObjectURL(new Blob([ENGINE_SRC+WORKER_MAIN],{type:'text/javascript'}));
worker=new Worker(url);worker.onmessage=onRes;worker.onerror=()=>useMainThread()}catch(e){useMainThread()}}
function useMainThread(){if(worker){try{worker.terminate()}catch(e){}}worker=null;localRunner=makeRunner();srcSent=-1;inflight=false;dirty=false;queue()}
const toIm=x=>x&&new ImageData(new Uint8ClampedArray(x.buf),x.w,x.h);
function onRes(e){const m=e.data;inflight=false;clearTimeout(busyT);c1.classList.remove('busy');
if(m.t==='err'){$('#info').textContent='Filter error: '+m.msg}
else{const o={...m.o,cur:toIm(m.o.cur),noisy:toIm(m.o.noisy)};last=o;finish(o);report(o)}
if(dirty){dirty=false;run()}}
// ---------- run
let pend=0;const queue=()=>{if(!pend)pend=requestAnimationFrame(()=>{pend=0;run()})};
function show(cv,im){cv.width=im.width;cv.height=im.height;cv.getContext('2d').putImageData(im,0,0)}
const curReq=()=>({noise:+$('#noise').value,roi:ROI&&ROI.w>8&&ROI.h>8?{...ROI}:null,pipe:pipe.map(s=>({id:s.id,p:{...s.p}})),blobs:$('#bl').checked,minA:+$('#minA').value||1});
function drawOrig(){show(c0,SRC);const x0=c0.getContext('2d'),R=normRoi(ROI,SRC.width,SRC.height),D=drag?ROI:R,k=Math.max(1,SRC.width/400);
if(D&&D.w>0&&D.h>0){x0.fillStyle='rgba(0,0,0,.5)';x0.fillRect(0,0,c0.width,D.y);x0.fillRect(0,D.y+D.h,c0.width,c0.height-D.y-D.h);x0.fillRect(0,D.y,D.x,D.h);x0.fillRect(D.x+D.w,D.y,c0.width-D.x-D.w,D.h);x0.strokeStyle='#2dd4bf';x0.lineWidth=2*k;x0.setLineDash([6*k,4*k]);x0.strokeRect(D.x,D.y,D.w,D.h);x0.setLineDash([])}
$('#roiTxt').textContent=D&&D.w>8?`box ${Math.round(D.w)}×${Math.round(D.h)}`:'drag to draw a box'}
function run(){if(!SRC)return;drawOrig();if(inflight){dirty=true;return}
const req=curReq();
if(srcSent!==srcId){if(worker){const c=SRC.data.slice();worker.postMessage({t:'src',sid:srcId,buf:c.buffer,w:SRC.width,h:SRC.height},[c.buffer])}else localRunner.setSource(srcId,SRC);srcSent=srcId}
if(worker){inflight=true;worker.postMessage({t:'run',seq:++seq,req});clearTimeout(busyT);busyT=setTimeout(()=>c1.classList.add('busy'),150)}
else{try{const o=localRunner.run(req);last=o;finish(o);report(o)}catch(err){$('#info').textContent='Filter error: '+err.message}}}
// Draw Result: paste ROI, apply before/after split, overlay blob boxes.
function finish(o){const R=o.roi,input=o.noisy||SRC,zm=R&&$('#zoom').checked;let out=o.cur,ox=0,oy=0;const base=zm?crop(input,R):input;
if(R&&!zm){out=new ImageData(new Uint8ClampedArray(input.data),input.width,input.height);for(let y=0;y<R.h;y++)out.data.set(o.cur.data.subarray(y*R.w*4,(y+1)*R.w*4),((R.y+y)*input.width+R.x)*4);ox=R.x;oy=R.y}
else out=new ImageData(new Uint8ClampedArray(out.data),out.width,out.height);
const W=out.width,H=out.height,xs=Math.round(+$('#split').value/100*W);
if(xs>0)for(let y=0;y<H;y++)out.data.set(base.data.subarray(y*W*4,(y*W+xs)*4),y*W*4);
show(c1,out);const x=c1.getContext('2d'),k=Math.max(1,W/400);
if(o.blobs){x.strokeStyle='#ff3b30';x.lineWidth=2*k;o.blobs.slice(0,300).forEach(q=>{if(q[0]+ox+q[2]/2>=xs)x.strokeRect(q[0]+ox-1,q[1]+oy-1,q[2]+2,q[3]+2)})}
if(xs>0){x.save();x.fillStyle='rgba(0,0,0,.55)';x.fillRect(xs-1.5*k,0,3*k,H);x.fillStyle='#fff';x.fillRect(xs-k,0,2*k,H);
x.beginPath();x.arc(xs,H/2,10*k,0,7);x.fill();x.fillStyle='#0a7d6e';x.beginPath();x.moveTo(xs-6*k,H/2);x.lineTo(xs-2.5*k,H/2-4*k);x.lineTo(xs-2.5*k,H/2+4*k);x.fill();x.beginPath();x.moveTo(xs+6*k,H/2);x.lineTo(xs+2.5*k,H/2-4*k);x.lineTo(xs+2.5*k,H/2+4*k);x.fill();
x.font=`700 ${11*k}px system-ui,sans-serif`;x.textBaseline='top';const tag=(t,px,al)=>{x.textAlign=al;const w=x.measureText(t).width;x.fillStyle='rgba(0,0,0,.6)';x.fillRect(al=='left'?px-4*k:px-w-4*k,6*k,w+8*k,17*k);x.fillStyle='#fff';x.fillText(t,px,9*k)};
if(xs>80*k)tag('ORIGINAL',10*k,'left');if(W-xs>70*k)tag('RESULT',W-10*k,'right');x.restore()}}
function report(o){const R=o.roi;let msg=pipe.length?`${R?'box · ':''}${pipe.length} step(s), ${o.ms} ms${o.hit?` · ${o.hit} cached`:''}${worker?'':' · main thread'}`:'Add filters in step 3.';
if(o.blobs)msg+=` · <span class="ok">${o.blobs.length} blob(s)</span>, total area ${o.blobs.reduce((a,q)=>a+q[4],0)} px`;
$('#info').innerHTML=msg;syncRecipe();
document.querySelectorAll('#pipe .stwarn').forEach((el,i)=>{const w=(o.warn||[])[i];el.hidden=!w;el.textContent=w?'⚠ '+w:''});updateWorkspace()}
// ---------- recipe v2: pipeline + region + noise + part + blob + view settings (region saved as fractions, so it survives a resolution change)
const r4=v=>Math.round(v*1e4)/1e4;
function getRecipe(){const R=SRC&&ROI&&ROI.w>8&&ROI.h>8?normRoi(ROI,SRC.width,SRC.height):null;
return{v:2,pipe:pipe.map(s=>({id:s.id,p:s.p})),roi:R&&{x:r4(R.x/SRC.width),y:r4(R.y/SRC.height),w:r4(R.w/SRC.width),h:r4(R.h/SRC.height)},noise:+$('#noise').value,part:part?part.id:null,blobs:$('#bl').checked,minA:+$('#minA').value||1,zoom:$('#zoom').checked,split:+$('#split').value}}
function syncRecipe(){if(document.activeElement!==$('#rj'))$('#rj').value=JSON.stringify(getRecipe())}
function loadRecipe(txt){const j=JSON.parse(txt),r=Array.isArray(j)?{v:1,pipe:j}:j;if(!r||!Array.isArray(r.pipe))throw new Error('no pipe');
pipe=r.pipe.filter(s=>s&&FM[s.id]).map(s=>{const p={};FM[s.id].P.forEach(q=>p[q.k]=q.d);if(s.id==='cd'&&s.p&&s.p.k!==undefined&&s.p.m===undefined)p.m=s.p.k?1:0;return{id:s.id,p:Object.assign(p,s.p)}});
if(r.v>=2){const n=cx(+r.noise||0,0,+$('#noise').max||100);$('#noise').value=n;$('#noiseVal').textContent=n;
$('#bl').checked=!!r.blobs;if(r.minA)$('#minA').value=r.minA;$('#zoom').checked=!!r.zoom;setSplit(cx(+r.split||0,0,100),true);
if(r.part&&PARTS.some(p=>p.id==r.part)){$('#part').value=r.part;$('#part').onchange()}
const f=r.roi;ROI=f&&SRC?{x:Math.round(f.x*SRC.width),y:Math.round(f.y*SRC.height),w:Math.round(f.w*SRC.width),h:Math.round(f.h*SRC.height)}:null}
drawPipe();queue()}
function setSplit(v,skip){$('#split').value=v;$('#splitVal').textContent=v?v+'%':'off';if(!skip){if(last)finish(last);syncRecipe()}}
function updateWorkspace(){const src=$('#wsSource'),size=$('#wsSize'),roi=$('#wsRoi'),ps=$('#wsPipe'),tip=$('#wsTip');if(!src)return;src.textContent=sourceMode==='upload'?'Uploaded image':sourceMode==='webcam'?'Webcam':'Built-in sample';size.textContent=SRC?`${SRC.width} × ${SRC.height}`:'—';roi.textContent=ROI&&ROI.w>8&&ROI.h>8?`${Math.round(ROI.w)} × ${Math.round(ROI.h)} px`:'Full image';ps.textContent=`${pipe.length} filter${pipe.length===1?'':'s'}`;$('#noise').disabled=false;const nl=+$('#noise').value;$('#noiseStatus').textContent=nl===0?'Noise is off; the source image is unchanged.':`Simulating sensor noise at level ${nl} on this ${sourceMode==='upload'?'uploaded image':sourceMode==='webcam'?'webcam frame':'sample'}.`;$('#noiseHelp').textContent='Adds simulated sensor noise to the processing input. The original image is kept unchanged.';tip.textContent=!SRC?'Choose an image to begin.':pipe.length?`Your pipeline has ${pipe.length} filter${pipe.length===1?'':'s'}. Continue adjusting and compare the Result preview.`:'Image loaded. Mark a region in Step 2 or add filters in Step 3.'} 
// ---------- pipeline UI
function showToast(message){const t=$('#toast');if(!t)return;t.textContent=message;t.classList.add('show');clearTimeout(window.__visionToastTimer);window.__visionToastTimer=setTimeout(()=>t.classList.remove('show'),2200)}
function addStep(id,ov){const f=FM[id],p={};f.P.forEach(q=>p[q.k]=q.d);Object.assign(p,ov||{});pipe.push({id,p});drawPipe();queue();showToast(`${f.n} added to your pipeline`)}
function drawPipe(){const el=$('#pipe');el.innerHTML='';if(!pipe.length){el.innerHTML='<div class="mu">Empty. Add filters from the catalog or apply a recommended recipe.</div>'}
pipe.forEach((s,i)=>{const f=FM[s.id],d=document.createElement('div');d.className='st';
d.innerHTML=`<div class="row" style="justify-content:space-between"><b>${i+1}. ${f.n}</b><span><button data-a="u">↑</button> <button data-a="d">↓</button> <button data-a="x">✕</button></span></div><div class="mu stwarn" hidden style="color:var(--wa)"></div>`;
if(s.id==='cd'||s.id==='hue'){const pb=document.createElement('button');pb.type='button';pb.className='pick';pb.textContent='💧 Pick colour from image';pb.onclick=()=>startPick(s);d.appendChild(pb)}
f.P.forEach(q=>{const r=document.createElement('div');r.className='sl';
if(q.o){r.innerHTML=`<span>${q.l}</span><select>${q.o.map((t,v)=>`<option value="${v}"${s.p[q.k]==v?' selected':''}>${t}</option>`).join('')}</select><span></span>`;r.querySelector('select').onchange=e=>{s.p[q.k]=+e.target.value;queue()};d.appendChild(r);return}
r.innerHTML=`<span>${q.l}</span><input type="range" min="${q.a}" max="${q.b}" step="${q.s}" value="${s.p[q.k]}"><span>${s.p[q.k]}</span>`;
const inp=r.querySelector('input'),lb=r.lastElementChild;inp.oninput=()=>{s.p[q.k]=+inp.value;lb.textContent=inp.value;queue()};d.appendChild(r)});
d.querySelectorAll('button[data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a=='x')pipe.splice(i,1);if(a=='u'&&i>0)[pipe[i-1],pipe[i]]=[pipe[i],pipe[i-1]];if(a=='d'&&i<pipe.length-1)[pipe[i+1],pipe[i]]=[pipe[i],pipe[i+1]];drawPipe();queue()});el.appendChild(d)})}
$('#clr').onclick=()=>{pipe=[];drawPipe();queue()};
// ---------- catalog + recommender
const cats=[...new Set(F.map(f=>f.c))];
const CATINFO={
'Tone':{icon:'◐',desc:'Improve overall image appearance by adjusting brightness, contrast and pixel intensity.'},
'Noise':{icon:'▦',desc:'Suppress sensor noise and speckle, or restore fine details after smoothing.'},
'Edges':{icon:'⌁',desc:'Highlight object boundaries, outlines, scratches, corners and fine surface details.'},
'Threshold':{icon:'◩',desc:'Convert grayscale images into foreground and background regions for segmentation.'},
'Morphology':{icon:'▧',desc:'Refine binary shapes: remove small regions, expand objects, close gaps and extract outlines.'},
'Lighting':{icon:'☼',desc:'Compensate for shadows, gradients and uneven illumination across the image.'},
'Colour':{icon:'◉',desc:'Separate objects by hue or inspect individual red, green and blue image channels.'},
'Defects':{icon:'✦',desc:'Find and mark scratches, cracks, chips and paint damage, then overlay them on the photo.'},
'Texture':{icon:'▤',desc:'Measure local surface variation and emphasize texture differences or fine detail.'}
};
function drawCat(){const q=$('#q').value.trim().toLowerCase(),rs=part?part.s.map(s=>s[0]):[],el=$('#cl');el.innerHTML='';
$('#filterCount').textContent=`${F.length} filters · ${cats.length} categories`;
cats.forEach((k,idx)=>{const all=F.filter(f=>f.c===k),fs=all.filter(f=>(f.n+' '+f.d+' '+f.c).toLowerCase().includes(q));if(q&&!fs.length&&!k.toLowerCase().includes(q))return;
const det=document.createElement('details');det.className='catGroup';if(q)det.open=true;
const info=CATINFO[k]||{icon:'◈',desc:'Explore filters in this category.'};
const summary=document.createElement('summary');summary.innerHTML=`<span class="catIcon">${info.icon}</span><span class="catSummary"><b>${k}</b><small>${info.desc}</small></span><span class="catCount">${all.length} filters</span>`;det.appendChild(summary);
const body=document.createElement('div');body.className='catBody';
fs.forEach(f=>{const d=document.createElement('div');d.className='it'+(rs.includes(f.id)?' rec':'');const infoBox=document.createElement('div');infoBox.style.minWidth='0';const title=document.createElement('b');title.textContent=f.n;if(rs.includes(f.id)){const tag=document.createElement('span');tag.className='tag';tag.textContent='recommended';title.appendChild(tag)}const desc=document.createElement('div');desc.className='mu';desc.textContent=f.d;infoBox.append(title,desc);const add=document.createElement('button');add.type='button';add.textContent='+ Add';add.setAttribute('aria-label','Add '+f.n+' filter');add.onclick=()=>addStep(f.id);d.append(infoBox,add);body.appendChild(d)});
if(!fs.length){const none=document.createElement('p');none.className='mu';none.textContent='No filters in this category match your search.';body.appendChild(none)}
det.append(summary,body);el.appendChild(det)});
if(!el.children.length)el.innerHTML='<p class="mu">No matching categories or filters found. Try another search.</p>';
}
$('#q').oninput=drawCat;
$('#part').innerHTML='<option value="">Choose a part type…</option>'+PARTS.map(p=>`<option value="${p.id}">${p.n}</option>`).join('');
$('#part').onchange=()=>{part=PARTS.find(p=>p.id==$('#part').value)||null;const r=$('#rec');if(!part){r.innerHTML='';drawCat();return}
r.innerHTML=`<div class="mu"><b>Lighting tip:</b> ${part.light}</div><ol>${part.s.map(s=>`<li><b>${FM[s[0]].n}</b><div class="mu">${s[2]}</div></li>`).join('')}</ol><button class="p" id="app">Apply this recipe</button>`;
$('#app').onclick=()=>{pipe=[];part.s.forEach(s=>{const f=FM[s[0]],p={};f.P.forEach(q=>p[q.k]=q.d);Object.assign(p,s[1]);pipe.push({id:s[0],p})});$('#bl').checked=!!part.bl;drawPipe();queue();go(2);showToast(`${pipe.length} recommended filters added`);
const m={metal:0,pcb:1,lowc:2,ocr:3,defect:0,glass:0,color:4,noisy:2,scratch:5,paint:5}[part.id];if(!live&&m!=null){$('#src').value=m;setSample(m)}};drawCat()};
// ---------- sources
$('#src').innerHTML=SMP.map((s,i)=>`<option value="${i}">${s}</option>`).join('');
function setSample(i){stopCam();sourceMode='sample';setSrc(sample(+i));queue();updateWorkspace()}
$('#src').onchange=()=>setSample($('#src').value);$('#noise').oninput=()=>{ $('#noiseVal').textContent=$('#noise').value;queue();updateWorkspace(); };
$('#bl').onchange=queue;$('#minA').oninput=queue;
$('#up').onclick=()=>$('#file').click();
let upImg=null;
function fitTo(w0,h0,max){const s=Math.min(1,max/Math.max(w0,h0));return[Math.max(1,Math.round(w0*s)),Math.max(1,Math.round(h0*s))]}
function loadUpload(){if(!upImg)return;const[w,h]=fitTo(upImg.naturalWidth,upImg.naturalHeight,+$('#res').value),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(upImg,0,0,w,h);setSrc(x.getImageData(0,0,w,h));queue();updateWorkspace()}
$('#res').onchange=()=>{if(sourceMode==='upload')loadUpload()};
$('#file').onchange=e=>{const f=e.target.files[0];if(!f)return;stopCam();sourceMode='upload';const im=new Image();im.onload=()=>{upImg=im;ROI=null;loadUpload()};im.src=URL.createObjectURL(f)};
async function startCam(){try{stream=await navigator.mediaDevices.getUserMedia({video:true});sourceMode='webcam';vid=document.createElement('video');vid.srcObject=stream;vid.muted=true;await vid.play();live=true;$('#cam').textContent='Stop webcam';loop()}catch(e){$('#info').textContent='Webcam unavailable here (permission denied or blocked in this view). Try Upload instead.'}}
function stopCam(){live=false;$('#cam').textContent='Start webcam';if(stream)stream.getTracks().forEach(t=>t.stop());stream=null}
let lt=0;function loop(){if(!live)return;const n=performance.now();if(n-lt>150&&vid.videoWidth){lt=n;const[w,h]=fitTo(vid.videoWidth,vid.videoHeight,Math.min(+$('#res').value,800)),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(vid,0,0,w,h);setSrc(x.getImageData(0,0,w,h));queue()}requestAnimationFrame(loop)}
$('#cam').onclick=()=>live?(stopCam(),setSample($('#src').value)):startCam();
// Canvases are letterboxed (object-fit:contain), so map the pointer through the image's real on-screen rectangle, not the element box.
function shown(cv){const r=cv.getBoundingClientRect(),k=Math.min(r.width/cv.width,r.height/cv.height),w=cv.width*k,h=cv.height*k;return{l:r.left+(r.width-w)/2,t:r.top+(r.height-h)/2,w,h}}
const pt=e=>{const r=shown(c0);return[cx((e.clientX-r.l)*c0.width/r.w,0,c0.width),cx((e.clientY-r.t)*c0.height/r.h,0,c0.height)]};
let pickStep=null;
function startPick(s){pickStep=s;c0.style.cursor='copy';c0.classList.add('picking');showToast('Click the part colour on the Original image');go(2)}
function endPick(){pickStep=null;c0.style.cursor='crosshair';c0.classList.remove('picking')}
function doPick(e){const[x,y]=pt(e),X=Math.round(x),Y=Math.round(y),rad=Math.max(1,Math.round(SRC.width/200));let r=0,g=0,b=0,n=0;
for(let j=-rad;j<=rad;j++)for(let i=-rad;i<=rad;i++){const xx=cx(X+i,0,SRC.width-1),yy=cx(Y+j,0,SRC.height-1),k=(yy*SRC.width+xx)*4;r+=SRC.data[k];g+=SRC.data[k+1];b+=SRC.data[k+2];n++}
r=Math.round(r/n);g=Math.round(g/n);b=Math.round(b/n);
if(pickStep.id==='cd'){Object.assign(pickStep.p,{r,g,b})}
else{const mx=Math.max(r,g,b),mn=Math.min(r,g,b),c=mx-mn;let H=0;if(c){H=mx==r?((g-b)/c)%6:mx==g?(b-r)/c+2:(r-g)/c+4;H=Math.round((H*60+360)%360)}pickStep.p.h=H}
showToast(`Picked rgb(${r}, ${g}, ${b})`);endPick();drawPipe();queue()}
c0.onpointerdown=e=>{if(pickStep){doPick(e);return}c0.setPointerCapture(e.pointerId);drag=pt(e);ROI=null};
c0.onpointermove=e=>{if(!drag)return;const p=pt(e);ROI={x:Math.round(Math.min(drag[0],p[0])),y:Math.round(Math.min(drag[1],p[1])),w:Math.round(Math.abs(p[0]-drag[0])),h:Math.round(Math.abs(p[1]-drag[1]))};queue()};
c0.onpointerup=()=>{drag=null;if(ROI&&(ROI.w<9||ROI.h<9))ROI=null;queue()};
$('#clrroi').onclick=()=>{ROI=null;queue()};$('#ctr').onclick=()=>{const w=SRC.width,h=SRC.height;ROI={x:w/4|0,y:h/4|0,w:w/2|0,h:h/2|0};queue()};
$('#zoom').onchange=queue;$('#split').oninput=()=>setSplit(+$('#split').value);
let sdrag=false;const spos=e=>{const r=shown(c1);return Math.round(cx((e.clientX-r.l)/r.w*100,0,100))};
c1.style.touchAction='none';c1.onpointerdown=e=>{c1.setPointerCapture(e.pointerId);sdrag=true;setSplit(spos(e))};
c1.onpointermove=e=>{if(sdrag)setSplit(spos(e))};c1.onpointerup=()=>{sdrag=false};c1.ondblclick=()=>setSplit(0);
$('#cp').onclick=()=>{const r=$('#rj');r.select();try{navigator.clipboard.writeText(r.value)}catch(e){}};
$('#ld').onclick=()=>{try{loadRecipe($('#rj').value);showToast('Recipe loaded')}catch(e){$('#info').textContent='Could not read that recipe.'}};
const ST=['1 Source','2 Part & region','3 Filters','4 Inspect'];
function go(n){document.querySelectorAll('.stp').forEach(e=>e.hidden=+e.dataset.s!==n);[...$('#tabs').children].forEach((t,i)=>t.classList.toggle('on',i==n))}
$('#tabs').innerHTML=ST.map((s,i)=>`<div class="tab" data-t="${i}">${s}</div>`).join('');
$('#tabs').onclick=e=>{const t=e.target.closest('.tab');if(t)go(+t.dataset.t)};
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(+b.dataset.go));go(0);
let hv=null;const BX='.card,.st,.it,.tab,button,select,input,textarea,canvas';
function setHv(el){if(el===hv)return;if(hv)hv.classList.remove('hv');hv=el;if(el)el.classList.add('hv')}
document.addEventListener('pointerover',e=>{if(e.pointerType=='mouse')setHv(e.target.closest?e.target.closest(BX):null)});
document.addEventListener('pointerleave',()=>setHv(null));
function setTheme(t,save){document.documentElement.dataset.theme=t;if(save)try{localStorage.setItem('vl-theme',t)}catch(e){}}
let th0=null;try{th0=localStorage.getItem('vl-theme')}catch(e){}
setTheme(th0||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
$('#tg').onclick=()=>setTheme(document.documentElement.dataset.theme=='dark'?'light':'dark',1);
initWorker();setSample(0);drawPipe();drawCat();
