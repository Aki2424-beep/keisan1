// A bounded parser: never executes input as JavaScript.
export function normalize(input) {
 let s=String(input).normalize('NFKC').trim();
 for(let i=0;i<12&&/\\(?:d?frac)/.test(s);i++) s=s.replace(/\\(?:d?frac)\{([^{}]*)\}\{([^{}]*)\}/g,'(($1)/($2))');
 return s.replace(/\\(?:left|right)/g,'').replace(/\\(?:times|cdot)/g,'*').replace(/\\div/g,'/').replace(/\\[%]/g,'%').replace(/\\[()[\]]/g,'').replace(/[{}]/g,m=>m==='{'?'(':')').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/[−–—]/g,'-').replace(/\s+/g,'').replace(/X/g,'x');
}
const fmt=n=>Number(n.toPrecision(12)).toString();
export function calculate(input) {
 const normalizedFormula=normalize(input);
 if(!normalizedFormula||normalizedFormula.length>400) throw Error('数式を400文字以内で入力してください。');
 const tokens=normalizedFormula.match(/(?:\d+(?:\.\d*)?|\.\d+)|[x+*/()=^%\-]/g)||[];
 if(tokens.join('')!==normalizedFormula) throw Error('数字、x、四則演算、括弧、%を使ってください。');
 let pos=0,depth=0; const peek=()=>tokens[pos],take=()=>tokens[pos++];
 const check=v=>{if(!v.every(Number.isFinite)||v.some(n=>Math.abs(n)>1e100))throw Error('計算できる範囲を超えています。');return v;};
 const add=(u,v,sign=1)=>check([u[0]+sign*v[0],u[1]+sign*v[1]]);
 const mul=(u,v)=>{if(u[0]&&v[0])throw Error('対応する方程式は一次方程式です。');return check([u[0]*v[1]+v[0]*u[1],u[1]*v[1]]);};
 const div=(u,v)=>{if(v[0])throw Error('xを分母に含む式には未対応です。');if(v[1]===0)throw Error('0では割れません。');return check([u[0]/v[1],u[1]/v[1]]);};
 function atom(){if(++depth>50)throw Error('括弧が深すぎます。');let v;const t=take();if(t==='('){v=expr();if(take()!==')')throw Error('括弧を確認してください。');}else if(t==='x')v=[1,0];else if(t&&/^\d|^\./.test(t))v=[0,Number(t)];else throw Error('数式の途中に不足があります。');depth--;return v;}
 function power(){let v=atom();if(peek()==='^'){take();const p=unary();if(p[0]||v[0])throw Error('文字の累乗には未対応です。');v=check([0,v[1]**p[1]]);}while(peek()==='%'){take();v=div(v,[0,100]);}return v;}
 function unary(){if(peek()==='+'){take();return unary();}if(peek()==='-'){take();return mul([0,-1],unary());}return power();}
 function term(){let v=unary();while(peek()==='*'||peek()==='/'||peek()==='('||peek()==='x'){const t=peek();if(t==='*'||t==='/')take();v=t==='/'?div(v,unary()):mul(v,unary());}return v;}
 function expr(){let v=term();while(peek()==='+'||peek()==='-'){let t=take();v=add(v,term(),t==='+'?1:-1);}return v;}
 const l=expr();let answer,steps=[];
 if(peek()==='='){take();const r=expr(),a=l[0]-r[0],b=r[1]-l[1];if(Math.abs(a)<1e-12){answer=Math.abs(b)<1e-12?'すべての x で成立':'解なし';steps=[normalizedFormula,answer];}else{answer='x = '+fmt(b/a);steps=[normalizedFormula,`${fmt(l[0])}x + (${fmt(l[1])}) = ${fmt(r[0])}x + (${fmt(r[1])})`,`${fmt(a)}x = ${fmt(b)}`,answer];}}
 else{if(l[0])throw Error('xを含む式には「=」を入れてください。');answer=fmt(l[1]);steps=[normalizedFormula,`= ${answer}`];}
 if(pos!==tokens.length)throw Error('式が複数あるか、演算子が不足しています。');
 return {normalizedFormula,answer,steps};
}
