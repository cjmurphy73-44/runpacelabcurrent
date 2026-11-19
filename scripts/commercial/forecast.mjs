/** Hypothetical AUD monthly forecast. No live billing or customer data. */
const valid=(x,k,min=0,max=Infinity)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw new RangeError(k+' out of range');return x};
const cents=x=>Math.round((x+Number.EPSILON)*100)/100;
export function forecastScenario({startingCash,openingCustomers,pricePerCustomer,monthlyAcquisition,monthlyChurnRate,variableCostPerCustomer,fixedMonthlyCost,acquisitionCostPerCustomer,months=12}){
 for(const [k,v] of Object.entries({startingCash,openingCustomers,pricePerCustomer,monthlyAcquisition,monthlyChurnRate,variableCostPerCustomer,fixedMonthlyCost,acquisitionCostPerCustomer}))valid(v,k,0,k==='monthlyChurnRate'?1:Infinity);
 valid(months,'months',1,60);
 if(!Number.isInteger(months)||!Number.isInteger(openingCustomers)||!Number.isInteger(monthlyAcquisition))throw new RangeError('customer counts and months must be integers');
 let customers=openingCustomers,cash=startingCash;const rows=[];
 for(let month=1;month<=months;month++){
  const churned=Math.min(customers,Math.round(customers*monthlyChurnRate));
  const endingCustomers=customers-churned+monthlyAcquisition;
  const revenue=cents(endingCustomers*pricePerCustomer);
  const variableCost=cents(endingCustomers*variableCostPerCustomer);
  const acquisitionCost=cents(monthlyAcquisition*acquisitionCostPerCustomer);
  const netCashFlow=cents(revenue-variableCost-acquisitionCost-fixedMonthlyCost);
  cash=cents(cash+netCashFlow);
  rows.push({month,openingCustomers:customers,churned,acquired:monthlyAcquisition,endingCustomers,revenue,variableCost,acquisitionCost,fixedCost:fixedMonthlyCost,netCashFlow,endingCash:cash});
  customers=endingCustomers;
 }
 const contribution=pricePerCustomer-variableCostPerCustomer;
 return {currency:'AUD',basis:'hypothetical scenario, not actual traction',rows,monthlyContributionPerCustomer:cents(contribution),simplePaybackMonths:contribution>0?cents(acquisitionCostPerCustomer/contribution):null,firstNegativeCashMonth:rows.find(r=>r.endingCash<0)?.month??null};
}
