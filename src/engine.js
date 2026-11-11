const fromG=(g,w,h)=>{const o=new ImageData(w,h);for(let i=0;i<g.length;i++){const v=g[i]<0?0:g[i]>255?255:g[i],j=i*4;o.data[j]=o.data[j+1]=o.data[j+2]=v;o.data[j+3]=255}return o};
const G=im=>{const n=im.width*im.height,g=new Float32Array(n),d=im.data;for(let i=0;i<n;i++){const j=i*4;g[i]=.299*d[j]+.587*d[j+1]+.114*d[j+2]}return g};
const gf=f=>{const fn=(im,p)=>{const w=im.width,h=im.height;return fromG(f(G(im),w,h,p),w,h)};fn.g=f;return fn};
// Colour-preserving wrapper: runs a gray kernel on each of R,G,B so colour survives the step.
const cf=f=>(im,p)=>{const w=im.width,h=im.height,n=w*h,d=im.data,o=new ImageData(w,h),pl=new Float32Array(n);
for(let c=0;c<3;c++){for(let i=0;i<n;i++)pl[i]=d[i*4+c];const r=f(pl,w,h,p);for(let i=0;i<n;i++){const v=r[i];o.data[i*4+c]=v<0?0:v>255?255:v}}
for(let i=0;i<n;i++)o.data[i*4+3]=255;return o};
const cx=(v,a,b)=>v<a?a:v>b?b:v;
function gblur(g,w,h,s){if(s<.1)return g;const r=Math.ceil(s*3),k=[];let sm=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*s*s));k.push(v);sm+=v}
const t=new Float32Array(g.length),o=new Float32Array(g.length);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){let a=0;for(let i=-r;i<=r;i++)a+=g[y*w+cx(x+i,0,w-1)]*k[i+r];t[y*w+x]=a/sm}
for(let y=0;y<h;y++)for(let x=0;x<w;x++){let a=0;for(let i=-r;i<=r;i++)a+=t[cx(y+i,0,h-1)*w+x]*k[i+r];o[y*w+x]=a/sm}return o}
function lstat(g,w,h,s){const m=gblur(g,w,h,s),q=gblur(g.map(v=>v*v),w,h,s);return{m,sd:m.map((v,i)=>Math.sqrt(Math.max(0,q[i]-v*v)))}}
function mm(g,w,h,r,mx){const pass=(s,hz)=>{const o=new Float32Array(s.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=mx?-1e9:1e9;for(let k=-r;k<=r;k++){const q=s[hz?y*w+cx(x+k,0,w-1):cx(y+k,0,h-1)*w+x];if(mx?q>v:q<v)v=q}o[y*w+x]=v}return o};return pass(pass(g,1),0)}
function sob(b,w,h){const gx=new Float32Array(b.length),gy=new Float32Array(b.length),m=new Float32Array(b.length);
for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;
const a=(b[i-w+1]+2*b[i+1]+b[i+w+1])-(b[i-w-1]+2*b[i-1]+b[i+w-1]),c=(b[i+w-1]+2*b[i+w]+b[i+w+1])-(b[i-w-1]+2*b[i-w]+b[i-w+1]);gx[i]=a;gy[i]=c;m[i]=Math.hypot(a,c)}return{gx,gy,m}}
function canny(g,w,h,s,lo,hi){const{gx,gy,m}=sob(gblur(g,w,h,s),w,h),n=new Float32Array(g.length),o=new Float32Array(g.length);
for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;let a=Math.atan2(gy[i],gx[i])*180/Math.PI;if(a<0)a+=180;
const[p,q]=a<22.5||a>=157.5?[i-1,i+1]:a<67.5?[i-w-1,i+w+1]:a<112.5?[i-w,i+w]:[i-w+1,i+w-1];if(m[i]>=m[p]&&m[i]>=m[q])n[i]=m[i]}
const st=[];for(let i=0;i<n.length;i++)if(n[i]>=hi){o[i]=255;st.push(i)}
while(st.length){const i=st.pop(),x=i%w,y=(i/w)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const j=Y*w+X;if(!o[j]&&n[j]>=lo){o[j]=255;st.push(j)}}}return o}
function otsu(g){const H=new Float64Array(256);g.forEach(v=>H[cx(v|0,0,255)]++);let T=g.length,sm=0;for(let i=0;i<256;i++)sm+=i*H[i];let sb=0,wb=0,best=0,t=128;
for(let i=0;i<256;i++){wb+=H[i];if(!wb)continue;const wf=T-wb;if(!wf)break;sb+=i*H[i];const d=sb/wb-(sm-sb)/wf,v=wb*wf*d*d;if(v>best){best=v;t=i}}return t}

