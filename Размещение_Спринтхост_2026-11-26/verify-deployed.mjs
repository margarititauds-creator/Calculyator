import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execFileAsync=promisify(execFile);
const manifest=JSON.parse(fs.readFileSync(new URL('./package-manifest.json',import.meta.url),'utf8'));
const entries=Object.entries(manifest.files).filter(([name])=>!['.htaccess','privacy.html','consent.html'].includes(name));
const results=[];
for(let i=0;i<entries.length;i+=4){
 results.push(...await Promise.all(entries.slice(i,i+4).map(async([name,expected])=>{
  try{
   const {stdout}=await execFileAsync('curl.exe',['--fail','--silent','--show-error','--max-time','20','--resolve','www.margarititavoronina.ru:80:141.8.192.126','http://www.margarititavoronina.ru/'+name],{encoding:'buffer',maxBuffer:2*1024*1024,windowsHide:true});
   const sha256=createHash('sha256').update(stdout).digest('hex');
   return {name,status:200,sha256,match:sha256===expected};
  }catch(e){return {name,match:false,error:e.message};}
 })));
}
const report={at:new Date().toISOString(),server:'141.8.192.126',virtualHost:'www.margarititavoronina.ru',transport:'HTTP public static files only; no form data',passed:results.filter(x=>x.match).length,total:results.length,results};
fs.writeFileSync(new URL('./deployed-files-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(results.some(x=>!x.match))process.exitCode=1;
