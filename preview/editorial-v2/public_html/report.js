import {reportTheme} from './report-theme.js';
import {industries,periods,modes,modeFields,definitions,calculateModel} from './core.js';
import {buildRecommendations,sources} from './recommendations.js';
import {escapeHTML as e,money,number,purchaseCount} from './utils.js';
import {goalNames, goalMarkup, goalText, goalPlan} from './goal-plan.js';
import {BRAND} from './config.js';
export function createReport(data){
 const result=calculateModel(data);
 if(Object.keys(result.errors).length)return {errors:result.errors};
 return {errors:{},data,result,advice:buildRecommendations(data,result)};
}
function labels(d){return d.mode==='simple'?['Количество покупок','Средний чек']:['Первые покупки','Повторные покупки','Средний чек'];}
function contributions(d,s){return d.mode==='simple'?[s.parts[0],s.parts[2]]:s.parts;}
export function renderReport(report,{controls=true}={}){
 const {data:d,result:r,advice:a}=report,top=r.scenarios.at(-1),isPlan=d.mode==='plan';
 const max=Math.max(1,...r.scenarios.map(s=>s.revenue));
 const amount=isPlan?top.revenue:r.current;
 return `<div class="results-heading"><div><p class="eyebrow">ВАШ РАСЧЁТ И ПЕРВЫЕ ДЕЙСТВИЯ</p><h2 id="results-title">${isPlan?'Проверим план до масштабирования':'Какой будет следующая сумма?'}</h2><p>${e(industries[d.industry])} · период: ${e(periods[d.period])} · ${e(modes[d.mode])}</p></div>${controls?'<button type="button" class="text-button" id="edit-calculation">Изменить данные</button>':''}</div>
 <p class="print-only">${BRAND.name} · ${BRAND.role} · ${BRAND.contact}</p>
 <div class="result-baseline"><p>${isPlan?'ВЫРУЧКА ПРИ ВЫПОЛНЕНИИ ПЛАНА С УЧЁТОМ МОЩНОСТИ':'ТЕКУЩАЯ ВЫРУЧКА ПО ВВЕДЁННЫМ ДАННЫМ'}</p><div class="big">${money(amount)}</div><p>${isPlan?'Это плановая выручка, а не оценка упущенных денег.':`${purchaseCount(r.purchases)} · средний чек ${money(r.ticket)}`}</p>${!isPlan?`<p class="growth">Изменение в сценариях: +${money(r.scenarios[0].delta)} — +${money(top.delta)}</p>`:''}</div>
 <p class="summary-note">${isPlan?'Сравниваем выполнение плана покупок на 25 %, 50 % и 100 %.':'Сравниваем выручку при прохождении 25 %, 50 % и 100 % пути от текущих показателей к вашим целям.'} Это условные сценарии, не вероятность успеха и не отраслевой прогноз. Выручка не равна прибыли.</p>
 <h3 class="choose-title">Какую сумму берём за цель?</h3><div class="scenario-grid">${r.scenarios.map((s,i)=>`<article class="scenario"><h3>${goalNames[i]} цель</h3><small>${s.factor*100}% ${isPlan?'плана покупок':'пути к цели'}</small><div class="scenario-amount">${money(s.revenue)}</div><div class="scenario-bar" aria-hidden="true"><span style="width:${s.revenue/max*100}%"></span></div>${!isPlan?`<p class="delta">+${money(s.delta)} к текущей выручке</p>`:''}<p>${purchaseCount(s.purchases)} × ${money(s.ticket)}</p>${s.capped?'<span class="capacity-flag">Ограничено мощностью</span>':''}${!isPlan?`<details><summary>Из чего складывается прирост</summary>${labels(d).map((label,i)=>`<p>${label}: +${money(contributions(d,s)[i])}</p>`).join('')}<p>Вклады зависят от порядка расчёта. Денежные суммы округлены.</p></details>`:''}${controls?`<button type="button" class="pick-goal" data-goal="${i}" aria-pressed="${i===(report.goalIndex??0)}">${i===(report.goalIndex??0)?'✓ Цель выбрана':'Выбрать цель'}</button>`:''}</article>`).join('')}</div>
 <section id="goal-plan" aria-label="План выбранной цели" aria-live="polite">${goalMarkup(report)}</section>
 ${controls?'<a class="button primary plan-cta" href="#consultation">Обсудить этот план с Маргаритой</a>':''}
 <details class="all-advice"><summary>Посмотреть диагностику по всем сценариям</summary>
 <section class="diagnosis" aria-label="Что видно по данным"><h3>${e(a.headline)}</h3><p>${e(a.summary)}</p><div class="signals">${a.signals.map(x=>`<span class="signal">${e(x)}</span>`).join('')}</div>${a.notes.map(x=>`<p class="field-hint">${e(x)}</p>`).join('')}</section>
 <div class="action-grid">${a.cards.map((c,i)=>`<article class="action-card"><span class="action-number">ДЕЙСТВИЕ ${i+1}</span><h3>${e(c.title)}</h3><p class="reason"><strong>Почему сейчас:</strong> ${e(c.reason)}</p><p><strong>Что сделать:</strong> ${e(c.action)}</p><p><strong>Зачем:</strong> ${e(c.why)}</p><dl><div><dt>Как проверить</dt><dd>${e(c.metric)}</dd></div><div><dt>Когда вернуться к результату</dt><dd>${e(c.review)}</dd></div></dl><a class="source-link" href="${e(sources[c.sources[0]].url)}" target="_blank" rel="noopener noreferrer">Основа рекомендации: ${e(sources[c.sources[0]].title.split(' — ')[0])}</a></article>`).join('')}</div>
 <p class="summary-note">Запишите одно действие, ответственного и показатель до изменения. В контрольную дату решите: продолжить действие, скорректировать его или остановить. Советы — рабочие гипотезы; результат зависит от исполнения и условий бизнеса.</p>
 </details><details class="input-summary"><summary>Исходные данные и ограничения</summary><dl>${[...modeFields[d.mode].current,...modeFields[d.mode].goals].map(k=>`<dt>${e(definitions[k].label)}</dt><dd>${number(d[k])}${/revenue|ticket/i.test(k)?' руб.':''}</dd>`).join('')}</dl><p>Источник: ${d.dataSource==='estimate'?'приблизительная оценка':'данные учёта, по словам пользователя'}. ${isPlan?'Плановые значения — предположения.':'Документы не проверялись.'} Прибыль и окупаемость без расходов не рассчитаны. ${d.mode==='detailed'?'Количество обращений во всех сценариях одинаково. На одно обращение приходится не более одной первой покупки.':''} Влияние цены на спрос и сезонность не моделируются.</p></details>
 ${controls?'<div class="result-actions"><button type="button" class="button secondary" id="copy-report">Скопировать расчёт</button><button type="button" class="button secondary" id="download-report">Сохранить отчёт</button><button type="button" class="button secondary" id="print-report">Печать / PDF</button><a class="button primary" href="#consultation">Обсудить результат</a></div><p id="report-action-status" class="status-message" role="status"></p><div id="delivery-status" class="delivery-status" role="status" hidden></div><button id="check-delivery" type="button" class="text-button" hidden>Проверить статус отправки</button>':''}`;
}
export function reportText(report){
 const {data:d,result:r,advice:a}=report;
 return [`Расчёт выручки · ${BRAND.name}`,`${industries[d.industry]} · ${periods[d.period]} · ${modes[d.mode]}`,
 r.current===null?'План нового бизнеса: текущая выручка и потери не оцениваются.':`Текущая выручка: ${money(r.current)}; покупки: ${number(r.purchases)}; средний чек: ${money(r.ticket)}.`,
 ...r.scenarios.map(s=>`${s.factor*100}% ${d.mode==='plan'?'плана':'пути к цели'}: ${money(s.revenue)}${s.delta===null?'':`; прирост ${money(s.delta)}`}; ${purchaseCount(s.purchases)} по ${money(s.ticket)}${s.capped?'; ограничено мощностью':''}.`),
 '',goalText(report),'',a.headline,a.summary,...a.notes,'',
 ...a.cards.flatMap((c,i)=>[`${i+1}. ${c.title}`,`Почему сейчас: ${c.reason}`,`Действие: ${c.action}`,`Причина: ${c.why}`,`Проверка: ${c.metric}`,`Первая контрольная точка: ${c.review}`,`Основа: ${c.sources.map(id=>sources[id].url).join(' ')}`,'']),
 'Исходные данные:',...[...modeFields[d.mode].current,...modeFields[d.mode].goals].map(k=>`${definitions[k].label.replace(/\?$/,'')}: ${number(d[k])}`),
 `Источник: ${d.dataSource==='estimate'?'оценка':'учёт со слов пользователя'}. Документы не проверялись.`,
 'Сценарии и рекомендации не гарантируют результат. Выручка не равна прибыли. Сроки — проверка действий, не обещание роста.',
 `Обсудить: ${BRAND.contact}`].join('\n').replace(/руб\.\./g,'руб.');
}
export function reportDocument(report){return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Расчёт выручки — ${BRAND.name}</title><style>${reportTheme}</style></head><body>${renderReport(report,{controls:false})}<p class="report-contact">${BRAND.name} · ${BRAND.role} · <a href="${goalPlan(report,report.goalIndex??0).link}">Обсудить выбранный план</a></p></body></html>`;}


