export function validateContact(name,contact){
 const errors={},n=String(name??'').trim(),c=String(contact??'').trim();
 if(!/^[\p{L}\p{M} .’'-]{2,80}$/u.test(n))errors.contactName='Укажите имя буквами: от 2 до 80 символов.';
 const telegram=/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(c)||/^https:\/\/t\.me\/[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(c);
 const phone=/^[+\d ()-]{10,25}$/.test(c)&&/^\+[1-9]\d{9,14}$/.test(c.replace(/[ ()-]/g,''));
 if(c.length>160||(!telegram&&!phone))errors.contactValue='Укажите @username Telegram или телефон с + и кодом страны.';
 return {errors,name:n,contact:c};
}
