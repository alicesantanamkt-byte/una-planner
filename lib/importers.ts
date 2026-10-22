import * as XLSX from "xlsx";

export type ImportedContent = {
  title: string;
  format?: string;
  publishAt?: string;
  estimatedMinutes?: number;
  preferredLocation?: string;
};

function normalizeKey(value:unknown){
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ")
    .trim();
}

const TITLE_PATTERNS = ["titulo","tema","conteudo","assunto","pauta","post"];
const FORMAT_PATTERNS = ["formato","tipo","midia","mídia"];
const DATE_PATTERNS = ["data","publicacao","postagem","publicar"];
const LOCATION_PATTERNS = ["local","ambiente","onde gravar"];
const DURATION_PATTERNS = ["duracao","tempo","minutos","tempo estimado"];

function headerMatches(value:unknown, patterns:string[]){
  const normalized = normalizeKey(value);
  return patterns.some(pattern => normalized.includes(normalizeKey(pattern)));
}

function findHeaderRow(rows:unknown[][]){
  const maxScan = Math.min(rows.length,20);
  for(let i=0;i<maxScan;i++){
    const row = rows[i] || [];
    const hasTitle = row.some(cell=>headerMatches(cell,TITLE_PATTERNS));
    const hasDateOrFormat = row.some(cell=>headerMatches(cell,DATE_PATTERNS) || headerMatches(cell,FORMAT_PATTERNS));
    if(hasTitle && hasDateOrFormat) return i;
  }
  return 0;
}

function columnIndex(headers:unknown[], patterns:string[]){
  return headers.findIndex(header=>headerMatches(header,patterns));
}

function cell(row:unknown[], index:number){
  return index >= 0 ? row[index] : undefined;
}

function asText(value:unknown){
  if(value === null || value === undefined) return "";
  if(value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function toIsoDate(value:unknown):string|undefined{
  if(value === null || value === undefined || value === "") return undefined;

  if(value instanceof Date && !Number.isNaN(value.getTime())){
    return value.toISOString();
  }

  if(typeof value === "number"){
    const parsed = XLSX.SSF.parse_date_code(value);
    if(parsed){
      return new Date(Date.UTC(parsed.y,parsed.m-1,parsed.d,parsed.H||12,parsed.M||0,parsed.S||0)).toISOString();
    }
  }

  const raw = String(value).trim();
  const br = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if(br){
    const year = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
    const month = Number(br[2]);
    const day = Number(br[1]);
    const hour = br[4] ? Number(br[4]) : 12;
    const minute = br[5] ? Number(br[5]) : 0;
    const date = new Date(Date.UTC(year,month-1,day,hour,minute));
    if(!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function parseSpreadsheet(buffer:ArrayBuffer):ImportedContent[]{
  const wb = XLSX.read(buffer,{type:"array",cellDates:true});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:"",raw:true});
  if(!matrix.length) return [];

  const headerRowIndex = findHeaderRow(matrix);
  const headers = matrix[headerRowIndex] || [];

  const titleIndex = columnIndex(headers,TITLE_PATTERNS);
  const formatIndex = columnIndex(headers,FORMAT_PATTERNS);
  const dateIndex = columnIndex(headers,DATE_PATTERNS);
  const locationIndex = columnIndex(headers,LOCATION_PATTERNS);
  const durationIndex = columnIndex(headers,DURATION_PATTERNS);

  if(titleIndex < 0) return [];

  return matrix.slice(headerRowIndex+1).map(row=>{
    const title = asText(cell(row,titleIndex));
    const format = asText(cell(row,formatIndex));
    const location = asText(cell(row,locationIndex));
    const durationRaw = asText(cell(row,durationIndex));
    const duration = Number((durationRaw.match(/\d+/)||[])[0] || 15);

    return {
      title,
      format: format || undefined,
      publishAt: toIsoDate(cell(row,dateIndex)),
      estimatedMinutes: Number.isFinite(duration) && duration > 0 ? duration : 15,
      preferredLocation: location || undefined
    };
  }).filter(item=>item.title);
}
