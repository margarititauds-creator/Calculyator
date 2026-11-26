import {adviceProfiles} from './advice-catalog.js';
import {industries, periods} from './core.js';
import {escapeHTML as e, money, purchaseCount} from './utils.js';
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
  const actions = [...new Set(keys)].slice(0,index + 1).map(key => ({
    title: tools[key][0], tool: tools[key][1], instruction: tools[key][2], ...profile[key]
  }));
  const target = money(scenario.revenue) + ' за ' + periods[data.period];
  const volume = purchaseCount(scenario.purchases) + ' × ' + money(scenario.ticket);
  const scope = data.capacity === 0 ? 'Определите, сколько заказов сможете выполнить, и пересчитайте цель.'
    : scenario.delta === 0 ? 'Выбранные показатели дают текущую выручку. Уточните цель или проверьте ограничение мощности, затем повторите расчёт.'
    : scopes[index];
  const draft = 'Маргарита, добрый день! Хочу записаться на консультацию. Моя ниша — ' + industries[data.industry] +
    '. Выбранная цель — ' + target + ' (' + volume + '). Первый шаг — «' + actions[0].title + '». Когда удобно обсудить?';
  return {target, volume, scope, actions, link: BRAND.contact + '?text=' + encodeURIComponent(draft)};
}
export function goalMarkup(report) {
  const plan = goalPlan(report, report.goalIndex);
  return `<header class="goal-heading"><p class="eyebrow">ПЛАН ДЛЯ ВАШЕЙ НИШИ</p><h3>${e(plan.target)}</h3><p>${e(plan.volume)} · ${e(industries[report.data.industry])}</p></header>
  <p class="goal-scope">${e(plan.scope)}</p><div class="goal-steps">${plan.actions.map((action,i) => `<article><span class="step-medal">${i+1}</span><div><h4>${e(action.title)}</h4><p>${e(action.action)}</p><p><strong>${e(action.tool)}.</strong> ${e(action.instruction)}</p><details><summary>Что измерить и когда</summary><p>${e(action.metric)}</p><p>${e(action.review)}</p></details></div></article>`).join('')}</div>`;
}
export function goalText(report) {
  const plan = goalPlan(report,report.goalIndex);
  return [goalNames[report.goalIndex ?? 0] + ' цель · ' + plan.target,plan.volume,plan.scope,
    ...plan.actions.flatMap(action => [action.title,action.action,action.tool + '. ' + action.instruction,action.metric,action.review])].join('\n');
}
