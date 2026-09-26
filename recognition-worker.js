import {recognize} from './recognizer.js';
self.onmessage=e=>{try{self.postMessage({result:recognize(e.data)});}catch(error){self.postMessage({error:error.message});}};
