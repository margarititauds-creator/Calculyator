import {industryGroups,industryProfiles,modeFields,definitions,validateNumbers} from './core.js';
import {createReport,renderReport,reportText,reportDocument} from './report.js';
import {goalPlan,goalMarkup} from './goal-plan.js';
import {sources} from './recommendations.js';
import {escapeHTML as e,parseNumber,money} from './utils.js';
import {validateContact} from './contact.js';
import {createDeliveryClient} from './delivery-client.js';

export function mountCalculator({document=globalThis.document,fetcher=globalThis.fetch,uuid=()=>crypto.randomUUID()}={}){
 const $=id=>document.getElementById(id),form=$('calculator-form'),win=document.defaultView;
 const deliveryClient=createDeliveryClient(fetcher);
 const campaign={};
 for(const key of ['utm_source','utm_medium','utm_campaign']){const value=new URLSearchParams(win.location?.search||'').get(key);if(value&&/^[\p{L}\p{N}_-]{1,60}$/u.test(value))campaign[key]=value;}
 let step=1,mode='simple',busy=false,currentReport=null,currentRequest=null,lastDelivery=null,delivery={ready:false},snapshots={};
 const ids={industry:'industry',period:'period',dataSource:'data-source',focus:'focus',contactName:'contact-name',contactValue:'contact-value'};
 const input=k=>$(ids[k]||'input-'+k);
 $('industry').innerHTML='<option value="" disabled selected>Выберите вашу нишу</option>'+industryGroups.map(g=>`<optgroup label="${e(g.label)}">${g.items.map(n=>`<option value="${n.id}">${e(n.label)}</option>`).join('')}</optgroup>`).join('');
 $('sources-list').innerHTML='<ul>'+Object.values(sources).map(s=>`<li><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a></li>`).join('')+'</ul>';
 function values(){return Object.fromEntries([...modeFields[mode].current,...modeFields[mode].goals].map(k=>[k,parseNumber(input(k)?.value)]));}
 function data(){return {mode,industry:$('industry').value,period:$('period').value,dataSource:mode==='plan'?'estimate':$('data-source').value,focus:$('focus').value,...values()};}
 function clearErrors(){ $('form-errors').innerHTML='';for(const n of form.querySelectorAll('[aria-invalid]'))n.removeAttribute('aria-invalid');for(const n of form.querySelectorAll('.field-error'))n.textContent='';}
 function showErrors(errors){
  clearErrors();const messages=[];
  for(const [key,message] of Object.entries(errors)){input(key)?.setAttribute('aria-invalid','true');const el=$('err-'+key);if(el)el.textContent=message;messages.push(message);}
  $('form-errors').innerHTML=[...new Set(messages)].map(x=>`<p>${e(x)}</p>`).join('');
  const first=Object.keys(errors).find(k=>input(k));(first?input(first):$('form-errors'))?.focus();
 }
 function invalidate(){currentReport=null;currentRequest=null;$('results').hidden=true;$('consultation').hidden=true;$('confirm').checked=false;$('consent').checked=false;}
 function updateNiche(){ $('industry-hint').textContent=industryProfiles[$('industry').value]?.examples||'';const n=$('hint-capacity');if(n)n.textContent=(industryProfiles[$('industry').value]?.capacity||'Максимум покупок')+'. '+definitions.capacity.help;}
 function field(k){const f=definitions[k],v=snapshots[mode]?.[k]??'';return `<div class="field"><label for="input-${k}">${e(f.label)}</label><input id="input-${k}" name="${k}" type="text" inputmode="${f.integer?'numeric':'decimal'}" autocomplete="off" maxlength="24" value="${e(v)}" aria-describedby="hint-${k} err-${k}"><p class="field-hint" id="hint-${k}">${e(f.help)}</p><span class="field-error" id="err-${k}"></span></div>`;}
 function renderFields(){
  $('current-fields').innerHTML=modeFields[mode].current.map(field).join('');$('goal-fields').innerHTML=modeFields[mode].goals.map(field).join('');
  $('current-title').textContent=mode==='plan'?'Ваш первый план':'Показатели за выбранный период';
  $('current-description').textContent=mode==='plan'?'Если продаж ещё не было, укажите плановые показатели. Калькулятор оценит возможную выручку, но не будет считать её потерянной.':mode==='simple'?'Укажите количество покупок, выручку и максимальную нагрузку. Первые и повторные покупки можно считать вместе.':'Введите количество обращений и покупок. Долю обращений, завершившихся первой покупкой, рассчитаем автоматически.';
  $('goals-title').textContent=mode==='plan'?'Что проверить перед запуском?':'Какой результат хотите проверить?';
  $('goals-description').textContent=mode==='plan'?'Покажем три сценария выполнения плана и предложим, как проверить спрос, затраты и возможность выполнить заказы.':'Вы сами задаёте цели для проверки. Любой из показателей можно оставить на текущем уровне.';
  $('keep-ticket').hidden=mode==='plan';$('data-source').disabled=mode==='plan';$('data-source').value=mode==='plan'?'estimate':'';
  updateNiche();
 }
 function remember(){snapshots[mode]=Object.fromEntries([...modeFields[mode].current,...modeFields[mode].goals].map(k=>[k,input(k)?.value||'']));}
 function switchMode(next){if(next===mode)return;remember();mode=next;renderFields();invalidate();clearErrors();}
 function showStep(next){
  step=next;clearErrors();for(const el of form.querySelectorAll('[data-step]'))el.hidden=Number(el.dataset.step)!==step;
  for(const el of document.querySelectorAll('[data-progress]')){if(Number(el.dataset.progress)===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}
  $('previous-step').hidden=step===1;$('next-step').hidden=step===3;$('calculate-button').hidden=step!==3;$('step-count').textContent=`Шаг ${step} из 3`;
  updateSendChoice();
  $('next-step').textContent=step===1?'К показателям →':'К целям и результату →';
  if(step===3&&mode==='simple'){const v=values();if(v.purchases>0)$('goals-description').textContent=`Текущий средний чек — ${money(v.revenue/v.purchases)}. Задайте свои цели или оставьте текущий чек. Сценарий не оценивает, насколько легко достичь этих целей.`;}
 }
 function validateCurrent(){
  const d=data(),errors=validateNumbers(d,modeFields[mode].current);
  if(Object.keys(errors).length)return errors;
  if(mode==='simple'&&d.purchases===0)errors.purchases='Продаж ещё нет. Выберите на первом шаге режим «Планирую новый бизнес».';
  if(mode==='simple'&&d.purchases>d.capacity)errors.capacity='Мощность должна включать уже совершённые покупки.';
  if(mode==='detailed'&&d.firstPurchases>d.leads)errors.firstPurchases='Первых покупателей не может быть больше обращений.';
  if(mode==='detailed'&&d.firstPurchases+d.repeat>d.capacity)errors.capacity='Количество текущих покупок превышает указанный максимум. Проверьте период и единицы измерения.';
  return errors;
 }
 $('next-step').addEventListener('click',()=>{if(busy)return;const errors=step===2?validateCurrent():Object.hasOwn(industryProfiles,$('industry').value)?{}:{industry:'Выберите нишу бизнеса.'};if(Object.keys(errors).length)return showErrors(errors);showStep(step+1);});
 $('previous-step').addEventListener('click',()=>{if(!busy)showStep(step-1);});
 $('period').addEventListener('change',()=>{snapshots={};renderFields();invalidate();$('demo-note').textContent='Период изменён. Введите показатели за новый период.';});
 $('industry').addEventListener('change',()=>{updateNiche();invalidate();});
 for(const radio of form.querySelectorAll('input[name="mode"]'))radio.addEventListener('change',()=>{if(radio.checked)switchMode(radio.value);});
 form.addEventListener('input',event=>{
  if(['contact-name','contact-value','contact-question'].includes(event.target.id))$('consent').checked=false;
  if(event.target.name&&[...modeFields[mode].current,...modeFields[mode].goals].includes(event.target.name)){invalidate();event.target.removeAttribute('aria-invalid');const err=$('err-'+event.target.name);if(err)err.textContent='';}
 });
 for(const id of ['focus','data-source'])$(id).addEventListener('change',invalidate);
 function updateSendChoice(){
  const send=$('send-result').checked;
  $('contact-fields').hidden=!send;
  $('calculate-button').textContent=send?'Рассчитать и отправить анкету →':'Рассчитать и получить план →';
  $('calculate-only').hidden=step!==3||!send;
 }
 $('send-result').addEventListener('change',()=>{updateSendChoice();$('consent').checked=false;});
 $('keep-ticket').addEventListener('click',()=>{const v=values(),ticket=mode==='simple'&&v.purchases>0?v.revenue/v.purchases:v.ticket;if(Number.isFinite(ticket)){input('targetTicket').value=String(ticket);invalidate();}});
 $('fill-demo').addEventListener('click',()=>{
  const demo=mode==='simple'?{purchases:300,revenue:300000,capacity:500,targetPurchases:450,targetTicket:1200}:mode==='detailed'?{leads:1000,firstPurchases:200,repeat:100,ticket:1000,capacity:500,targetFirstPurchases:300,targetRepeat:150,targetTicket:1200}:{plannedPurchases:100,plannedTicket:1200,capacity:100};
  for(const [k,v]of Object.entries(demo))input(k).value=String(v);$('data-source').value='estimate';invalidate();$('demo-note').textContent='Это вымышленные данные для знакомства с калькулятором. Замените их своими перед обсуждением бизнеса.';
 });
 function setBusy(value){busy=value;for(const fs of form.querySelectorAll('fieldset'))fs.disabled=value;for(const id of ['previous-step','next-step','calculate-button','calculate-only'])$(id).disabled=value;}
 function deliveryStatus(state,message){const el=$('delivery-status');if(!el)return;el.hidden=false;el.dataset.state=state;el.textContent=message;}
 async function checkDelivery(){
  if(!currentRequest)return;const request=currentRequest;$('check-delivery').disabled=true;
  try{const response=await deliveryClient.post('/api/status',{requestId:request.id,receipt:request.receipt},12000);const body=await response.json();if(currentRequest!==request)return;
   if(body.status==='sent'){deliveryStatus('sent','Расчёт доставлен Маргарите Ворониной. Повторно отправлять его не нужно.');$('check-delivery').hidden=true;}
   else deliveryStatus(body.status||'uncertain',body.message||'Подтверждения пока нет. Не отправляйте расчёт повторно; уточните получение в Telegram.');
  }catch{if(currentRequest===request)deliveryStatus('uncertain','Статус пока недоступен. Не отправляйте заново, пока не уточните получение в Telegram.');}
  finally{if($('check-delivery'))$('check-delivery').disabled=false;}
 }
 async function sendReport(report,contact){
  const question=$('contact-question').value.trim();
  const key=JSON.stringify([report.data,contact.name,contact.contact,question,campaign,delivery.consentVersion]);
  const request=lastDelivery?.key===key?lastDelivery:{id:uuid(),receipt:uuid(),key};lastDelivery=request;currentRequest=request;setBusy(true);deliveryStatus('pending','Отправляем расчёт Маргарите Ворониной…');
  try{
   const response=await deliveryClient.post('/api/submit',{requestId:request.id,receipt:request.receipt,calculation:report.data,name:contact.name,contact:contact.contact,question,source:campaign,consent:true,consentVersion:delivery.consentVersion,website:$('website').value});
   const body=await response.json();
   if(currentRequest!==request)return;
   if(response.status===409&&body.code==='CONSENT_REQUIRED'){
    $('consent').checked=false;lastDelivery=null;currentRequest=null;
    await refreshDelivery();
    deliveryStatus('failed','Условия обработки обновились. Расчёт сохранён на экране. Ознакомьтесь с документами у формы и заново подтвердите согласие, если хотите отправить анкету.');
    $('check-delivery').hidden=true;
   }
   else if(response.ok&&body.status==='sent'){deliveryStatus('sent','Расчёт и контактные данные доставлены Маргарите Ворониной. Она сможет связаться с вами и обсудить диагностику бизнеса.');$('check-delivery').hidden=true;}
   else{deliveryStatus(body.status||'failed',body.message||'Отправка не подтверждена. Сохраните расчёт и уточните получение в Telegram.');$('check-delivery').hidden=!['pending','uncertain'].includes(body.status);}
  }catch{if(currentRequest===request){deliveryStatus('uncertain','Не удалось подтвердить доставку. Расчёт остаётся на экране. Проверьте статус перед повторной отправкой.');$('check-delivery').hidden=false;}}
  finally{setBusy(false);}
 }
 async function copyReport(){
  if(!currentReport)return;const text=reportText(currentReport);
  try{if(!win.navigator?.clipboard?.writeText)throw new Error('clipboard');await win.navigator.clipboard.writeText(text);$('report-action-status').textContent='Расчёт скопирован. Его можно вставить в сообщение Маргарите Ворониной.';}
  catch{let area=$('copy-fallback');if(!area){area=document.createElement('textarea');area.id='copy-fallback';area.setAttribute('aria-label','Текст расчёта для копирования');area.style.cssText='width:100%;min-height:180px;margin:12px 0;padding:12px';$('report-action-status').after(area);}area.value=text;area.focus();area.select?.();$('report-action-status').textContent='Автоматическое копирование недоступно. Выделите и скопируйте текст ниже.';}
 }
 function downloadReport(){if(!currentReport)return;const blob=new Blob([reportDocument(currentReport)],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='raschet-vyruchki-voronina.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('report-action-status').textContent='Отчёт подготовлен для сохранения. Его можно открыть без интернета.';}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  // Enter on an earlier step advances its validation, not a hidden final form.
  if(step<3){$('next-step').click();return;}
  if(event.submitter?.id==='calculate-only'){$('send-result').checked=false;$('consent').checked=false;updateSendChoice();}
  const d=data(),report=createReport(d),errors={...report.errors};
  if(!['records','estimate'].includes(d.dataSource))errors.dataSource='Укажите, откуда взяты исходные показатели.';
  if(!$('confirm').checked)errors.confirm='Подтвердите, что все показатели относятся к одному периоду и каждая покупка учтена один раз.';
  let contact;
  if($('send-result').checked){contact=validateContact($('contact-name').value,$('contact-value').value);Object.assign(errors,contact.errors);if(!$('consent').checked)errors.consent='Для передачи расчёта необходимо ваше согласие.';if(!delivery.ready)errors.delivery='Отправка сейчас недоступна. Снимите отметку «Хочу обсудить расчёт с Маргаритой Ворониной», чтобы получить и сохранить отчёт без отправки.';}
  if(Object.keys(errors).length){const currentBad=modeFields[mode].current.some(k=>errors[k]);if(currentBad)showStep(2);showErrors(errors);return;}
  clearErrors();currentReport=report;currentRequest=null;$('results').innerHTML=renderReport(report);$('results').hidden=false;$('consultation').hidden=false;
  function setGoal(index) {
   report.goalIndex=index;
   const plan=goalPlan(report,index);
   $('goal-plan').innerHTML=goalMarkup(report);
   for(const button of $('results').querySelectorAll('[data-goal]')){
    const selected=Number(button.dataset.goal)===index;
    button.setAttribute('aria-pressed',String(selected));
    button.textContent=selected?'✓ Цель выбрана':'Выбрать цель';
   }
   $('consultation-context').textContent='Обсудим вашу цель — '+plan.target+' — и первый шаг «'+plan.actions[0].title+'».';
   $('consultation-link').href=plan.link;
  }
  for(const button of $('results').querySelectorAll('[data-goal]')){
   button.addEventListener('click',()=>setGoal(Number(button.dataset.goal)));
  }
  setGoal(0);
  $('copy-report').addEventListener('click',copyReport);$('download-report').addEventListener('click',downloadReport);$('print-report').addEventListener('click',()=>win.print?.());$('check-delivery').addEventListener('click',checkDelivery);
  $('edit-calculation').addEventListener('click',()=>{if(busy)return;invalidate();showStep(2);$('calculator').scrollIntoView?.({behavior:'smooth',block:'start'});});
  $('results').focus();$('results').scrollIntoView?.({behavior:win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  if($('send-result').checked)await sendReport(report,contact);
 });
 let printOpen=[];
 win.addEventListener?.('beforeprint',()=>{printOpen=[...$('results').querySelectorAll('details:not([open])')];printOpen.forEach(n=>n.open=true);});
 win.addEventListener?.('afterprint',()=>{printOpen.forEach(n=>n.open=false);printOpen=[];});
 async function refreshDelivery(){
  delivery=await deliveryClient.config();
  if(delivery.privacyUrl)for(const link of document.querySelectorAll('[data-privacy-link]'))link.href=delivery.privacyUrl;
  if(delivery.consentUrl)for(const link of document.querySelectorAll('[data-consent-link]'))link.href=delivery.consentUrl;
  $('send-result').disabled=!delivery.ready;
  $('delivery-availability').textContent=delivery.ready?'Отправка доступна. Вы сами выбираете, передавать ли результат для разбора.':'Автоматическая отправка пока недоступна. После расчёта можно сохранить отчёт или скопировать его для Telegram.';
 }
 const ready=refreshDelivery();
 renderFields();showStep(1);
 return {ready,get state(){return {step,mode,busy,report:currentReport,request:currentRequest};}};
}
if(typeof document!=='undefined'&&document.getElementById('calculator-form'))mountCalculator();

