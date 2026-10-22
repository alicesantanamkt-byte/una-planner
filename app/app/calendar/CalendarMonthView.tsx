'use client';

import { useMemo, useState } from "react";

export type CalendarEventItem = {
  id:string;
  title:string;
  start_datetime:string;
  end_datetime:string;
  location:string|null;
  source:string|null;
};

function dayKey(value:string){
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"
  }).format(new Date(value));
}

function timeLabel(value:string){
  return new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(value));
}

function eventKind(event:CalendarEventItem){
  const title = String(event.title || "").toLowerCase();
  if(title.includes("microcapta")) return "micro";
  if(title.includes("gravação una") || title.includes("gravacao una")) return "una";
  return "google";
}

export function CalendarMonthView({
  year,month,events,todayKey
}:{year:number;month:number;events:CalendarEventItem[];todayKey:string}){
  const monthPrefix = `${year}-${String(month).padStart(2,"0")}`;
  const firstDay = new Date(`${monthPrefix}-01T12:00:00-03:00`);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year,month,0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth)/7)*7;
  const cells = Array.from({length:totalCells},(_,index)=>{
    const day = index-firstWeekday+1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const grouped = useMemo(()=>{
    const map = new Map<string,CalendarEventItem[]>();
    for(const event of events){
      const key = dayKey(event.start_datetime);
      if(!map.has(key)) map.set(key,[]);
      map.get(key)!.push(event);
    }
    return map;
  },[events]);

  const initialSelected = todayKey.startsWith(monthPrefix) ? todayKey : `${monthPrefix}-01`;
  const [selectedDay,setSelectedDay] = useState(initialSelected);
  const selectedEvents = grouped.get(selectedDay) || [];
  const selectedDateLabel = new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long"})
    .format(new Date(`${selectedDay}T12:00:00-03:00`));

  return <div className="calendar-shell">
    <div className="card calendar-card">
      <div className="calendar-grid-wrap">
        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(day=><div className="calendar-weekday" key={day}>{day}</div>)}
          </div>
          <div className="calendar-days">
            {cells.map((day,index)=>{
              if(!day) return <div className="calendar-day empty" key={`empty-${index}`}/>;
              const key = `${monthPrefix}-${String(day).padStart(2,"0")}`;
              const dayEvents = grouped.get(key) || [];
              const isToday = key===todayKey;
              const isSelected = key===selectedDay;
              return <button
                type="button"
                key={key}
                className="calendar-day"
                onClick={()=>setSelectedDay(key)}
                style={{textAlign:"left",cursor:"pointer",outline:isSelected?"2px solid rgba(109,74,53,.16)":"none",outlineOffset:"-2px"}}
              >
                <div className="calendar-day-head">
                  <span className={`calendar-day-number ${isToday?"today":""}`}>{day}</span>
                  {dayEvents.length>0 && <span className="meta">{dayEvents.length}</span>}
                </div>
                {dayEvents.slice(0,3).map(event=>{
                  const kind = eventKind(event);
                  return <div className={`cal-event ${kind}`} key={event.id}>
                    <div className="cal-event-title">{timeLabel(event.start_datetime)} · {event.title}</div>
                  </div>;
                })}
                {dayEvents.length>3 && <div className="meta" style={{marginTop:4}}>+ {dayEvents.length-3}</div>}
              </button>;
            })}
          </div>
        </div>
      </div>
    </div>

    <aside className="card day-panel">
      <div className="eyebrow">Compromissos do dia</div>
      <h3 style={{textTransform:"capitalize"}}>{selectedDateLabel}</h3>
      <div className="day-panel-list">
        {selectedEvents.length===0 && <p className="meta">Nenhum compromisso neste dia.</p>}
        {selectedEvents.map(event=><div className="day-panel-event" key={event.id}>
          <div className="row" style={{alignItems:"flex-start"}}>
            <div>
              <div className="meta" style={{marginTop:0}}>{timeLabel(event.start_datetime)}</div>
              <strong>{event.title}</strong>
              {event.location && <div className="meta">{event.location}</div>}
            </div>
            <span className="pill">{eventKind(event)==="una"?"UNA":eventKind(event)==="micro"?"Micro":"Google"}</span>
          </div>
        </div>)}
      </div>
    </aside>
  </div>
}
