import cinema from './index.js';
import sync,{SourceSync} from './source-sync.js';
export {SourceSync};
export default {
 fetch(request,env){return new URL(request.url).pathname.startsWith('/api/source-sync/')?sync.fetch(request,env):cinema.fetch(request,env);},
 scheduled(event,env,ctx){return sync.scheduled(event,env,ctx);}
};
