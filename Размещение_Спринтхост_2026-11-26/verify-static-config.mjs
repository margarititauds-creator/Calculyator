import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs';
import {createDeliveryClient} from './public_html/delivery-client.js';
const run=promisify(execFile), requests=[];
async function fetchPublicConfig(url){
 const local=url.startsWith('/');
 if(local&&url!=='/api/config.json')throw Error('Unexpected local discovery route');
 if(!local&&url!=='https://d5dafk8hndmtgdf4nfio.3zvepvee.apigw.yandexcloud.net/api/config')throw Error('Unexpected cloud config route');
 const args=['--silent','--show-error','--max-time','15','--write-out','\n%{http_code}'];
 if(local)args.push('--resolve','www.margarititavoronina.ru:80:141.8.192.126');
 else args.push('--header','Origin: https://margarititavoronina.ru');
 args.push(local?'http://www.margarititavoronina.ru'+url:url);
 const {stdout}=await run('curl.exe',args,{encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
 const split=stdout.lastIndexOf('\n'),status=Number(stdout.slice(split+1));
 requests.push({url,status});
 return new Response(stdout.slice(0,split),{status,headers:{'Content-Type':'application/json'}});
}
const config=await createDeliveryClient(fetchPublicConfig).config();
const result={at:new Date().toISOString(),scope:'Static discovery and live cloud readiness; no form submission',requests,ready:config.ready,consentVersionValid:/^[a-f0-9]{64}$/.test(config.consentVersion||''),privacyUrl:config.privacyUrl,consentUrl:config.consentUrl};
fs.writeFileSync(new URL('./static-config-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
if(!result.ready||!result.consentVersionValid||requests.length!==2)process.exitCode=1;
