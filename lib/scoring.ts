export type Content = {
  title:string;
  estimatedMinutes:number;
  preferredLocation?:string;
  hasDependencies:boolean;
  dependenciesConfirmed:boolean;
};

export type Slot = {
  freeMinutes:number;
  isIdealLocation:boolean;
  isAcceptableLocation:boolean;
  daysBeforePublish:number;
  matchesPreferredPeriod:boolean;
  matchesRecordingMode:boolean;
  protected:boolean;
};

export function scoreSlot(content:Content, slot:Slot, dayLoad=0){
  if(slot.protected || slot.freeMinutes < content.estimatedMinutes) return null;

  let score=0;
  const reasons:string[]=[];

  if(slot.daysBeforePublish<=2){score+=25;reasons.push("prazo muito próximo");}
  else if(slot.daysBeforePublish<=5){score+=20;reasons.push("boa antecedência");}
  else if(slot.daysBeforePublish<=10) score+=12;
  else score+=6;

  if(slot.isIdealLocation){score+=20;reasons.push("local ideal");}
  else if(slot.isAcceptableLocation) score+=10;

  if(content.dependenciesConfirmed){score+=20;reasons.push("dependências confirmadas");}
  else if(!content.hasDependencies) score+=15;

  const remainder=slot.freeMinutes-content.estimatedMinutes;
  score += remainder<=10 ? 10 : remainder<=20 ? 7 : 4;

  if(slot.matchesPreferredPeriod){score+=10;reasons.push("período preferido");}
  if(slot.matchesRecordingMode){score+=10;reasons.push("compatível com forma de gravação");}

  score-=Math.min(dayLoad*8,24);

  return {score:Math.max(0,Math.min(100,score)),reasons};
}
