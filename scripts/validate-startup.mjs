import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const nodes=new Map();
function node(selector){
 if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:selector==='#demo-search'?'':'all',listeners:{},addEventListener(event,handler){this.listeners[event]=handler;},querySelectorAll(){return [];}});
 return nodes.get(selector);
}
const tasks=JSON.parse(fs.readFileSync('dist/data/tasks.json','utf8'));
const demos=JSON.parse(fs.readFileSync('dist/data/demo-videos.json','utf8'));
const page=fs.readFileSync('dist/index.html','utf8');
const narrativeNodes=[...page.matchAll(/data-narrative="([^"]+)"/g)].map(([,key])=>{
 const element=node(`[data-narrative="${key}"]`);
 element.dataset={narrative:key};
 return element;
});
const context=vm.createContext({
 document:{addEventListener(){},querySelector:node,querySelectorAll(selector){return selector==='[data-narrative]'?narrativeNodes:[];}},
 $:node,tasks,demos,reportFigures:JSON.parse(fs.readFileSync('dist/data/report-figures.json','utf8')),title:value=>value.replaceAll('_',' '),pct:value=>Number(value)*100,
 video:(path,label)=>`<video src="${path}" aria-label="${label}"></video>`,initVideos(){}
});
// Opening and related-work copy must render without loading benchmark modules.
vm.runInContext(fs.readFileSync('dist/narrative.js','utf8'),context,{filename:'narrative.js'});
const intro=node('[data-narrative="introduction"]').innerHTML;
assert.equal((intro.match(/<p>/g)||[]).length,2);
assert.ok(intro.startsWith('<p>Recent advances in frontier large language models'));
assert.ok(!intro.includes('Since its launch'));
assert.ok(!intro.includes('Recent reports have begun to explore this frontier.'));
const relatedWork=node('[data-narrative="relatedWork"]').innerHTML;
assert.equal((relatedWork.match(/<p>/g)||[]).length,1);
assert.ok(relatedWork.startsWith('<p>Recent reports have begun to explore this frontier.'));
assert.ok(relatedWork.includes('https://robodojo-benchmark.com/report/gpt-6-astra-eval'));
for(let reference=1;reference<=8;reference++)assert.ok(relatedWork.includes(`[${reference}]`));
for(const [anchor] of relatedWork.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi))assert.ok(!/\[\d+\]/.test(anchor),'Citation numbers must not be links.');
assert.ok(!/href=["']#ref-|role=["']doc-biblioref/.test(relatedWork));
const relatedSection=page.match(/<section\b[^>]*\bid="related-work"[^>]*>([\s\S]*?)<\/section>\s*<section\b[^>]*\bid="references"/);
assert.ok(relatedSection,'Related work must appear directly before References.');
assert.ok(relatedSection[1].includes('data-narrative="relatedWork"'));
// Exercise the library's real startup and filter handlers, including shared helpers.
for(const file of ['charts.js','research.js'])vm.runInContext(fs.readFileSync(`dist/${file}`,'utf8'),context,{filename:file});
vm.runInContext('initDemoLibrary()',context);
assert.ok(node('#demo-group').innerHTML.includes('Tabletop (7)'));
assert.equal((node('#library-grid').innerHTML.match(/class="library-item"/g)||[]).length,6);
assert.ok(node('#library-count').textContent.startsWith('26 tasks'));
node('#demo-group').value='mobility:Fixed';node('#demo-group').listeners.change();
assert.ok(node('#library-count').textContent.startsWith('7 tasks'));
node('#demo-next').listeners.click();
assert.equal(node('#demo-page').textContent,'2 / 2');
assert.equal((node('#library-grid').innerHTML.match(/class="library-item"/g)||[]).length,1);
console.log('Startup checks: independent opening and related-work rendering, plain citation numbers, section order, library rendering, subgroup filtering and pagination pass.');

// The extra leaderboard submission belongs only to the overall ranking.
const ranking=JSON.parse(vm.runInContext('JSON.stringify(overallRanking())',context));
assert.deepEqual(ranking.map(m=>m.key),['OpenWAM-Alpha','AMapbot','Astra (ICL)','Qwen-RobotManip','Pi05','InternVLA-A1.5','Pi0','GigaBrain-0.7','FastWAM']);
assert.equal(ranking[1].sr,.4891);assert.equal(ranking[1].score,.6386);
const scoreRanking=JSON.parse(vm.runInContext("JSON.stringify(overallRanking('score'))",context));
assert.deepEqual(scoreRanking.map(m=>m.key),['OpenWAM-Alpha','Astra (ICL)','AMapbot','Qwen-RobotManip','Pi05','Pi0','InternVLA-A1.5','GigaBrain-0.7','FastWAM']);
assert.equal(vm.runInContext('chartModels.length',context),8);
assert.equal(vm.runInContext("chartModels.some(m=>m[0]==='AMapbot')",context),false);
console.log('Overall ranking: nine entries sorted for both metrics; detailed analysis retains eight models.');