// ---------- defect-detection helpers
// Multi-scale Hessian ridge detector: bright/dark thin lines (scratches, hairline cracks) of any orientation.
// A gradient term suppresses the false "ridges" that appear on either side of a plain step edge.
function ridge(g,w,h,s,mode){const Rb=new Float32Array(g.length),Rd=new Float32Array(g.length);
for(const sg of[s,s*1.6]){const L=gblur(g,w,h,sg),n2=sg*sg;
for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,lxx=L[i-1]-2*L[i]+L[i+1],lyy=L[i-w]-2*L[i]+L[i+w],lxy=(L[i+w+1]-L[i+w-1]-L[i-w+1]+L[i-w-1])/4,
tr=(lxx+lyy)/2,dd=Math.sqrt(((lxx-lyy)/2)**2+lxy*lxy);let a=tr+dd,b=tr-dd;if(Math.abs(a)>Math.abs(b)){const t=a;a=b;b=t}
const ab=Math.abs(b),gm=Math.hypot((L[i+1]-L[i-1])/2,(L[i+w]-L[i-w])/2),r=ab*Math.exp(-(a*a)/(.5*b*b))/(1+(gm/(ab*sg*.5+1e-6))**2)*n2;
if(b<0){if(r>Rb[i])Rb[i]=r}else if(r>Rd[i])Rd[i]=r}}
if(mode===0)return Rb;if(mode===1)return Rd;
// "Both": the flanks of a bright line look like faint dark ridges (and vice versa). Drop a ridge when a much stronger opposite one is nearby.
const rad=Math.max(2,Math.ceil(s*2.4)),Mb=mm(Rb,w,h,rad,1),Md=mm(Rd,w,h,rad,1),o=new Float32Array(g.length);
for(let i=0;i<o.length;i++){const vb=Rb[i]>=.6*Md[i]?Rb[i]:0,vd=Rd[i]>=.6*Mb[i]?Rd[i]:0;o[i]=vb>vd?vb:vd}return o}
// Hysteresis: keep weak pixels (>=lo) only if connected to a strong one (>=hi). Great for long cracks.
function hyst(g,w,h,lo,hi){const o=new Float32Array(g.length),st=[];for(let i=0;i<g.length;i++)if(g[i]>=hi){o[i]=255;st.push(i)}
while(st.length){const i=st.pop(),x=i%w,y=(i/w)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const j=Y*w+X;if(!o[j]&&g[j]>=lo){o[j]=255;st.push(j)}}}return o}
// Remove connected white regions smaller than `min` (by pixel area, or by longest side of the bounding box for thin scratches).
function specks(g,w,h,min,byLen){const o=new Float32Array(g.length),seen=new Uint8Array(g.length),st=new Int32Array(g.length);
for(let s=0;s<g.length;s++){if(seen[s]||g[s]<128)continue;let sp=0,n=0,x0=w,y0=h,x1=0,y1=0;const mem=[];st[sp++]=s;seen[s]=1;
while(sp){const i=st[--sp],x=i%w,y=(i/w)|0;mem.push(i);n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const j=Y*w+X;if(!seen[j]&&g[j]>=128){seen[j]=1;st[sp++]=j}}}
if((byLen?Math.max(x1-x0+1,y1-y0+1):n)>=min)for(const i of mem)o[i]=255}return o}
const OVC=[[255,40,40],[255,214,10],[60,235,90],[40,220,255],[255,80,230]];
const P=(k,l,a,b,s,d)=>({k,l,a,b,s,d});
const F=[
{id:'gray',n:'Grayscale',c:'Tone',d:'Collapses colour to luminance. Usually the first step; cuts data 3×.',P:[],f:gf(g=>g)},
{id:'bc',n:'Brightness / contrast',c:'Tone',d:'Linear gain and offset. Quick fix for under- or over-exposed images.',P:[P('b','Brightness',-100,100,1,0),P('c','Contrast',.2,3,.05,1)],f:gf((g,w,h,p)=>g.map(v=>(v-128)*p.c+128+p.b))},
{id:'gamma',n:'Gamma',c:'Tone',d:'Non-linear brightness. Lifts shadows (γ<1) or deepens them (γ>1).',P:[P('g','Gamma',.2,3,.05,1)],f:gf((g,w,h,p)=>g.map(v=>255*Math.pow(cx(v,0,255)/255,p.g)))},
{id:'inv',n:'Invert',c:'Tone',d:'Swaps light and dark so objects of interest become the bright foreground.',P:[],f:gf(g=>g.map(v=>255-v))},
{id:'norm',n:'Contrast stretch',c:'Tone',d:'Maps the darkest and brightest pixels to 0 and 255. Great for low-contrast parts.',P:[],f:gf(g=>{let a=1e9,b=-1e9;g.forEach(v=>{if(v<a)a=v;if(v>b)b=v});return g.map(v=>(v-a)*255/(b-a||1))})},
{id:'eq',n:'Histogram equalisation',c:'Tone',d:'Spreads intensities evenly to expose hidden detail. Can amplify noise.',P:[],f:gf(g=>{const H=new Float64Array(256);g.forEach(v=>H[cx(v|0,0,255)]++);let s=0;const L=H.map(v=>(s+=v)*255/g.length);return g.map(v=>L[cx(v|0,0,255)])})},
{id:'gauss',n:'Gaussian blur',c:'Noise',d:'Smooths sensor noise. Always blur before edge detection.',P:[P('s','Sigma',.3,6,.1,1.5)],f:gf((g,w,h,p)=>gblur(g,w,h,p.s))},
{id:'median',n:'Median filter',c:'Noise',d:'Removes salt-and-pepper noise and speckle while keeping edges sharp.',P:[P('r','Radius',1,3,1,1)],f:gf((g,w,h,p)=>{const o=new Float32Array(g.length),r=p.r,a=new Float32Array((2*r+1)**2);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let n=0;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)a[n++]=g[cx(y+j,0,h-1)*w+cx(x+i,0,w-1)];o[y*w+x]=a.slice(0,n).sort()[n>>1]}return o})},
{id:'unsharp',n:'Unsharp mask',c:'Noise',d:'Boosts fine detail by adding back the difference from a blurred copy.',P:[P('a','Amount',0,4,.1,1.5),P('s','Sigma',.5,5,.1,1.5)],f:gf((g,w,h,p)=>{const b=gblur(g,w,h,p.s);return g.map((v,i)=>v+p.a*(v-b[i]))})},
{id:'sobel',n:'Sobel edges',c:'Edges',d:'Gradient magnitude. Thick, soft edges; fast and robust for measuring.',P:[P('k','Gain',.5,5,.1,1.5)],f:gf((g,w,h,p)=>sob(g,w,h).m.map(v=>v/4*p.k))},
{id:'lap',n:'Laplacian',c:'Edges',d:'Second derivative. Highlights fine lines, scratches and corners; noise sensitive.',P:[P('k','Gain',.5,6,.1,2)],f:gf((g,w,h,p)=>{const o=new Float32Array(g.length);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;o[i]=Math.abs(g[i-1]+g[i+1]+g[i-w]+g[i+w]-4*g[i])*p.k}return o})},
{id:'canny',n:'Canny edges',c:'Edges',d:'Thin, clean, connected edges. The standard for outline and dimension work.',P:[P('s','Blur σ',.5,4,.1,1.4),P('lo','Low thr',5,300,5,40),P('hi','High thr',10,400,5,100)],f:gf((g,w,h,p)=>canny(g,w,h,p.s,p.lo,p.hi))},
{id:'thr',n:'Binary threshold',c:'Threshold',d:'Fixed cut-off. Fastest segmentation when lighting is stable and controlled.',P:[P('t','Threshold',0,255,1,128),P('inv','Objects dark',0,1,1,0)],f:gf((g,w,h,p)=>g.map(v=>(p.inv?v<=p.t:v>p.t)?255:0))},
{id:'otsu',n:'Otsu threshold',c:'Threshold',d:'Picks the threshold automatically for a two-class (part vs background) image.',P:[P('inv','Objects dark',0,1,1,0)],f:gf((g,w,h,p)=>{const t=otsu(g);return g.map(v=>(p.inv?v<=t:v>t)?255:0)})},
{id:'adapt',n:'Adaptive threshold',c:'Threshold',d:'Local threshold against neighbourhood mean. Survives uneven lighting; ideal for text and traces.',P:[P('s','Window σ',2,30,1,8),P('C','Offset C',0,40,1,6),P('dark','Objects dark',0,1,1,1)],f:gf((g,w,h,p)=>{const m=gblur(g,w,h,p.s);return g.map((v,i)=>(p.dark?v<m[i]-p.C:v>m[i]+p.C)?255:0)})},
{id:'ero',n:'Erode',c:'Morphology',d:'Shrinks bright regions. Removes small specks and separates touching parts.',P:[P('r','Radius',1,8,1,1)],f:gf((g,w,h,p)=>mm(g,w,h,p.r,0))},
{id:'dil',n:'Dilate',c:'Morphology',d:'Grows bright regions. Bridges small gaps in edges and strokes.',P:[P('r','Radius',1,8,1,1)],f:gf((g,w,h,p)=>mm(g,w,h,p.r,1))},
{id:'open',n:'Opening',c:'Morphology',d:'Erode then dilate. Deletes small bright noise while keeping the main shape size.',P:[P('r','Radius',1,8,1,1)],f:gf((g,w,h,p)=>mm(mm(g,w,h,p.r,0),w,h,p.r,1))},
{id:'close',n:'Closing',c:'Morphology',d:'Dilate then erode. Fills small holes and gaps inside parts.',P:[P('r','Radius',1,8,1,2)],f:gf((g,w,h,p)=>mm(mm(g,w,h,p.r,1),w,h,p.r,0))},
{id:'grad',n:'Morphological gradient',c:'Morphology',d:'Dilate minus erode: a clean outline of every region.',P:[P('r','Radius',1,5,1,1)],f:gf((g,w,h,p)=>{const a=mm(g,w,h,p.r,1),b=mm(g,w,h,p.r,0);return a.map((v,i)=>v-b[i])})},
{id:'tophat',n:'Top-hat / black-hat',c:'Morphology',d:'Isolates small bright (0) or dark (1) features against a varying background. Good for scratches and pits.',P:[P('r','Radius',2,15,1,4),P('m','Dark features',0,1,1,0),P('k','Gain',1,6,.5,3)],f:gf((g,w,h,p)=>{const o=p.m?mm(mm(g,w,h,p.r,1),w,h,p.r,0):mm(mm(g,w,h,p.r,0),w,h,p.r,1);return g.map((v,i)=>(p.m?o[i]-v:v-o[i])*p.k)})},
{id:'flat',n:'Flat-field correction',c:'Lighting',d:'Divides by a heavy blur to cancel uneven illumination and vignetting.',P:[P('s','Blur σ',10,80,1,40),P('k','Gain',.5,2,.05,1)],f:gf((g,w,h,p)=>{const b=gblur(g,w,h,p.s);return g.map((v,i)=>v/(b[i]+1)*128*p.k)})},
{id:'hue',n:'Hue isolate',c:'Colour',d:'White where the pixel hue matches a target colour. Sorts colour-coded parts.',P:[P('h','Hue °',0,360,1,0),P('w','Tolerance °',5,90,1,25)],f:(im,p)=>{const w=im.width,h=im.height,o=new Float32Array(w*h),d=im.data;for(let i=0;i<w*h;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),c=mx-mn;if(c<25)continue;let H=mx==r?((g-b)/c)%6:mx==g?(b-r)/c+2:(r-g)/c+4;H=(H*60+360)%360;const df=Math.abs(H-p.h);if(Math.min(df,360-df)<=p.w)o[i]=255}return fromG(o,w,h)}},
{id:'chan',n:'Channel select',c:'Colour',d:'Uses only R, G or B. Mimics a coloured filter in front of the lens.',P:[P('c','Channel 0=R 1=G 2=B',0,2,1,0)],f:(im,p)=>{const n=im.width*im.height,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=im.data[i*4+p.c];return fromG(o,im.width,im.height)}},
{id:'prew',n:'Prewitt edges',c:'Edges',d:'Like Sobel with uniform weights. Slightly noisier, very fast.',P:[P('k','Gain',.5,5,.1,1.5)],f:gf((g,w,h,p)=>{const o=new Float32Array(g.length);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,a=g[i-w+1]+g[i+1]+g[i+w+1]-g[i-w-1]-g[i-1]-g[i+w-1],b=g[i+w-1]+g[i+w]+g[i+w+1]-g[i-w-1]-g[i-w]-g[i-w+1];o[i]=Math.hypot(a,b)/3*p.k}return o})},
{id:'dog',n:'Difference of Gaussians',c:'Edges',d:'Band-pass: keeps features near a chosen size. Finds spots, blobs and fine edges.',P:[P('a','Small σ',.5,5,.1,1),P('b','Large σ',1,12,.1,3),P('k','Gain',1,8,.5,4)],f:gf((g,w,h,p)=>{const a=gblur(g,w,h,p.a),b=gblur(g,w,h,p.b);return a.map((v,i)=>128+(v-b[i])*p.k)})},
{id:'emb',n:'Emboss',c:'Edges',d:'Directional relief. Makes engraving and height changes visible.',P:[P('k','Strength',.5,4,.1,1.5)],f:gf((g,w,h,p)=>{const o=new Float32Array(g.length).fill(128);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;o[i]=128+(g[i+w+1]-g[i-w-1])*p.k}return o})},
{id:'post',n:'Posterise',c:'Tone',d:'Reduces to a few grey levels. Turns smooth shading into flat regions.',P:[P('n','Levels',2,12,1,4)],f:gf((g,w,h,p)=>g.map(v=>Math.round(cx(v,0,255)/255*(p.n-1))*255/(p.n-1)))},
{id:'log',n:'Log transform',c:'Tone',d:'Strongly expands dark tones. Reveals detail hidden in shadow.',P:[P('k','Strength',.5,3,.1,1)],f:gf((g,w,h,p)=>g.map(v=>255*Math.log(1+p.k*10*cx(v,0,255)/255)/Math.log(1+p.k*10)))},
{id:'inr',n:'Range threshold',c:'Threshold',d:'Keeps only pixels between two grey levels. Isolates one brightness band.',P:[P('lo','Low',0,255,1,80),P('hi','High',0,255,1,180)],f:gf((g,w,h,p)=>g.map(v=>v>=p.lo&&v<=p.hi?255:0))},
{id:'nib',n:'Niblack local threshold',c:'Threshold',d:'Threshold from local mean and spread. Handles noisy, textured backgrounds.',P:[P('s','Window σ',3,30,1,10),P('k','k',-1,1,.05,-.2),P('dark','Objects dark',0,1,1,1)],f:gf((g,w,h,p)=>{const{m,sd}=lstat(g,w,h,p.s);return g.map((v,i)=>{const t=m[i]+p.k*sd[i];return(p.dark?v<t:v>t)?255:0})})},
{id:'lnorm',n:'Local normalisation',c:'Lighting',d:'Removes local brightness and contrast variation together. Stronger than flat-field.',P:[P('s','Window σ',3,40,1,15),P('k','Gain',20,80,1,45)],f:gf((g,w,h,p)=>{const{m,sd}=lstat(g,w,h,p.s);return g.map((v,i)=>128+(v-m[i])/(sd[i]+8)*p.k)})},
{id:'lvar',n:'Texture (local variance)',c:'Texture',d:'Bright where the surface is rough or busy, dark where smooth. Finds fabric, grain and damaged zones.',P:[P('s','Window σ',1,12,.5,3),P('k','Gain',1,10,.5,4)],f:gf((g,w,h,p)=>lstat(g,w,h,p.s).sd.map(v=>v*p.k))},
{id:'hpass',n:'High-pass',c:'Texture',d:'Subtracts the blurred image, leaving only fine detail around mid-grey.',P:[P('s','Blur σ',1,20,.5,5),P('k','Gain',1,6,.5,2)],f:gf((g,w,h,p)=>{const b=gblur(g,w,h,p.s);return g.map((v,i)=>128+(v-b[i])*p.k)})},
{id:'sat',n:'Saturation map',c:'Colour',d:'Bright where colour is vivid. Separates coloured parts from grey backgrounds.',P:[P('k','Gain',.5,3,.1,1)],f:(im,p)=>{const n=im.width*im.height,o=new Float32Array(n),d=im.data;for(let i=0;i<n;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2],mx=Math.max(r,g,b);o[i]=mx?(mx-Math.min(r,g,b))/mx*255*p.k:0}return fromG(o,im.width,im.height)}},
{id:'cd',n:'Colour distance',c:'Colour',d:'Keeps pixels close to a chosen colour. Use the eyedropper to pick it from the image; "Ignore brightness" stops shadows dropping out.',P:[P('r','Red',0,255,1,214),P('g','Green',0,255,1,40),P('b','Blue',0,255,1,40),P('t','Tolerance',10,250,1,70),P('nb','Ignore brightness',0,1,1,0),P('m','Show as',0,2,1,1)],f:(im,p)=>{const n=im.width*im.height,d=im.data,o=new Float32Array(n),ts=p.r+p.g+p.b+1,mode=p.m===undefined?(p.k?1:0):p.m,out=new ImageData(im.width,im.height);
for(let i=0;i<n;i++){const j=i*4,r=d[j],g=d[j+1],b=d[j+2];let k=1;
if(p.nb){const sm=r+g+b+1;if(sm<24)k=-1;else k=ts/sm}
const hit=k>0&&Math.hypot(r*k-p.r,g*k-p.g,b*k-p.b)<=p.t;
const f=mode==0?(hit?255:0):hit?1:(mode==1?0:.22);
if(mode==0){out.data[j]=out.data[j+1]=out.data[j+2]=f}else{out.data[j]=r*f;out.data[j+1]=g*f;out.data[j+2]=b*f}out.data[j+3]=255}return out}},
{id:'ridge',n:'Scratch / crack detector',c:'Defects',d:'Finds thin bright or dark lines of any direction: scratches, hairline cracks, seams. Match "Line width" to the defect, raise Gain until it glows.',P:[P('s','Line width σ',.8,4,.1,1.3),P('m','Finds',0,2,1,2),P('k','Gain',1,25,.5,6)],f:gf((g,w,h,p)=>ridge(g,w,h,p.s,p.m).map(v=>v*p.k))},
{id:'anom',n:'Paint damage / local anomaly',c:'Defects',d:'Highlights anything whose colour differs from its surroundings: chips, peeling, rust, stains. Larger window = bigger defects, but must exceed the defect size.',P:[P('s','Window σ',4,40,1,14),P('m','Look for',0,2,1,0),P('k','Gain',.5,8,.1,2.5)],f:(im,p)=>{const w=im.width,h=im.height,n=w*h,d=im.data,B=[0,1,2].map(c=>{const pl=new Float32Array(n);for(let i=0;i<n;i++)pl[i]=d[i*4+c];return gblur(pl,w,h,p.s)}),o=new Float32Array(n);
for(let i=0;i<n;i++){const dr=d[i*4]-B[0][i],dg=d[i*4+1]-B[1][i],db=d[i*4+2]-B[2][i],l=.299*dr+.587*dg+.114*db;if((p.m==1&&l<0)||(p.m==2&&l>0))continue;o[i]=Math.hypot(dr,dg,db)/1.732*p.k}return fromG(o,w,h)}},
{id:'hyst',n:'Hysteresis threshold',c:'Defects',d:'Keeps strong pixels plus weaker ones touching them. Turns a patchy defect response into complete, connected cracks without picking up isolated noise.',P:[P('lo','Low',1,200,1,25),P('hi','High',2,255,1,60)],f:gf((g,w,h,p)=>hyst(g,w,h,Math.min(p.lo,p.hi),p.hi))},
{id:'spk',n:'Remove small specks',c:'Defects',d:'Deletes white regions that are too small. "Length" keeps long thin scratches while dropping dust; "Area" keeps big chips.',P:[P('n','Minimum size px',1,300,1,15),P('m','Measure by',0,1,1,1)],f:gf((g,w,h,p)=>specks(g,w,h,p.n,p.m))},
{id:'ovl',n:'Highlight on original',c:'Defects',d:'Paints the white regions of the mask in colour on top of the original photo, so defects are marked exactly where they are. Make it the last step.',P:[P('c','Colour',0,4,1,0),P('a','Opacity %',20,100,5,85),P('t','Thicken px',0,4,1,0),P('o','Outline only',0,1,1,0)],f:(im,p,orig)=>{const w=im.width,h=im.height,base=orig&&orig.width===w&&orig.height===h?orig:im,o=new ImageData(new Uint8ClampedArray(base.data),w,h),d=im.data,od=o.data,col=OVC[p.c]||OVC[0],al=p.a/100,t=Math.max(1,Math.round(w/450));let m=new Float32Array(w*h);for(let i=0;i<m.length;i++)m[i]=d[i*4];if(p.t)m=mm(m,w,h,p.t,1);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(m[i]<128)continue;
if(p.o){let edge=false;for(let dy=-t;dy<=t&&!edge;dy+=t)for(let dx=-t;dx<=t;dx+=t){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h||m[Y*w+X]<128){edge=true;break}}if(!edge)continue}
const j=i*4;for(let c=0;c<3;c++)od[j+c]=od[j+c]*(1-al)+col[c]*al}return o}},
];
// Filters that keep colour (applied per channel) vs filters that need colour input.
// Everything else outputs grayscale. This lets Hue/Saturation/Colour-distance work after blur, gamma, etc.
const KEEPCOL=['bc','gamma','inv','post','log','gauss','median','unsharp','flat'],NEEDCOL=['hue','chan','sat','cd'];
F.forEach(f=>{f.col=KEEPCOL.includes(f.id)||f.id==='ovl';f.needsCol=NEEDCOL.includes(f.id);if(f.col&&f.f.g)f.f=cf(f.f.g)});
F.forEach(f=>f.P.forEach(q=>{if(!q.o&&q.a===0&&q.b===1&&q.s===1)q.o=['Off','On']}));
F.find(f=>f.id==='chan').P[0].o=['Red','Green','Blue'];
const setO=(id,k,o)=>{F.find(f=>f.id===id).P.find(q=>q.k===k).o=o};
setO('ridge','m',['Bright lines','Dark lines','Both']);setO('anom','m',['Any change','Brighter','Darker']);setO('spk','m',['Area','Length']);setO('ovl','c',['Red','Yellow','Green','Cyan','Magenta']);F.find(f=>f.id==='chan').P[0].l='Channel';
F.find(f=>f.id==='cd').P.find(q=>q.k==='m').o=['Mask','Colour','Dimmed'];
const FM=Object.fromEntries(F.map(f=>[f.id,f]));
function crop(im,r){const o=new ImageData(r.w,r.h);for(let y=0;y<r.h;y++){const k=((r.y+y)*im.width+r.x)*4;o.data.set(im.data.subarray(k,k+r.w*4),y*r.w*4)}return o}
function withSensorNoise(im,level){if(!level)return im;const out=new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),d=out.data,amp=level;for(let p=0;p<d.length;p+=4){let seed=((p/4)|0)+0x9e3779b9;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967295};const n=(rnd()+rnd()+rnd()-1.5)*(amp*1.15);for(let c=0;c<3;c++)d[p+c]=cx(d[p+c]+n,0,255)}return out}
function blobs(im,minA){const w=im.width,h=im.height,d=im.data,seen=new Uint8Array(w*h),st=new Int32Array(w*h),out=[];
for(let s=0;s<w*h;s++){if(seen[s]||Math.max(d[s*4],d[s*4+1],d[s*4+2])<40)continue;let sp=0,a=0,x0=w,y0=h,x1=0,y1=0;st[sp++]=s;seen[s]=1;
while(sp){const i=st[--sp],x=i%w,y=(i/w)|0;a++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
for(const j of[i-1,i+1,i-w,i+w]){if(j<0||j>=w*h||seen[j])continue;if((j==i-1&&x==0)||(j==i+1&&x==w-1))continue;if(Math.max(d[j*4],d[j*4+1],d[j*4+2])>=40){seen[j]=1;st[sp++]=j}}}
if(a>=minA)out.push([x0,y0,x1-x0+1,y1-y0+1,a])}return out}

