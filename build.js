// Builds dist/TheFilterLab.html (single self-contained file) from src/
const fs=require('fs'),path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'src',f),'utf8');
const css=r('style.css');
const engine=r('engine.js');
// Engine is embedded as inert text so it can run BOTH on the main thread (UI metadata)
// and inside a Web Worker (heavy lifting) from one source.
const html=`${r('head.html').trimEnd()}
<style>
${css}
</style></head><body><div class="w">
${r('body.html').trimEnd()}
<script type="text/plain" id="engine-src">
${engine.replace(/<\/script>/g,'<\\/script>')}
</script>
<script>
${r('samples.js')}
${r('app.js')}
${r('scene.js')}
</script></body></html>
`;
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'dist','TheFilterLab.html'),html);
console.log('built dist/TheFilterLab.html',(html.length/1024).toFixed(0)+'KB');
