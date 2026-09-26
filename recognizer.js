// Lightweight, offline stroke-template recognizer. Similarity is not a probability.
const templates=[];
const path=s=>s.split('|').map(line=>line.trim().split(' ').map(p=>{const [x,y]=p.split(',').map(Number);return{x,y};}));
const shapes={
 '0':['5,0 1,1 0,5 1,9 5,10 9,9 10,5 9,1 5,0'],
 '1':['2,2 5,0 5,10','5,0 5,10','2,2 5,0 5,10|2,10 8,10'],
 '2':['0,2 2,0 7,0 10,2 9,4 0,10 10,10','0,2 3,0 8,1 9,3 6,6 0,10 10,10'],
 '3':['0,1 4,0 9,1 10,3 5,5 9,6 10,8 7,10 1,10 0,9'],
 '4':['7,0 0,7 10,7|7,0 7,10','0,0 0,6 9,6|8,0 8,10'],
 '5':['10,0 1,0 0,5 6,4 9,6 9,8 6,10 0,9'],
 '6':['9,1 6,0 2,3 0,7 2,10 7,10 10,7 8,5 3,5 0,7'],
 '7':['0,0 10,0 4,10','0,0 10,0 4,10|2,5 8,5'],
 '8':['5,5 1,3 2,0 7,0 9,3 5,5 0,8 2,10 8,10 10,8 5,5'],
 '9':['9,5 4,5 1,3 2,0 7,0 9,3 9,7 6,10 2,10'],
 '+':['0,5 10,5|5,0 5,10'], '-':['0,5 10,5'],
 '×':['0,0 10,10|0,10 10,0'], '/':['0,10 10,0'],
 '(' :['7,0 3,2 1,5 3,8 7,10'], ')':['3,0 7,2 9,5 7,8 3,10'],
 '=':['0,2 10,2|0,8 10,8'],
 '÷':['5,0 5,0|0,5 10,5|5,10 5,10'],
 '%':['1,0 0,1 1,2 2,1 1,0|0,10 10,0|9,8 8,9 9,10 10,9 9,8'],
 'x':['0,0 10,10|10,0 0,10']
};
export function bounds(strokes){const pts=strokes.flatMap(s=>s.points);if(!pts.length)return null;let x=Infinity,y=Infinity,r=-Infinity,b=-Infinity;for(const p of pts){x=Math.min(x,p.x);y=Math.min(y,p.y);r=Math.max(r,p.x);b=Math.max(b,p.y);}return{x,y,w:r-x,h:b-y};}
function cloud(lines){let lengths=lines.map(l=>l.slice(1).reduce((a,p,i)=>a+Math.hypot(p.x-l[i].x,p.y-l[i].y),0)),total=lengths.reduce((a,b)=>a+b,0);let points=[];lines.forEach((line,k)=>{let count=Math.max(2,Math.round(40*lengths[k]/(total||1)));for(let i=0;i<count;i++){let target=lengths[k]*i/(count-1),dist=0;let p=line[0];for(let j=1;j<line.length;j++){let a=line[j-1],b=line[j],d=Math.hypot(b.x-a.x,b.y-a.y);if(dist+d>=target){let t=d?(target-dist)/d:0;p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};break;}dist+=d;p=b;}points.push(p);}});const b=bounds([{points}]),scale=Math.max(b.w,b.h,1);return points.map(p=>({x:(p.x-b.x-b.w/2)/scale,y:(p.y-b.y-b.h/2)/scale}));}
for(const [label,variants] of Object.entries(shapes))for(const v of variants)for(const aspect of [.75,1,1.25,1.5])templates.push({label,points:cloud(path(v).map(line=>line.map(p=>({x:p.x,y:p.y*aspect})))),count:path(v).length});
function distance(a,b){return a.reduce((sum,p)=>sum+Math.min(...b.map(q=>Math.hypot(p.x-q.x,p.y-q.y))),0)/a.length;}
export function recognize(strokes){
 if(!strokes.length)throw Error('手書きの数式を囲んでください。');
 let groups=strokes.map(s=>({strokes:[s],b:bounds([s])})).sort((a,b)=>a.b.x-b.b.x);
 // Strokes sharing horizontal space belong to one symbol, including = and crossed operators.
 for(let i=0;i<groups.length-1;){let a=groups[i],b=groups[i+1],overlap=Math.min(a.b.x+a.b.w,b.b.x+b.b.w)-Math.max(a.b.x,b.b.x);if((overlap>=0&&overlap>=Math.min(a.b.w,b.b.w)*.25) || (Math.abs(a.b.x+a.b.w/2-b.b.x-b.b.w/2)<4)){a.strokes.push(...b.strokes);a.b=bounds(a.strokes);groups.splice(i+1,1);}else i++;}
 const maxH=Math.max(...groups.map(g=>g.b.h)),all=bounds(strokes);let candidates=[];
 for(const g of groups){if(g.b.w<maxH*.18&&g.b.h<maxH*.18&&g.b.y>all.y+maxH*.62){candidates.push({label:'.',score:.96});continue;}
 const pts=cloud(g.strokes.map(s=>s.points));const ranked=templates.map(t=>({label:t.label,d:(distance(pts,t.points)+distance(t.points,pts))/2+Math.abs(t.count-g.strokes.length)*.018})).sort((a,b)=>a.d-b.d);let first=ranked[0],other=ranked.find(t=>t.label!==first.label&&!(t.label==='x'&&first.label==='×')&&!(t.label==='×'&&first.label==='x'));
 const margin=(other?.d??1)-first.d;const score=Math.max(0,Math.min(.99,1-first.d*2.8-(margin<.025?.15:0)));
 candidates.push({label:first.label,score});}
 let formula=candidates.map(c=>c.label).join('');
 // For equations, crossed strokes conventionally denote variable x. User can correct × ambiguity.
 if(formula.includes('=')){formula=formula.replaceAll('×','x');for(const c of candidates)if(c.label==='×'||c.label==='x')c.score=Math.min(c.score,.85);}
 return {formula,confidence:Math.min(...candidates.map(c=>c.score)),candidates,provider:'local'};
}
export {shapes};
