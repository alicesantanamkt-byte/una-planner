import * as XLSX from "xlsx";

export type ImportedContent = {
  title: string;
  format?: string;
  publishAt?: string;
  estimatedMinutes?: number;
  preferredLocation?: string;
};

function normalizeKey(value:string){
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

function pick(row:Record<string,unknown>, patterns:string[]){
  for(const [key,value] of Object.entries(row)){
    const k=normalizeKey(key);
    if(patterns.some(p=>k.includes(p))) return String(value ?? "").trim();
  }
  return "";
}

export function parseSpreadsheet(buffer:ArrayBuffer):ImportedContent[]{
  const wb = XLSX.read(buffer,{type:"array",cellDates:true});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string,unknown>>(ws,{defval:""});

  return rows.map(row=>{
    const title = pick(row,["titulo","tema","conteudo","assunto"]);
    const format = pick(row,["formato","tipo"]);
    const date = pick(row,["data","publicacao"]);
    const location = pick(row,["local"]);
    const durationRaw = pick(row,["duracao","tempo"]);
    const duration = Number((durationRaw.match(/\d+/)||[])[0] || 15);

    return {
      title,
      format,
      publishAt: date || undefined,
      estimatedMinutes: duration,
      preferredLocation: location || undefined
    };
  }).filter(item=>item.title);
}
