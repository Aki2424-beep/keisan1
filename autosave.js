// Coalesce edits without serializing the notebook on every pen stroke.
export function createAutosaver({write,canSave=()=>true,status=()=>{},delay=1500,setTimer=setTimeout,clearTimer=clearTimeout}){
 let revision=0,saved=0,timer=null,running=null;
 function suspend(){if(timer!==null)clearTimer(timer);timer=null;}
 function resume(){suspend();if(revision!==saved)timer=setTimer(()=>{timer=null;void flush(false);},delay);}
 function mark(){revision++;status('dirty');resume();}
 async function flush(force=true){
  suspend();
  if(running){await running;return force&&revision!==saved?flush(true):revision===saved;}
  if(revision===saved)return true;
  if(!force&&!canSave()){resume();return false;}
  const target=revision;
  status('saving');
  running=(async()=>{try{await write();saved=target;status(saved===revision?'saved':'dirty');return true;}catch{status('error');return false;}})();
  const ok=await running;running=null;
  // A failed write is retried only on the next edit or explicit save.
  if(ok&&revision!==saved)resume();
  return ok;
 }
 return {mark,suspend,resume,flush,get dirty(){return revision!==saved;}};
}
