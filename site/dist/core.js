export const industries = {education:'Услуги и образование', beauty:'Красота и здоровье', retail:'Розница', food:'Общепит'};
export const capacityLabels = {education:'Доступные посещения / занятия', beauty:'Доступные записи к специалистам', retail:'Максимум заказов к исполнению', food:'Максимум чеков с учётом оборота столов'};
export const fields = {leads:'Обработанные обращения', conversion:'Конверсия в первую покупку, %', repeat:'Повторные покупки', ticket:'Средний чек, ₽', capacity:'Максимум покупок за период', targetConversion:'Целевая конверсия, %', targetRepeat:'Целевые повторные покупки', targetTicket:'Целевой средний чек, ₽'};
export function calculate(d) {
 const errors = {};
 if (!industries[d.industry]) errors.industry='Выберите отрасль';
 if (!['month','quarter','year'].includes(d.period)) errors.period='Выберите единый период';
 for (const k of Object.keys(fields)) if (typeof d[k]!=='number' || !Number.isFinite(d[k]) || d[k]<0 || d[k]>1e12) errors[k]='Введите число от 0 до 1 трлн';
 for (const k of ['conversion','targetConversion']) if(d[k]>100) errors[k]='Процент не может превышать 100';
 for (const k of ['leads','repeat','capacity','targetRepeat']) if(!Number.isInteger(d[k])) errors[k]='Введите целое количество';
 for (const [a,b] of [['conversion','targetConversion'],['repeat','targetRepeat'],['ticket','targetTicket']]) if(d[b]<d[a]) errors[b]='Цель роста должна быть не ниже текущего значения';
 if(Object.keys(errors).length) return {errors};
 const first=d.leads*d.conversion/100, purchases=first+d.repeat;
 if(purchases>d.capacity) return {errors:{capacity:'Мощность меньше текущего количества покупок. Проверьте период и данные.'}};
 const current=purchases*d.ticket;
 if(current>Number.MAX_SAFE_INTEGER || d.capacity*d.targetTicket>Number.MAX_SAFE_INTEGER) return {errors:{ticket:'Слишком большие денежные значения для точного расчёта'}};
 const scenarios=[['Консервативный',.25],['Базовый',.5],['Оптимистичный',1]].map(([name,factor])=>{
  const conversion=d.conversion+(d.targetConversion-d.conversion)*factor;
  const repeat=d.repeat+(d.targetRepeat-d.repeat)*factor;
  const ticket=d.ticket+(d.targetTicket-d.ticket)*factor;
  const afterConversion=Math.min(d.capacity,d.leads*conversion/100+d.repeat);
  const totalPurchases=Math.min(d.capacity,d.leads*conversion/100+repeat);
  const parts=[(afterConversion-purchases)*d.ticket,(totalPurchases-afterConversion)*d.ticket,totalPurchases*(ticket-d.ticket)];
  const revenue=totalPurchases*ticket;
  return {name,factor,conversion,repeat,ticket,purchases:totalPurchases,revenue,delta:revenue-current,parts,capped:d.leads*conversion/100+repeat>d.capacity};
 });
 return {errors:{},current,purchases,scenarios};
}
