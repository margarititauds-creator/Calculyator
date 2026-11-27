export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const number=value=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Object.is(value,-0)?0:value);
const countRules=new Intl.PluralRules('ru-RU',{maximumFractionDigits:2});
function countPhrase(value,forms){return `${number(value)} ${forms[countRules.select(value)]}`;}
export const purchaseCount=(value,{accusative=false}={})=>countPhrase(value,{one:accusative?'покупку':'покупка',few:'покупки',many:'покупок',other:'покупки'});
export const enquiryCount=value=>countPhrase(value,{one:'обращение',few:'обращения',many:'обращений',other:'обращения'});
export const money=value=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Object.is(value,-0)?0:value).replace('₽','руб.');
export const preciseMoney=value=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',minimumFractionDigits:2,maximumFractionDigits:2}).format(value).replace('₽','руб.');
export function parseNumber(value){
 const text=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
 if(!text)return null;
 if(!/^\d+(?:\.\d+)?$/.test(text))return NaN;
 return Number(text);
}
