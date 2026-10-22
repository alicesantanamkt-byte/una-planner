export type EventLike = {
  start_datetime:string;
  end_datetime:string;
  location?:string | null;
  protected?:boolean | null;
};

export type FreeSlot = {
  start:Date;
  end:Date;
  freeMinutes:number;
  locations:string[];
  protected:boolean;
};

function dateKeyInSaoPaulo(date:Date){
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(date);
}

function addDays(dateKey:string,days:number){
  const d=new Date(`${dateKey}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate()+days);
  return dateKeyInSaoPaulo(d);
}

function weekday(dateKey:string){
  return new Date(`${dateKey}T12:00:00-03:00`).getUTCDay();
}

export function buildFreeSlots(
  events:EventLike[],
  fromDate:string,
  toDate:string,
  dayStart='08:00',
  dayEnd='18:00',
  activeWeekdays=[1,2,3,4,5],
  now=new Date()
):FreeSlot[]{
  const grouped=new Map<string,EventLike[]>();
  for(const event of events){
    const key=dateKeyInSaoPaulo(new Date(event.start_datetime));
    if(!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key)!.push(event);
  }

  const slots:FreeSlot[]=[];
  let key=fromDate;
  const today=dateKeyInSaoPaulo(now);

  while(key<=toDate){
    if(activeWeekdays.includes(weekday(key))){
      const startDay=new Date(`${key}T${dayStart}:00-03:00`);
      const endDay=new Date(`${key}T${dayEnd}:00-03:00`);
      const sorted=(grouped.get(key)||[]).slice().sort((a,b)=>+new Date(a.start_datetime)-+new Date(b.start_datetime));
      let cursor=(key===today && now>startDay) ? new Date(now) : startDay;
      let previous:EventLike|null=null;

      for(let i=0;i<sorted.length;i++){
        const e=sorted[i];
        const start=new Date(e.start_datetime);
        const end=new Date(e.end_datetime);
        if(end<=cursor){ previous=e; continue; }
        if(start>=endDay) break;
        if(start>cursor){
          const nextLocation=e.location?.trim() || null;
          const prevLocation=previous?.location?.trim() || null;
          const inferredLocation=prevLocation && nextLocation && prevLocation.toLowerCase()===nextLocation.toLowerCase()
            ? prevLocation : null;
          const slotEnd=start<endDay?start:endDay;
          slots.push({
            start:new Date(cursor),end:new Date(slotEnd),
            freeMinutes:Math.floor((+slotEnd-+cursor)/60000),
            locations:inferredLocation?[inferredLocation]:[],protected:false
          });
        }
        if(end>cursor) cursor=end;
        previous=e;
      }
      if(cursor<endDay){
        slots.push({start:new Date(cursor),end:new Date(endDay),freeMinutes:Math.floor((+endDay-+cursor)/60000),locations:[],protected:false});
      }
    }
    if(key===toDate) break;
    key=addDays(key,1);
  }
  return slots.filter(s=>s.freeMinutes>=10 && s.end>now);
}
