import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
const action=process.argv[2];
if(!['submit','status'].includes(action))throw Error('Use submit or status');
const api='https://d5dafk8hndmtgdf4nfio.3zvepvee.apigw.yandexcloud.net';
const origin='https://margarititavoronina.ru';
const fixtureFile=new URL('../Подключение_2026-11-15/private/sprinthost-launch-fixture-2026-11-26.json',import.meta.url);
const evidenceFile=new URL('./launch-cloud-verification.json',import.meta.url);
const configResponse=await fetch(api+'/api/config',{headers:{Origin:origin},signal:AbortSignal.timeout(15000)});
const config=await configResponse.json();
if(!configResponse.ok||config.ready!==true||!/^[a-f0-9]{64}$/.test(config.consentVersion||''))throw Error('Intake not ready');
if(configResponse.headers.get('access-control-allow-origin')!==origin)throw Error('CORS origin mismatch');
let fixture;
if(fs.existsSync(fixtureFile))fixture=JSON.parse(fs.readFileSync(fixtureFile,'utf8'));
else{
 if(action!=='submit')throw Error('No fixture');
 fixture={requestId:randomUUID(),receipt:randomUUID(),name:'Тестовая Анкета',contact:'+70000000000',
 question:'ВЫМЫШЛЕННАЯ повторная проверка облачного расписания после загрузки исправления в Спринтхост 26.11.2026. HTTPS домена ещё ожидает настройки. Контакт не настоящий. Отправить только очередным облачным запуском, без отправителя на ПК.',
 source:{utm_source:'synthetic_sprinthost_launch'},consent:true,consentVersion:config.consentVersion,website:'',
 calculation:{mode:'simple',industry:'beauty',period:'month',dataSource:'records',focus:'auto',purchases:300,revenue:300000,capacity:500,targetPurchases:450,targetTicket:1200}};
 fs.writeFileSync(fixtureFile,JSON.stringify(fixture,null,2)+'\n',{flag:'wx'});
}
if(fixture.name!=='Тестовая Анкета'||fixture.contact!=='+70000000000'||fixture.source.utm_source!=='synthetic_sprinthost_launch')throw Error('Unexpected fixture');
const response=await fetch(api+'/api/'+(action==='submit'?'submit':'status'),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(action==='submit'?fixture:{requestId:fixture.requestId,receipt:fixture.receipt}),signal:AbortSignal.timeout(35000)});
const value=await response.json();
const evidence={at:new Date().toISOString(),action,requestId:fixture.requestId,httpStatus:response.status,status:value.status||null,intakeReady:true,corsOrigin:origin,manualDispatcherCalled:false};
const history=fs.existsSync(evidenceFile)?JSON.parse(fs.readFileSync(evidenceFile,'utf8')):[];
history.push(evidence);fs.writeFileSync(evidenceFile,JSON.stringify(history,null,2)+'\n');
console.log(JSON.stringify(evidence));
if(!response.ok)process.exitCode=2;
