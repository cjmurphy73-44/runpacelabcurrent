/** Offline synthetic-only EWMA verification; never reads or writes athlete records. */
const finite=(value,name)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(name+' must be finite');return value};
const calendarDay=(value)=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TypeError('day must be YYYY-MM-DD');const ms=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)throw new RangeError('invalid calendar day');return ms/86400000};
/** Audit a contiguous daily series against an independent 42/7 EWMA reference.
 * Verified-stream and summary-derived daily loads must be supplied separately.
 * This tool checks the verified lane only; it never upgrades summaries to streams.
 */
export function auditDailyLoadTimeline(rows,{initialCtl=0,initialAtl=0,tolerance=1e-7}={}){
 if(!Array.isArray(rows))throw new TypeError('rows must be an array');
 if(rows.length>3660)throw new RangeError('timeline too long');
 let ctl=finite(initialCtl,'initialCtl'),atl=finite(initialAtl,'initialAtl');
 if(ctl<0||atl<0)throw new RangeError('initial loads must be nonnegative');
 finite(tolerance,'tolerance');if(tolerance<0||tolerance>1)throw new RangeError('invalid tolerance');
 let previous=null;const findings=[],expected=[];
 for(const [index,row] of rows.entries()){
  if(!row||typeof row!=='object'||Array.isArray(row))throw new TypeError('invalid row '+index);
  const day=calendarDay(row.day);
  if(previous!==null&&day!==previous+1)throw new RangeError('noncontiguous or duplicate day at '+index);
  previous=day;
  const verified=finite(row.verifiedLoad,'verifiedLoad['+index+']'),summary=finite(row.summaryLoad,'summaryLoad['+index+']');
  if(verified<0||summary<0)throw new RangeError('negative load');
  ctl+=(verified-ctl)/42;atl+=(verified-atl)/7;
  expected.push({day:row.day,verifiedCtl:ctl,verifiedAtl:atl,verifiedTsb:ctl-atl,summaryLoad:summary});
  for(const [field,target] of [['verifiedCtl',ctl],['verifiedAtl',atl],['verifiedTsb',ctl-atl]]){
   if(Object.hasOwn(row,field)){const actual=finite(row[field],field+'['+index+']');
    if(Math.abs(actual-target)>tolerance*Math.max(1,Math.abs(target)))findings.push({day:row.day,field,actual,expected:target,kind:'mismatch'});
   }
  }
  if(summary>0&&verified===0&&Object.hasOwn(row,'verifiedCtl')&&Math.abs(row.verifiedCtl-ctl)>tolerance*Math.max(1,Math.abs(ctl)))findings.push({day:row.day,field:'provenance',kind:'possible-summary-contamination'});
 }
 return {ok:findings.length===0,findings,expected};
}
