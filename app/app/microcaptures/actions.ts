'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SENSITIVE = [
  'medico','médico','consulta','terapia','psicolog','dentista','hospital','exame',
  'escola','reunião escolar','banco','advogado','audiencia','audiência','cartorio','cartório'
];

function normalize(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function suggestionFor(title:string){
  const t = normalize(title);

  if(t.includes('trico') || t.includes('croche')){
    return {
      text:'Grave 2 ou 3 cenas curtas das mãos, materiais e processo. Sem precisar falar para a câmera.',
      seconds:20,
      tags:['rotina','processo','b-roll']
    };
  }

  if(t.includes('celula') || t.includes('igreja') || t.includes('culto')){
    return {
      text:'Antes de sair, registre 1 ou 2 cenas discretas da preparação — Bíblia, caderno ou caminho. Evite filmar outras pessoas.',
      seconds:15,
      tags:['fé','rotina','bastidor']
    };
  }

  if(t.includes('reuniao') || t.includes('reunião') || t.includes('cliente') || t.includes('trabalho')){
    return {
      text:'Registre um bastidor antes ou depois do compromisso: mesa pronta, notebook, anotações ou ambiente, sem mostrar informações de clientes.',
      seconds:20,
      tags:['trabalho','bastidor','autoridade']
    };
  }

  return {
    text:'Registre 2 cenas de 5 a 10 segundos que mostrem o contexto desse momento — preparação, ambiente ou detalhes — sem filmar terceiros.',
    seconds:20,
    tags:['rotina','bastidor']
  };
}

export async function generateMicrocaptures(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) redirect('/app/microcaptures?gen=error');

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect('/login');

  const {data:client} = await supabase
    .from('clients')
    .select('id')
    .eq('user_id',authData.user.id)
    .maybeSingle();

  if(!client) redirect('/onboarding');

  const now = new Date();
  const until = new Date(now.getTime() + 21*86400000);

  const {data:events,error:eventError} = await supabase
    .from('calendar_events')
    .select('id,title,start_datetime,end_datetime,protected,capture_allowed')
    .eq('client_id',client.id)
    .gte('start_datetime',now.toISOString())
    .lt('start_datetime',until.toISOString())
    .order('start_datetime',{ascending:true});

  if(eventError) redirect('/app/microcaptures?gen=error');

  const {data:existing} = await supabase
    .from('micro_capture_suggestions')
    .select('calendar_event_id,status')
    .eq('client_id',client.id)
    .in('status',['suggested','completed']);

  const existingIds = new Set((existing || []).map((row:any)=>row.calendar_event_id).filter(Boolean));

  const candidates = (events || []).filter((event:any)=>{
    if(!event.capture_allowed || event.protected) return false;
    if(existingIds.has(event.id)) return false;

    const title = normalize(event.title || '');
    if(title.includes('aniversario') || title.includes('gravação una') || title.includes('gravacao una')) return false;
    if(SENSITIVE.some(term=>title.includes(normalize(term)))) return false;

    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);
    const durationHours = (end.getTime()-start.getTime())/3600000;
    if(durationHours >= 12) return false;
    return true;
  }).slice(0,8);

  const rows = candidates.map((event:any)=>{
    const suggestion = suggestionFor(event.title || 'Compromisso');
    return {
      client_id:client.id,
      calendar_event_id:event.id,
      suggestion_text:suggestion.text,
      estimated_seconds:suggestion.seconds,
      tags_json:suggestion.tags,
      status:'suggested',
      ai_payload:{source:'rule_engine_v1'}
    };
  });

  if(rows.length){
    const {error:insertError} = await supabase.from('micro_capture_suggestions').insert(rows);
    if(insertError) redirect('/app/microcaptures?gen=error');
  }

  revalidatePath('/app/microcaptures');
  redirect(`/app/microcaptures?gen=${rows.length ? 'ok' : 'none'}&count=${rows.length}`);
}

export async function updateMicrocaptureStatus(id:string,status:'completed'|'dismissed'){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect('/login');

  const {data:client} = await supabase.from('clients').select('id').eq('user_id',authData.user.id).maybeSingle();
  if(!client) return;

  await supabase
    .from('micro_capture_suggestions')
    .update({status})
    .eq('id',id)
    .eq('client_id',client.id);

  revalidatePath('/app/microcaptures');
}
