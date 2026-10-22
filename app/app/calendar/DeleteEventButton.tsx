'use client';

import { useTransition } from "react";
import { deleteManualEvent } from "./actions";

export function DeleteEventButton({id}:{id:string}) {
  const [pending,startTransition]=useTransition();
  return <button
    className="btn btn-soft"
    disabled={pending}
    onClick={()=>startTransition(()=>deleteManualEvent(id))}
  >
    {pending?"Removendo...":"Excluir"}
  </button>;
}
