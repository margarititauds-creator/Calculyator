import {adviceProfiles} from './advice-catalog.js';
import {industries, periods} from './core.js';
import {escapeHTML as e, money, purchaseCount, number} from './utils.js';
import {BRAND} from './config.js';

export const goalNames = ['Минимальная', 'Средняя', 'Максимальная'];
const levers = ['conversion', 'repeat', 'ticket'];
const tools = {
  conversion: ['Разберите путь к оплате', 'Таблица обращений', 'Запишите источник, запрос, следующий шаг и итог каждого обращения.'],
  repeat: ['Найдите повод вернуться', 'Календарь повторных покупок', 'Отметьте дату последней оплаты, уместный срок следующего контакта и факт повторной покупки.'],
  ticket: ['Проверьте состав покупки', 'Карта предложения', 'Сопоставьте варианты покупки, пользу для клиента, цену и прямые расходы.'],
  capacity: ['Проверьте доступную загрузку', 'Календарь мощности', 'По дням отметьте доступный объём, принятые заказы и остаток.'],
  launch: ['Проверьте спрос на предложение', 'Журнал первых продаж', 'Запишите запрос, предложенную цену, факт оплаты и затраты на выполнение.']
};
const scopes = [
  'Начните с одного предложения и одной группы клиентов. Запишите исходный показатель и проверьте одно изменение за цикл покупки.',
  'Проведите пилот на одной группе клиентов. Сравните результат с похожим периодом и перенесите удачный приём на вторую группу.',
  'Сначала проверьте изменение на одной группе. Перед расширением рассчитайте нагрузку, расходы и назначьте ответственного за каждый этап.'
];
export function goalPlan(report, index = 0) {
  const {data, result} = report;
  const scenario = result.scenarios[index];
  const profile = adviceProfiles[data.industry] || adviceProfiles.other;
  const ranked = levers.map((key, i) => ({key, value: scenario.parts[i] || 0}))
    .filter(item => item.value > 0).sort((a,b) => b.value - a.value).map(item => item.key);
  const keys = [];
  if (scenario.capped || data.capacity === 0) keys.push('capacity');
  if (data.mode === 'plan' || !result.purchases) keys.push('launch');
  if (Object.hasOwn(tools,data.focus) && data.focus !== 'launch') keys.push(data.focus);
  keys.push(...ranked);
  if (!keys.length) keys.push(data.capacity === result.purchases ? 'capacity' : 'conversion');
  const actions = [...new Set(keys)].map(key => ({
    key, title: tools[key][0], tool: tools[key][1], instruction: tools[key][2], ...profile[key]
  }));
  if(data.industry==='beauty') for(const action of actions){
    if(action.key==='conversion') Object.assign(action,{title:'Заполнить свободные окна',action:'Завтра откройте расписание на ближайшие две недели. Выберите свободные окна и проверьте незавершённые обращения: кому не подошло время, кто уточнял услугу, но не записался. Предложите подходящее время тем, кто согласен на связь.',tool:'План администратора',instruction:'Отмечайте предложение, запись и состоявшийся оплаченный визит отдельно.'});
    if(action.key==='ticket') Object.assign(action,{title:'Предложить полезное дополнение',action:'Завтра выберите одну услугу и дополнение, которое действительно нужно её клиенту. Посчитайте материалы и время мастера. Подготовьте понятное предложение с ценой и проверьте его на одной группе клиентов.',tool:'Карта предложения',instruction:'Сравните средний чек и расходы. Прибавка к чеку — средняя по всем визитам, а не обязательная доплата каждого клиента.'});
  }
  const question = actions[0].key==='capacity'?'Как выполнить план при моей загрузке?':actions[0].key==='ticket'?'Как увеличить чек и сохранить пользу для клиента?':data.industry==='beauty'?'Как получить дополнительные оплаченные визиты?':'С какого действия начать в моём бизнесе?';
  const target = money(scenario.revenue) + ' ' + ({month:'в месяц',quarter:'за квартал',year:'за год'}[data.period]);
  const volume = units(scenario.purchases,data.industry) + ' × ' + money(scenario.ticket);
  const scope = data.capacity === 0 ? 'Определите, сколько заказов сможете выполнить, и пересчитайте цель.'
    : scenario.delta === 0 ? 'Выбранные показатели дают текущую выручку. Уточните цель или проверьте ограничение мощности, затем повторите расчёт.'
    : scopes[index];
  const draft = 'Маргарита, добрый день! Хочу записаться на консультацию. Моя ниша — ' + industries[data.industry] +
    '. Выбранная цель — ' + target + ' (' + volume + '). Первый шаг — «' + actions[0].title + '». Когда удобно обсудить?';
  return {target, volume, scope, actions, question, link: BRAND.contact + '?text=' + encodeURIComponent(draft)};
}
function units(n,industry){
  if(industry!=='beauty')return purchaseCount(n);
  const form=new Intl.PluralRules('ru-RU',{maximumFractionDigits:2}).select(n);
  return number(n)+' '+({one:'визит',few:'визита',many:'визитов',other:'визита'}[form]);
}
export function goalMarkup(report) {
  const plan=goalPlan(report,report.goalIndex),{data:d,result:r}=report,s=r.scenarios[report.goalIndex??0],isPlan=d.mode==='plan';
  const when={month:'в месяц',quarter:'за квартал',year:'за год'}[d.period];
  const volumeDelta=s.purchases-r.purchases,ticketDelta=s.ticket-r.ticket;
  return `<div class="plan-spread"><header class="goal-heading ${number(s.revenue).length>8?'long-amount':''}" style="--amount-length:${number(s.revenue).length}"><p class="eyebrow">ВАШ ПЛАН · ${e(industries[d.industry])}</p><h3 aria-label="${e(plan.target)}"><span>${number(s.revenue)}</span> <small>руб. ${when}</small></h3><p class="plan-deck">${isPlan?'От идеи — к первым оплаченным покупкам.':'Рост складывается<br>из конкретных изменений.'}</p><div class="plan-delta">${isPlan?'План нового бизнеса':`+${money(s.delta)} к текущей выручке`}</div><p class="plan-caveat">${isPlan?'План зависит от спроса и вашей мощности.':'Сценарий по вашим данным. Это выручка, не прибыль и не обещание результата.'}</p></header><div class="plan-math"><p class="eyebrow">ЧТО ДОЛЖНО ИЗМЕНИТЬСЯ</p>${!isPlan?`<div class="lever ${number(volumeDelta).length>6?'long-value':''}" style="--value-length:${number(volumeDelta).length+1}"><strong>+${number(volumeDelta)}</strong><span>${e(units(volumeDelta,d.industry).replace(number(volumeDelta)+' ',''))}<small>за тот же период</small></span></div><div class="lever ${number(ticketDelta).length>6?'long-value':''}" style="--value-length:${number(ticketDelta).length+1}"><strong>+${number(ticketDelta)}</strong><span>руб. к чеку<small>в среднем на покупку</small></span></div>`:`<div class="lever ${number(s.purchases).length>6?'long-value':''}" style="--value-length:${number(s.purchases).length+0}"><strong>${number(s.purchases)}</strong><span>покупок<small>по ${money(s.ticket)}</small></span></div>`}<div class="equations">${!isPlan?`<p><span>СЕЙЧАС</span>${e(units(r.purchases,d.industry))} × ${money(r.ticket)}<b>= ${money(r.current)}</b></p>`:''}<p><span>ВЫБРАННЫЙ СЦЕНАРИЙ</span>${e(units(s.purchases,d.industry))} × ${money(s.ticket)}<b>= ${money(s.revenue)}</b></p></div>${s.capped?'<p class="capacity-flag">Цель ограничена указанной мощностью</p>':''}</div></div>
  <div class="plan-work"><div class="work-heading"><p class="eyebrow">С ЧЕГО НАЧАТЬ ЗАВТРА</p><p>${e(plan.scope)}</p></div><div class="goal-steps">${plan.actions.map((action,i)=>`<article><div class="step-marker">${i+1}</div><div><h4>${e(action.title)}</h4><p>${e(action.action)}</p><p class="action-tool"><strong>${e(action.tool)}.</strong> ${e(action.instruction)}</p><details><summary>Как проверить результат</summary><p>${e(action.metric)}</p><p>${e(action.review)}</p></details></div></article>`).join('')}</div><div class="review-line"><strong>Через 7 дней</strong><span>Проверьте, что сделали и какие цифры записали. Эффект оценивайте после полного цикла покупки.</span></div></div>`;
}
export function goalText(report) {
  const plan = goalPlan(report,report.goalIndex);
  return [goalNames[report.goalIndex ?? 0] + ' цель · ' + plan.target,plan.volume,plan.scope,
    ...plan.actions.flatMap(action => [action.title,action.action,action.tool + '. ' + action.instruction,action.metric,action.review])].join('\n');
}



