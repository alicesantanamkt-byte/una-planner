import { buildFreeSlots } from "./availability";
import { scoreSlot } from "./scoring";

type ContentRow = {
  id:string; title:string; publish_at:string | null; estimated_minutes:number; preferred_location:string | null;
};
type EventRow = { start_datetime:string; end_datetime:string; location:string | null; protected:boolean | null; };
type ClientRoutine = { work_start_time?:string|null; work_end_time?:string|null; active_weekdays?:number[]|null; };
type SuggestionOptions = {
  rejectedPairs?:Set<string>;
  rejectedTimesByContent?:Map<string,Date[]>;
  rejectionBufferMinutes?:number;
};

function dateKey(date:Date){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}

function rejectionKey(contentId:string,start:Date){
  return `${contentId}|${start.toISOString()}`;
}

function isNearRejectedTime(contentId:string,start:Date,options:SuggestionOptions){
  const rejected=options.rejectedTimesByContent?.get(contentId) || [];
  const buffer=(options.rejectionBufferMinutes || 90)*60000;
  return rejected.some(time=>Math.abs(start.getTime()-time.getTime()) < buffer);
}

export function generateSuggestions(
  contents:ContentRow[],
  events:EventRow[],
  routine:ClientRoutine={},
  options:SuggestionOptions={}
){
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

  const usedMinutes=new Map<number,number>();
  const rejectedPairs=options.rejectedPairs || new Set<string>();
  const results:any[]=[];

  for(const content of dated){
    let best:any=null;

    for(let index=0; index<slots.length; index++){
      const slot=slots[index];
      const used=usedMinutes.get(index) || 0;
      const duration=content.estimated_minutes || 15;
      const remaining=slot.freeMinutes-used;
      if(remaining < duration) continue;

      const candidateStart=new Date(slot.start.getTime()+used*60000);
      const candidateEnd=new Date(candidateStart.getTime()+duration*60000);
      const publish=new Date(content.publish_at!);
      if(candidateStart>=publish || candidateEnd>slot.end) continue;
      if(rejectedPairs.has(rejectionKey(content.id,candidateStart))) continue;
      if(isNearRejectedTime(content.id,candidateStart,options)) continue;

      const daysBefore=Math.max(0,Math.floor((+publish-+candidateStart)/86400000));
      const wanted=content.preferred_location?.trim().toLowerCase();
      const ideal=!!wanted && slot.locations.some(l=>l.toLowerCase().includes(wanted));
      if(wanted && !ideal) continue;

      const scored=scoreSlot({
        title:content.title,estimatedMinutes:duration,
        preferredLocation:content.preferred_location||undefined,hasDependencies:false,dependenciesConfirmed:false
      },{
        freeMinutes:remaining,isIdealLocation:ideal,isAcceptableLocation:!wanted||ideal,
        daysBeforePublish:daysBefore,matchesPreferredPeriod:true,matchesRecordingMode:true,protected:slot.protected
      },0);

      if(scored && (!best || scored.score>best.score)){
        best={...scored,content,slot,index,candidateStart,duration};
      }
    }

    if(best){
      usedMinutes.set(best.index,(usedMinutes.get(best.index)||0)+best.duration);
      results.push({
        ...best,
        slot:{...best.slot,start:best.candidateStart}
      });
    }
  }

  return results;
}
