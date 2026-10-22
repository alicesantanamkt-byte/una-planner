'use client';

import { useState, useTransition } from "react";
import { saveOnboarding } from "./actions";

type Form = {
  calendarMode:string; start:string; end:string; recordingMode:string;
  minFree:string; microCapture:boolean; restrictions:string;
};

export default function Onboarding(){
  const [step,setStep]=useState(1);
  const [pending,startTransition]=useTransition();
  const [form,setForm]=useState<Form>({
    calendarMode:"hybrid",start:"08:00",end:"18:00",
    recordingMode:"hybrid",minFree:"15",microCapture:true,restrictions:""
  });

  function update<K extends keyof Form>(key:K,value:Form[K]){
    setForm(v=>({...v,[key]:value}));
  }

  function next(){
    if(step<4) setStep(step+1);
    else startTransition(()=>saveOnboarding(form));
  }

  return <main style={{maxWidth:800,margin:"40px auto",padding:"24px"}}>
    <div className="eyebrow">Etapa {step} de 4</div>
    <h1>Configuração inicial.</h1>
    <p className="sub">O sistema aprende como você trabalha para sugerir conteúdos sem atrapalhar a rotina.</p>

    <div className="card" style={{marginTop:22}}>
      {step===1 && <div>
        <h3>Como você organiza sua agenda?</h3>
        <select value={form.calendarMode} onChange={e=>update("calendarMode",e.target.value)}>
          <option value="google">Google Agenda</option>
          <option value="manual">Agenda manual</option>
          <option value="hybrid">Google + manual</option>
        </select>
      </div>}

      {step===2 && <div className="form-grid">
        <label>Início do dia<input type="time" value={form.start} onChange={e=>update("start",e.target.value)}/></label>
        <label>Fim do dia<input type="time" value={form.end} onChange={e=>update("end",e.target.value)}/></label>
        <label>Tempo mínimo livre<select value={form.minFree} onChange={e=>update("minFree",e.target.value)}><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option></select></label>
      </div>}

      {step===3 && <div>
        <h3>Como você prefere gravar?</h3>
        <select value={form.recordingMode} onChange={e=>update("recordingMode",e.target.value)}>
          <option value="block">Separar um período</option>
          <option value="distributed">Um pouco por dia</option>
          <option value="hybrid">Misturar os dois</option>
        </select>
        <label style={{marginTop:14}}>
          <input style={{width:"auto",marginRight:8}} type="checkbox" checked={form.microCapture} onChange={e=>update("microCapture",e.target.checked)}/>
          Aceito microcaptações contextuais
        </label>
      </div>}

      {step===4 && <div>
        <label>Restrições<textarea value={form.restrictions} onChange={e=>update("restrictions",e.target.value)} placeholder="Ex.: não mostrar filhos, não gravar depois das 18h..."/></label>
      </div>}

      <div className="row" style={{marginTop:20}}>
        <button className="btn btn-soft" disabled={step===1 || pending} onClick={()=>setStep(step-1)}>Voltar</button>
        <button className="btn btn-primary" disabled={pending} onClick={next}>{pending?"Salvando...":step===4?"Concluir":"Continuar"}</button>
      </div>
    </div>
  </main>
}
