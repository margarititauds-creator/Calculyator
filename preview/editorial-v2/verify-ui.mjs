import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from '../../Подключение_2026-11-15/site/.sites-checkout/node_modules/linkedom/esm/index.js';
import {mountCalculator} from './public_html/app.js';
test('mode names keep spaces when narrow layouts wrap the cards',()=>{
 const {document}=parseHTML(fs.readFileSync('public_html/index.html','utf8'));
 const titles=[...document.querySelectorAll('.mode-title')];
 assert.deepEqual(titles.map(n=>n.textContent),['Знаю выручку и число покупок','Знаю число обращений и продаж','Планирую новый бизнес']);
 assert.ok(titles.every(n=>!n.querySelector('br')),'titles must wrap naturally, not rely on a hidden line break as a word separator');
});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(fetcher=async()=>new Response(JSON.stringify({ready:false}),{status:200})){
 const {document,window}=parseHTML(fs.readFileSync('public_html/index.html','utf8'));
 window.HTMLElement.prototype.focus=function(){};window.HTMLElement.prototype.scrollIntoView=function(){};
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return [...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.getAttribute('value')??this.querySelector('option')?.getAttribute('value')??'';},set(value){for(const option of this.querySelectorAll('option')){if(option.getAttribute('value')===String(value))option.setAttribute('selected','');else option.removeAttribute('selected');}}});
 const app=mountCalculator({document,fetcher});await app.ready;
 const $=id=>document.getElementById(id),fire=(id,type)=>$(id).dispatchEvent(new window.Event(type,{bubbles:true,cancelable:true}));
 const set=(id,value)=>{$(id).value=value;};
 function choose(mode){const n=document.querySelector(`input[name="mode"][value="${mode}"]`);n.checked=true;n.dispatchEvent(new window.Event('change',{bubbles:true}));}
 function fields(values){for(const [k,v]of Object.entries(values))set('input-'+k,String(v));}
 return {app,$,fire,set,choose,fields,document,window};
}
async function complete(ui,mode='simple'){
 ui.set('industry','beauty');ui.fire('industry','change');ui.choose(mode);ui.fire('next-step','click');
 const values=mode==='simple'?{purchases:300,revenue:300000,capacity:500,targetPurchases:450,targetTicket:1200}:mode==='detailed'?{leads:1000,firstPurchases:200,repeat:100,ticket:1000,capacity:500,targetFirstPurchases:300,targetRepeat:150,targetTicket:1200}:{plannedPurchases:100,plannedTicket:1200,capacity:100};
 ui.fields(values);ui.fire('next-step','click');ui.set('data-source',mode==='plan'?'estimate':'records');ui.$('confirm').checked=true;
}
test('all three real form paths render correct reports and real author assets',async()=>{for(const mode of ['simple','detailed','plan']){const ui=await setup();await complete(ui,mode);assert.equal(ui.app.state.step,3);ui.fire('calculator-form','submit');await tick();assert.equal(ui.$('results').hidden,false);assert.equal(ui.$('consultation').hidden,false);assert.equal(ui.app.state.report.result.current,mode==='plan'?null:300000);assert.equal(ui.$('results').querySelectorAll('.action-card').length,3);assert.equal(ui.document.querySelectorAll('img').length,2);assert.ok(ui.$('results-title').textContent);}});
test('niche, invalid input, missing source and consent are handled before success',async()=>{const ui=await setup();ui.fire('next-step','click');assert.equal(ui.app.state.step,1);assert.match(ui.$('form-errors').textContent,/нишу/);await complete(ui);ui.set('data-source','');ui.fire('calculator-form','submit');assert.equal(ui.app.state.report,null);assert.equal(ui.$('data-source').getAttribute('aria-invalid'),'true');ui.set('data-source','records');ui.set('input-purchases','0');ui.fire('calculator-form','submit');assert.equal(ui.app.state.step,2);assert.match(ui.$('form-errors').textContent,/новый бизнес/);});
test('editing business data invalidates old recommendations and both confirmations',async()=>{const ui=await setup();await complete(ui);ui.fire('calculator-form','submit');await tick();ui.$('consent').checked=true;ui.set('input-revenue','310000');ui.fire('input-revenue','input');assert.equal(ui.$('results').hidden,true);assert.equal(ui.$('consultation').hidden,true);assert.equal(ui.app.state.report,null);assert.equal(ui.$('confirm').checked,false);assert.equal(ui.$('consent').checked,false);});
test('period change clears numbers rather than silently converting them',async()=>{const ui=await setup();await complete(ui);ui.set('period','year');ui.fire('period','change');assert.equal(ui.$('input-purchases').value,'');assert.equal(ui.$('input-revenue').value,'');assert.equal(ui.$('confirm').checked,false);});
test('Enter advances the current step without submitting hidden contact fields',async()=>{const ui=await setup();ui.set('industry','beauty');ui.fire('calculator-form','submit');assert.equal(ui.app.state.step,2);ui.fields({purchases:10,revenue:20000,capacity:20});ui.fire('calculator-form','submit');assert.equal(ui.app.state.step,3);assert.equal(ui.app.state.report,null);assert.equal(ui.$('form-errors').textContent,'');});
test('uncertain transmission keeps report and offers status instead of false success',async()=>{let submissions=0;const fetcher=async(url)=>{if(url==='/api/config.json')return new Response(JSON.stringify({intakeOrigin:'https://intake.example.test'}));if(url==='https://intake.example.test/api/config')return new Response(JSON.stringify({ready:true,consentVersion:'a'.repeat(64)}));if(url==='https://intake.example.test/api/submit'){submissions++;throw new Error('timeout');}return new Response(JSON.stringify({status:'sent'}));};const ui=await setup(fetcher);await complete(ui);ui.$('send-result').checked=true;ui.fire('send-result','change');ui.set('contact-name','Тест');ui.set('contact-value','@example_user');ui.$('consent').checked=true;ui.fire('calculator-form','submit');await tick();assert.equal(ui.$('delivery-status').dataset.state,'uncertain');assert.equal(ui.$('results').hidden,false);assert.equal(ui.$('check-delivery').hidden,false);assert.equal(submissions,1);ui.fire('check-delivery','click');await tick();assert.equal(ui.$('delivery-status').dataset.state,'sent');assert.equal(submissions,1);});
test('rapid and repeated submit uses one stable request ID for same data',async()=>{const ids=[];let release;const fetcher=async(url,options)=>{if(url==='/api/config.json')return new Response(JSON.stringify({intakeOrigin:'https://intake.example.test'}));if(url==='https://intake.example.test/api/config')return new Response(JSON.stringify({ready:true,consentVersion:'a'.repeat(64)}));ids.push(JSON.parse(options.body).requestId);if(ids.length===1)await new Promise(r=>release=r);return new Response(JSON.stringify({status:'sent'}));};const ui=await setup(fetcher);await complete(ui);ui.$('send-result').checked=true;ui.fire('send-result','change');ui.set('contact-name','Тест');ui.set('contact-value','@example_user');ui.$('consent').checked=true;ui.fire('calculator-form','submit');ui.fire('calculator-form','submit');assert.equal(ids.length,1);assert.equal(ui.app.state.busy,true);release();await tick();ui.fire('calculator-form','submit');await tick();assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);});
test('unavailable delivery never blocks free calculation or pretends to send',async()=>{const ui=await setup();assert.equal(ui.$('send-result').disabled,true);await complete(ui);ui.fire('calculator-form','submit');await tick();assert.ok(ui.app.state.report);assert.ok(ui.$('copy-report'));assert.ok(ui.$('download-report'));assert.equal(ui.$('delivery-status').hidden,true);});
test('documents are visible before contact entry and remain linked when collection is paused',async()=>{
 const ui=await setup(async url=>new Response(JSON.stringify(url==='/api/config.json'?{intakeOrigin:'https://intake.example.test'}:{ready:false,consentVersion:'a'.repeat(64)})));
 assert.equal(ui.$('contact-fields').hidden,true);assert.equal(ui.$('send-result').disabled,true);
 assert.equal(ui.document.querySelector('footer [data-privacy-link]').getAttribute('href'),'https://intake.example.test/privacy');
 assert.equal(ui.document.querySelector('footer [data-consent-link]').getAttribute('href'),'https://intake.example.test/consent');
 assert.equal(ui.document.querySelector('footer a[href^="mailto:"]').getAttribute('href'),'mailto:margarititauds@gmail.com');
});
test('calculate-only action bypasses optional contact and consent without a network submission',async()=>{
 let posts=0;const ui=await setup(async(url,options)=>{
  if(options.method==='POST')posts++;
  return new Response(JSON.stringify(url==='/api/config.json'?{intakeOrigin:'https://intake.example.test'}:{ready:true,consentVersion:'a'.repeat(64)}));
 });
 await complete(ui);ui.$('send-result').checked=true;ui.fire('send-result','change');
 assert.equal(ui.$('calculate-only').hidden,false);assert.match(ui.$('calculate-button').textContent,/отправить анкету/);
 ui.$('contact-value').value='invalid';ui.$('consent').checked=false;
 const event=new ui.window.Event('submit',{bubbles:true,cancelable:true});event.submitter=ui.$('calculate-only');ui.$('calculator-form').dispatchEvent(event);await tick();
 assert.ok(ui.app.state.report);assert.equal(posts,0);assert.equal(ui.$('send-result').checked,false);assert.equal(ui.$('consent').checked,false);
});
test('stale legal version refreshes documents and requires a new consent before retry',async()=>{
 const posts=[];let configs=0;
 const ui=await setup(async(url,options)=>{
  if(url==='/api/config.json')return new Response(JSON.stringify({intakeOrigin:'https://intake.example.test'}));
  if(url.endsWith('/api/config'))return new Response(JSON.stringify({ready:true,consentVersion:(++configs===1?'a':'b').repeat(64)}));
  posts.push(JSON.parse(options.body));
  return posts.length===1?new Response(JSON.stringify({code:'CONSENT_REQUIRED'}),{status:409}):new Response(JSON.stringify({status:'sent'}));
 });
 await complete(ui);ui.$('send-result').checked=true;ui.fire('send-result','change');ui.set('contact-name','Тест');ui.set('contact-value','@example_user');ui.$('consent').checked=true;
 ui.fire('calculator-form','submit');for(let i=0;i<20&&ui.app.state.busy;i++)await tick();
 assert.ok(ui.app.state.report);assert.equal(ui.$('consent').checked,false);assert.equal(posts.length,1);assert.match(ui.$('delivery-status').textContent,/Условия обработки обновились/);
 ui.fire('calculator-form','submit');await tick();assert.equal(posts.length,1);
 ui.$('consent').checked=true;ui.fire('calculator-form','submit');await tick();
 assert.equal(posts.length,2);assert.equal(posts[1].consentVersion,'b'.repeat(64));assert.notEqual(posts[0].requestId,posts[1].requestId);
});

