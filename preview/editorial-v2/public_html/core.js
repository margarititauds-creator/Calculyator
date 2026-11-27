import {industries} from './niches.js';
export {industries, industryGroups, industryProfiles, capacityLabels} from './niches.js';
export const periods={month:'месяц',quarter:'квартал',year:'год'};
export const modes={simple:'Знаю выручку и число покупок',detailed:'Знаю число обращений и продаж',plan:'Планирую новый бизнес'};
export const definitions={
 purchases:{label:'Сколько покупок совершили клиенты?',help:'Все оплаченные покупки за период, включая повторные. Считайте покупки, а не уникальных клиентов.',integer:true},
 revenue:{label:'Выручка за период, руб.',help:'Общая сумма оплат за указанные покупки. Во всех показателях используйте один и тот же способ учёта возвратов.'},
 leads:{label:'Сколько новых обращений вы обработали?',help:'Включите и тех, кто купил впервые, и тех, кто не купил. Повторные сообщения одного человека не считайте новыми обращениями.',integer:true},
 firstPurchases:{label:'Сколько обратившихся купили впервые?',help:'Укажите число первых покупателей среди людей, чьи обращения вы посчитали выше. В модели на одно обращение приходится не более одной первой покупки.',integer:true},
 repeat:{label:'Сколько повторных покупок совершили клиенты?',help:'Отдельные оплаченные покупки. Первые покупки из предыдущего поля сюда не включайте.',integer:true},
 ticket:{label:'Средний чек, руб.',help:'Выручка за период ÷ количество всех покупок. Например, 100 000 руб. ÷ 50 покупок = 2 000 руб.'},
 capacity:{label:'Максимальное число покупок за период',help:'Укажите общий предел за тот же период, включая уже совершённые покупки. Учтите рабочее время, команду, места и запасы. Не закладывайте нагрузку, при которой снизится качество.',integer:true},
 targetPurchases:{label:'Целевое число покупок за период',help:'Ваша цель за такой же период. Калькулятор отдельно покажет, если мощности для неё недостаточно.',integer:true},
 targetFirstPurchases:{label:'Целевое число первых покупок',help:'Цель для того же количества обращений. Увеличение потока обращений в этом сценарии не учитывается.',integer:true},
 targetRepeat:{label:'Сколько повторных покупок планируете?',help:'Учитывайте реальный цикл возвращения клиента. Это ваша гипотеза, а не норматив для ниши.',integer:true},
 targetTicket:{label:'Целевой средний чек, руб.',help:'Можно оставить текущий средний чек. Изменение цены или набора товаров и услуг нужно оценивать с учётом затрат и спроса.'},
 plannedPurchases:{label:'Сколько покупок планируете?',help:'План за выбранный период. Это предположение, которое ещё нужно проверить реальными заказами.',integer:true},
 plannedTicket:{label:'Плановый средний чек, руб.',help:'Ожидаемая средняя оплата за заказ, услугу или пакет. Если цена ещё неизвестна, сначала проверьте предложение.'}
};
export const modeFields={simple:{current:['purchases','revenue','capacity'],goals:['targetPurchases','targetTicket']},detailed:{current:['leads','firstPurchases','repeat','ticket','capacity'],goals:['targetFirstPurchases','targetRepeat','targetTicket']},plan:{current:['plannedPurchases','plannedTicket','capacity'],goals:[]}};
export const factors=[.25,.5,1];
const tolerance=(a,b)=>Number.EPSILON*8*Math.max(1,Math.abs(a),Math.abs(b));
export const greater=(a,b)=>a-b>tolerance(a,b);
const safeCount=n=>Math.abs(n-Math.round(n))<=tolerance(n,Math.round(n))?Math.round(n):n;
export function validateNumbers(d,keys){
 const errors={};
 for(const k of keys){const n=d[k];
  if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e12){errors[k]='Введите число от 0 до 1 трлн. Если показатель неизвестен, выберите другой способ расчёта.';continue;}
  if(definitions[k]?.integer&&!Number.isInteger(n))errors[k]='Укажите целое число.';
 }return errors;
}
function contextErrors(d){const errors={};if(!Object.hasOwn(industries,d.industry))errors.industry='Выберите нишу бизнеса.';if(!Object.hasOwn(periods,d.period))errors.period='Выберите один период для всех данных.';return errors;}
function tooLarge(d,baseline){return !Number.isFinite(baseline)||baseline>Number.MAX_SAFE_INTEGER||d.capacity*(d.targetTicket??d.plannedTicket)>Number.MAX_SAFE_INTEGER;}
function result(mode,current,purchases,ticket,scenarios){return {errors:{},mode,current,purchases,ticket,scenarios};}
export function calculateSimple(d){
 const errors={...contextErrors(d),...validateNumbers(d,[...modeFields.simple.current,...modeFields.simple.goals])};
 if(Object.keys(errors).length)return {errors};
 if(!d.purchases)errors.purchases='Без покупок средний чек неизвестен. Выберите «Планирую новый бизнес».';
 if(d.purchases>d.capacity)errors.capacity='Максимум должен включать уже совершённые покупки за этот период.';
 if(d.targetPurchases<d.purchases)errors.targetPurchases='Для сценария роста цель должна быть не ниже текущего количества.';
 const ticket=d.purchases?d.revenue/d.purchases:0;
 if(greater(ticket,d.targetTicket))errors.targetTicket='Целевой чек ниже текущего. Оставьте текущий чек или задайте цель выше.';
 if(tooLarge(d,d.revenue))errors.targetTicket='Суммы слишком велики для точного расчёта.';
 if(Object.keys(errors).length)return {errors};
 const targetTicket=greater(d.targetTicket,ticket)?d.targetTicket:ticket;
 const scenarios=factors.map(factor=>{
  const wanted=d.purchases+(d.targetPurchases-d.purchases)*factor;
  const purchases=Math.min(d.capacity,wanted),newTicket=ticket+(targetTicket-ticket)*factor;
  const parts=[(purchases-d.purchases)*ticket,0,purchases*(newTicket-ticket)],delta=parts.reduce((a,b)=>a+b,0);
  return {factor,purchases,ticket:newTicket,revenue:d.revenue+delta,delta,parts,capped:greater(wanted,d.capacity)};
 });return result('simple',d.revenue,d.purchases,ticket,scenarios);
}
function projectDetailed(d,first,targetFirst){
 // Values differing only by floating-point noise describe an unchanged goal.
 targetFirst=greater(targetFirst,first)?targetFirst:first;
 const targetRepeat=greater(d.targetRepeat,d.repeat)?d.targetRepeat:d.repeat;
 const targetTicket=greater(d.targetTicket,d.ticket)?d.targetTicket:d.ticket;
 const purchases=safeCount(first+d.repeat);
 if(greater(purchases,d.capacity))return {errors:{capacity:'Количество текущих покупок превышает указанный максимум. Проверьте единицы измерения и период.'}};
 const current=purchases*d.ticket;
 if(tooLarge(d,current))return {errors:{targetTicket:'Суммы слишком велики для точного расчёта.'}};
 const scenarios=factors.map(factor=>{
  const projectedFirst=first+(targetFirst-first)*factor,repeat=d.repeat+(targetRepeat-d.repeat)*factor,ticket=d.ticket+(targetTicket-d.ticket)*factor;
  const afterFirst=Math.min(d.capacity,Math.max(purchases,safeCount(projectedFirst+d.repeat)));
  const wanted=safeCount(projectedFirst+repeat),total=Math.min(d.capacity,Math.max(afterFirst,wanted));
  const parts=[Math.max(0,afterFirst-purchases)*d.ticket,Math.max(0,total-afterFirst)*d.ticket,total*(ticket-d.ticket)],delta=parts.reduce((a,b)=>a+b,0);
  return {factor,conversion:d.leads?projectedFirst/d.leads*100:0,repeat,purchases:total,ticket,revenue:current+delta,delta,parts,capped:greater(wanted,d.capacity)};
 });return result('detailed',current,purchases,d.ticket,scenarios);
}
export function calculateFromCounts(d){
 const errors={...contextErrors(d),...validateNumbers(d,[...modeFields.detailed.current,...modeFields.detailed.goals])};
 if(Object.keys(errors).length)return {errors};
 if(d.firstPurchases>d.leads)errors.firstPurchases='Первых покупателей не может быть больше обработанных обращений.';
 if(d.targetFirstPurchases>d.leads)errors.targetFirstPurchases='Поток обращений здесь неизменен. Цель не может превышать число обращений.';
 for(const [a,b] of [['firstPurchases','targetFirstPurchases'],['repeat','targetRepeat'],['ticket','targetTicket']])if(greater(d[a],d[b]))errors[b]='Цель роста должна быть не ниже текущего значения.';
 if(Object.keys(errors).length)return {errors};
 return projectDetailed(d,d.firstPurchases,d.targetFirstPurchases);
}
export function calculatePlan(d){
 const errors={...contextErrors(d),...validateNumbers(d,modeFields.plan.current)};
 if(Object.keys(errors).length)return {errors};
 if(tooLarge(d,0))return {errors:{plannedTicket:'Суммы слишком велики для точного расчёта.'}};
 const scenarios=factors.map(factor=>{const wanted=d.plannedPurchases*factor,purchases=Math.min(d.capacity,wanted);return {factor,purchases,ticket:d.plannedTicket,revenue:purchases*d.plannedTicket,delta:null,parts:[],capped:greater(wanted,d.capacity)};});
 return result('plan',null,null,d.plannedTicket,scenarios);
}
export function calculateModel(d){if(d.mode==='simple')return calculateSimple(d);if(d.mode==='detailed')return calculateFromCounts(d);if(d.mode==='plan')return calculatePlan(d);return {errors:{mode:'Выберите подходящий способ расчёта.'}};}
// Compatibility with previously published percentage inputs; the new UI accepts counts.
export const fields={leads:'Обработанные обращения',conversion:'Конверсия, %',repeat:'Повторные покупки',ticket:'Средний чек',capacity:'Мощность',targetConversion:'Целевая конверсия',targetRepeat:'Целевые повторные покупки',targetTicket:'Целевой чек'};
export function calculate(d){
 const errors={...contextErrors(d),...validateNumbers(d,Object.keys(fields))};
 for(const k of ['conversion','targetConversion'])if(typeof d[k]==='number'&&d[k]>100)errors[k]='Процент не может превышать 100.';
 for(const [a,b] of [['conversion','targetConversion'],['repeat','targetRepeat'],['ticket','targetTicket']])if(greater(d[a],d[b]))errors[b]='Цель должна быть не ниже текущего значения.';
 if(Object.keys(errors).length)return {errors};
 return projectDetailed(d,safeCount(d.leads*d.conversion/100),safeCount(d.leads*d.targetConversion/100));
}

