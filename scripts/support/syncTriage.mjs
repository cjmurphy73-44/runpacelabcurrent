/** Offline, non-mutating support classification. Never accepts or logs credentials. */
const STATES = new Set(['connected','disconnected','expired','unknown']);
const PROVIDERS = new Set(['garmin','coros','strava','file']);
const OBSERVATIONS = new Set(['none','pending','success','failed','unknown']);
export function classifySyncIncident(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('structured incident required');
  const {provider,connection='unknown',lastAttempt='unknown',stream='unknown',activityPresent=false,ageMinutes=null} = input;
  if (!PROVIDERS.has(provider) || !STATES.has(connection) || !OBSERVATIONS.has(lastAttempt) || !['verified','summary','missing','unknown'].includes(stream) || typeof activityPresent !== 'boolean') throw new TypeError('invalid incident evidence');
  if (ageMinutes !== null && (!Number.isSafeInteger(ageMinutes) || ageMinutes < 0)) throw new TypeError('invalid age');
  const result=(status,action,message)=>Object.freeze({status,action,message,verified:false});
  if (provider !== 'file' && (connection==='expired'||connection==='disconnected')) return result('connection_attention','review_connection','Connection needs attention; reconnect through the official in-app flow. Never share tokens or passwords with support.');
  if (lastAttempt==='pending' || (lastAttempt==='unknown' && ageMinutes===null)) return result('unverified','check_status','Sync completion is not confirmed. Check the in-app status before retrying.');
  if (lastAttempt==='failed') return result('sync_failed','safe_retry','The last attempt failed. Check the error and use the in-app retry if available; do not repeatedly upload the same activity.');
  if (!activityPresent) return result('activity_missing','check_activity','No matching activity is confirmed in the app. Check provider history and sync status; do not claim it was imported.');
  if (stream==='missing'||stream==='summary'||stream==='unknown') return result('stream_unverified','review_source','The activity is visible, but verified full-duration stream analysis is not confirmed. Check original-file evidence.');
  if (lastAttempt!=='success') return result('unverified','check_status','Activity and stream evidence exist, but the latest sync outcome is not confirmed.');
  return result('evidence_consistent','review_activity','Activity is present with a verified stream indicator; this classification does not establish completeness or successful provider delivery.');
}
