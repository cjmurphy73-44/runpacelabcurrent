/** Hypothetical AUD monthly forecast. No live billing or customer data. */
const valid=(x,k,min=0,max=Infinity)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw new RangeError(k+' out of range');return x};
const cents=(x,k)=>{if(!Number.isFinite(x)||Math.abs(x)>Number.MAX_SAFE_INTEGER/100)throw new RangeError(k+' exceeds safe AUD cent precision');return Math.round((x+Number.EPSILON)*100)/100};
export function forecastScenario({startingCash,openingCustomers,pricePerCustomer,monthlyAcquisition,monthlyChurnRate,variableCostPerCustomer,fixedMonthlyCost,acquisitionCostPerCustomer,months=12}){
 for(const [k,v] of Object.entries({startingCash,openingCustomers,pricePerCustomer,monthlyAcquisition,monthlyChurnRate,variableCostPerCustomer,fixedMonthlyCost,acquisitionCostPerCustomer}))valid(v,k,0,k==='monthlyChurnRate'?1:Infinity);
 valid(months,'months',1,60);
 if(!Number.isSafeInteger(months)||!Number.isSafeInteger(openingCustomers)||!Number.isSafeInteger(monthlyAcquisition))throw new RangeError('customer counts and months must be safe integers');
 let customers=openingCustomers,cash=cents(startingCash,'startingCash');const rows=[];
 for(let month=1;month<=months;month++){
  const churned=Math.min(customers,Math.round(customers*monthlyChurnRate));
  const endingCustomers=customers-churned+monthlyAcquisition;
  if(!Number.isSafeInteger(endingCustomers))throw new RangeError('customer count exceeds safe integer');
  const revenue=cents(endingCustomers*pricePerCustomer,'revenue');
  const variableCost=cents(endingCustomers*variableCostPerCustomer,'variableCost');
  const acquisitionCost=cents(monthlyAcquisition*acquisitionCostPerCustomer,'acquisitionCost');
  const netCashFlow=cents(revenue-variableCost-acquisitionCost-fixedMonthlyCost,'netCashFlow');
  cash=cents(cash+netCashFlow,'endingCash');
  rows.push({month,openingCustomers:customers,churned,acquired:monthlyAcquisition,endingCustomers,revenue,variableCost,acquisitionCost,fixedCost:fixedMonthlyCost,netCashFlow,endingCash:cash});
  customers=endingCustomers;
 }
 const contribution=pricePerCustomer-variableCostPerCustomer;
 return {currency:'AUD',basis:'hypothetical scenario, not actual traction',rows,monthlyContributionPerCustomer:cents(contribution,'contribution'),simplePaybackMonths:contribution>0?cents(acquisitionCostPerCustomer/contribution,'payback'):null,firstNegativeCashMonth:rows.find(r=>r.endingCash<0)?.month??null};
}