import {industries} from './public_html/niches.js';
import {goalPlan,goalText} from './public_html/goal-plan.js';
import {reportText,reportDocument} from './public_html/report.js';
test('all niches, modes and monetary goals select their own plan and consultation',async()=>{
 let count=0;
 for(const industry of Object.keys(industries))for(const mode of ['simple','detailed','plan']){
  const ui=await setup();await complete(ui,mode);ui.set('industry',industry);ui.fire('calculator-form','submit');await tick();
  const report=ui.app.state.report;
  for(let index=0;index<3;index++){
   ui.$('results').querySelector('[data-goal="'+index+'"]').click();
   assert.equal(report.goalIndex,index);
   const plan=goalPlan(report,index),slot=ui.$('goal-plan').textContent;
   assert.match(slot,new RegExp(industries[industry].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   assert.ok(slot.replace(/\s/g,' ').includes(plan.target.replace(/\s/g,' '))&&slot.includes(plan.volume)&&slot.includes(plan.actions[0].action));
   assert.ok(plan.actions.every(a=>a.action&&a.metric&&a.review&&a.instruction));
   assert.equal(ui.$('results').querySelectorAll('[aria-pressed=true]').length,1);
   assert.ok(new URL(ui.$('consultation-link').href).searchParams.get('text').includes(plan.target));
   assert.ok(reportText(report).includes(goalText(report)));assert.ok(reportDocument(report).includes(plan.target));count++;
  }
 }
 assert.equal(count,Object.keys(industries).length*9);
 console.log('Проверено сочетаний ниши, режима и цели:',count);
});

