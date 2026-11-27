// Intake goes directly to Russia. The optional Sites dispatcher gets only
// opaque receipt identifiers and reads an already saved row server-to-server.
export function createDeliveryClient(fetcher){
 let origin=null,cloudDelivery=false;
 async function config(){
  origin=null;cloudDelivery=false;
  try{
   const discovery=await fetcher('/api/config.json',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(6000)});
   if(!discovery.ok)return {ready:false};
   const discovered=await discovery.json(),endpoint=discovered.intakeOrigin;
   cloudDelivery=discovered.cloudDeliveryEnabled===true;
   if(typeof endpoint!=='string')return {ready:false};
   const url=new URL(endpoint);
   if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.origin!==endpoint)return {ready:false};
   const response=await fetcher(endpoint+'/api/config',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!response.ok)return {ready:false};
   const value=await response.json();
   if(!/^[a-f0-9]{64}$/.test(value.consentVersion||''))return {ready:false};
   // Documents remain accessible when collection is paused or storage is down.
   if(value.ready===true)origin=endpoint;
   return {ready:value.ready===true,consentVersion:value.consentVersion,privacyUrl:endpoint+'/privacy',consentUrl:endpoint+'/consent'};
  }catch{return {ready:false};}
 }
 async function post(path,body,timeout=25000){
  if(!origin||!['/api/submit','/api/status'].includes(path))throw new Error('Delivery is not configured');
  const response=await fetcher(origin+path,{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
  if(!cloudDelivery)return response;
  try{
   const status=await response.clone().json();
   if(!['pending','failed'].includes(status.status))return response;
   const delivery=await fetcher('/api/deliver',{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({requestId:body.requestId,receipt:body.receipt}),signal:AbortSignal.timeout(25000)});
   const state=await delivery.clone().json();
   if((delivery.status===200&&state.status==='sent')||(delivery.status===202&&state.status==='pending')||(delivery.status===503&&state.status==='failed'))return delivery;
  }catch{ /* Russian storage receipt remains valid when cloud delivery is unavailable. */ }
  return response;
 }
 return {config,post};
}
