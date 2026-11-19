/**
 * ING-010: fail-closed recording coverage provenance for bounded telemetry storage.
 * Pure function: no athlete records, persistence, URLs, or provider API calls.
 * The output must never be interpreted as authorization to discard a recording tail.
 */
export function describeStreamCoverage({totalSamples,storedSamples,firstTime,lastTime,storedFirstTime,storedLastTime,durationSeconds}) {
 const integer=(v,name)=>{if(!Number.isSafeInteger(v)||v<0)throw new RangeError(name+' must be a nonnegative safe integer');return v};
 totalSamples=integer(totalSamples,'totalSamples');
 storedSamples=integer(storedSamples,'storedSamples');
 if(storedSamples>totalSamples)throw new RangeError('storedSamples exceeds totalSamples');
 const time=(v,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw new RangeError(name+' must be a finite nonnegative number');return v};
 durationSeconds=time(durationSeconds,'durationSeconds');
 const hasFull=totalSamples>0,hasStored=storedSamples>0;
 if(hasFull){firstTime=time(firstTime,'firstTime');lastTime=time(lastTime,'lastTime');if(lastTime<firstTime)throw new RangeError('invalid full span')}
 else if(firstTime!=null||lastTime!=null)throw new RangeError('empty recording cannot have timestamps');
 if(hasStored){storedFirstTime=time(storedFirstTime,'storedFirstTime');storedLastTime=time(storedLastTime,'storedLastTime');if(storedLastTime<storedFirstTime||!hasFull||storedFirstTime<firstTime||storedLastTime>lastTime)throw new RangeError('stored span outside full recording')}
 else if(storedFirstTime!=null||storedLastTime!=null)throw new RangeError('empty stored stream cannot have timestamps');
 const sampleComplete=hasFull&&storedSamples===totalSamples;
 const spanComplete=hasFull&&hasStored&&storedFirstTime===firstTime&&storedLastTime===lastTime;
 const durationComplete=durationSeconds>0&&hasStored&&(storedLastTime-storedFirstTime)>=durationSeconds*0.6;
 const complete=sampleComplete&&spanComplete&&durationComplete;
 return Object.freeze({
  totalSamples,storedSamples,fullSpanSeconds:hasFull?lastTime-firstTime:null,
  storedSpanSeconds:hasStored?storedLastTime-storedFirstTime:null,
  sampleCoverage:hasFull?storedSamples/totalSamples:null,
  durationCoverage:durationSeconds>0&&hasStored?Math.min(1,(storedLastTime-storedFirstTime)/durationSeconds):null,
  complete,quality:!hasFull?'no_recording':!hasStored?'not_persisted':complete?'complete':'partial_or_unverified',
  canClaimFullRecording:complete
 });
}
