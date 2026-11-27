import test from 'node:test';
import assert from 'node:assert/strict';
import {createReport} from './public_html/report.js';
import {goalPlan} from './public_html/goal-plan.js';

test('every selected scenario explains all positive growth contributions, including the first goal',()=>{
 const cases=[
  {mode:'simple',purchases:200,revenue:400000,capacity:250,targetPurchases:240,targetTicket:2200},
  {mode:'detailed',leads:1000,firstPurchases:200,repeat:100,ticket:2000,capacity:500,targetFirstPurchases:300,targetRepeat:150,targetTicket:2200},
  {mode:'detailed',leads:1000,firstPurchases:200,repeat:100,ticket:2000,capacity:400,targetFirstPurchases:300,targetRepeat:150,targetTicket:2200}
 ];
 for(const values of cases){
  const report=createReport({industry:'beauty',period:'month',dataSource:'estimate',focus:'auto',...values});
  for(let index=0;index<3;index++){
   const scenario=report.result.scenarios[index],actions=goalPlan(report,index).actions,keys=actions.map(a=>a.key);
   for(const [part,key]of ['conversion','repeat','ticket'].entries())if(scenario.parts[part]>0)assert.ok(keys.includes(key),`${values.mode} goal ${index}: missing ${key}`);
   if(scenario.capped)assert.equal(keys[0],'capacity');
   assert.equal(keys.length,new Set(keys).size);
  }
 }
});
