import { buildFreeSlots } from "./availability";
import { scoreSlot } from "./scoring";

type ContentRow = {
  id:string; title:string; publish_at:string | null; estimated_minutes:number; preferred_location:string | null;
};
type EventRow = { start_datetime:string; end_datetime:string; location:string | null; protected:boolean | null; };
type ClientRoutine = { work_start_time?:string|null; work_end_time?:string|null; active_weekdays?:number[]|null; };

function dateKey(date:Date){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}

export function generateSuggestions(contents:ContentRow[],events:EventRow[],routine:ClientRoutine={}){
  const dated=contents.filter(c=>c.publish_at);
  if(!dated.length) return [];
  const now=new Date();
  const maxPublish=new Date(Math.max(...dated.map(c=>+new Date(c.publish_at!))));
  const slots=buildFreeSlots(
    events,dateKey(now),dateKey(maxPublish),
    String(routine.work_start_time||'08:00').slice(0,5),
    String(routine.work_end_time||'18:00').slice(0,5),
    routine.active_weekdays?.length?routine.active_weekdays:[1,2,3,4,5],now
  );
  const results:any[]=[];

  for(const content of dated){
    let best:any=null;
    for(const slot of slots){
      const publish=new Date(content.publish_at!);
      if(slot.start>=publish) continue;
      const daysBefore=Math.max(0,Math.floor((+publish-+slot.start)/86400000));
      const wanted=content.preferred_location?.trim().toLowerCase();
      const ideal=!!wanted && slot.locations.some(l=>l.toLowerCase().includes(wanted));
      if(wanted && !ideal) continue;
      const scored=scoreSlot({
        title:content.title,estimatedMinutes:content.estimated_minutes||15,
        preferredLocation:content.preferred_location||undefined,hasDependencies:false,dependenciesConfirmed:false
      },{
        freeMinutes:slot.freeMinutes,isIdealLocation:ideal,isAcceptableLocation:!wanted||ideal,
        daysBeforePublish:daysBefore,matchesPreferredPeriod:true,matchesRecordingMode:true,protected:slot.protected
      },0);
      if(scored && (!best || scored.score>best.score)) best={...scored,content,slot};
    }
    if(best) results.push(best);
  }
  return results;
}
