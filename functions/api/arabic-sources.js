import handler from '../../api/arabic-sources.js';
export async function onRequest({request,env}) {
  const query=Object.fromEntries(new URL(request.url).searchParams);
  let status=200;
  const headers=new Headers({'Content-Type':'application/json; charset=utf-8'});
  const res={
    status(code){status=code;return this;},
    setHeader(name,value){headers.set(name,value);return this;},
    json(data){return new Response(JSON.stringify(data),{status,headers});}
  };
  return handler({method:request.method,query},res,env.YOUTUBE_DATA_API_KEY || '');
}