// ---------- ROI helper shared by UI and worker
function normRoi(r,W,H){if(!r||!(r.w>8&&r.h>8))return null;const o={x:cx(Math.round(r.x),0,W-9),y:cx(Math.round(r.y),0,H-9)};o.w=Math.min(Math.round(r.w),W-o.x);o.h=Math.min(Math.round(r.h),H-o.y);return o}
// ---------- pipeline runner with per-step cache.
// Changing step N only recomputes steps N..end. Changing the source, noise or ROI recomputes everything.
function makeRunner(){let src=null,sid=-1,cache=[],bkey='',cropped=null,noisy=null;
return{
setSource(id,im){src=im;sid=id;cache=[];bkey=''},
run(req){const R=normRoi(req.roi,src.width,src.height),bk=JSON.stringify([sid,req.noise,R]);
if(bk!==bkey){bkey=bk;cache=[];noisy=withSensorNoise(src,req.noise);cropped=R?crop(noisy,R):noisy}
const t=performance.now();let cur=cropped,hit=0,col=true;const warn=[];
req.pipe.forEach((s,i)=>{const f=FM[s.id],k=JSON.stringify(s);
if(f.needsCol&&!col)warn[i]='Input is already grayscale here. Move this step above the filters that remove colour.';
col=col&&f.col;
if(cache[i]&&cache[i].k===k){cur=cache[i].img;hit++}
else{cache.length=i;cur=f.f(cur,s.p,cropped);cache[i]={k,img:cur}}});
cache.length=req.pipe.length;
const ms=Math.round(performance.now()-t),bi=(()=>{let k=req.pipe.length-1;while(k>=0&&req.pipe[k].id==='ovl')k--;return k})(),b=req.blobs?blobs(bi>=0&&cache[bi]?cache[bi].img:cur,req.minA):null;
return{roi:R,cur:new ImageData(new Uint8ClampedArray(cur.data),cur.width,cur.height),noisy:req.noise?new ImageData(new Uint8ClampedArray(noisy.data),noisy.width,noisy.height):null,ms,hit,warn,blobs:b}}}}
if(typeof module!=='undefined')module.exports={ridge,hyst,specks,F,FM,makeRunner,normRoi,blobs,crop,withSensorNoise,fromG,G,gblur,otsu,canny,cf};
