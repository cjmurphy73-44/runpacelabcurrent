import {test,expect} from 'vitest';
import {forecastScenario as forecast} from './forecast.mjs';
const input={startingCash:1000,openingCustomers:10,pricePerCustomer:20,monthlyAcquisition:2,monthlyChurnRate:0,variableCostPerCustomer:5,fixedMonthlyCost:100,acquisitionCostPerCustomer:10,months:2};
test('cash reconciliation and monthly growth',()=>{const r=forecast(input);expect(r.rows[0]).toMatchObject({revenue:240,variableCost:60,acquisitionCost:20,netCashFlow:60,endingCash:1060});expect(r.rows[1].endingCash).toBe(1150)});
test('churn before acquisition',()=>{const r=forecast({...input,openingCustomers:3,monthlyChurnRate:1});expect(r.rows[0]).toMatchObject({churned:3,endingCustomers:2});expect(r.rows[1].churned).toBe(2)});
test('negative cash detected',()=>expect(forecast({...input,startingCash:0,fixedMonthlyCost:1000}).firstNegativeCashMonth).toBe(1));
test('no fake payback with zero contribution',()=>expect(forecast({...input,pricePerCustomer:5}).simplePaybackMonths).toBeNull());
test('reject negative and nonfinite assumptions',()=>{expect(()=>forecast({...input,startingCash:-1})).toThrow(RangeError);expect(()=>forecast({...input,pricePerCustomer:NaN})).toThrow(RangeError)});
test('reject churn over 100%',()=>expect(()=>forecast({...input,monthlyChurnRate:1.01})).toThrow(RangeError));
test('reject fractional customers and months',()=>{expect(()=>forecast({...input,monthlyAcquisition:1.5})).toThrow(RangeError);expect(()=>forecast({...input,months:1.5})).toThrow(RangeError)});
test('does not mutate assumptions',()=>{const old=structuredClone(input);forecast(input);expect(input).toEqual(old)});
test('zero customers means zero revenue',()=>expect(forecast({...input,openingCustomers:0,monthlyAcquisition:0}).rows[0].revenue).toBe(0));
test('zero ending cash not considered negative',()=>expect(forecast({...input,startingCash:0,openingCustomers:0,monthlyAcquisition:0,fixedMonthlyCost:0}).firstNegativeCashMonth).toBeNull());

test('reject overflowing revenue',()=>expect(()=>forecast({...input,pricePerCustomer:1e308})).toThrow(RangeError));
test('reject unsafe customer counts',()=>expect(()=>forecast({...input,openingCustomers:Number.MAX_SAFE_INTEGER,monthlyAcquisition:2})).toThrow(RangeError));
test('reject unsafe cent precision for initial cash',()=>expect(()=>forecast({...input,startingCash:1e16})).toThrow(RangeError));
test('reject overflow from cash accumulation',()=>expect(()=>forecast({...input,startingCash:Number.MAX_SAFE_INTEGER/100-10,monthlyAcquisition:0,openingCustomers:10,pricePerCustomer:100})).toThrow(RangeError));
test('reject nonfinite payback',()=>expect(()=>forecast({...input,acquisitionCostPerCustomer:1e308,monthlyAcquisition:0})).toThrow(RangeError));
