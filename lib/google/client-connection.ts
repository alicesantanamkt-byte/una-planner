import 'server-only';
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getGoogleOAuthClient } from "./calendar";

export async function getClientGoogleCalendar(clientId:string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado.");

  const {data:connection,error} = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("client_id",clientId)
    .eq("provider","google")
    .maybeSingle();

  if (error) throw error;
  if (!connection) return null;

  const accessToken = connection.access_token_encrypted
    ? decryptSecret(connection.access_token_encrypted)
    : undefined;
  const refreshToken = connection.refresh_token_encrypted
    ? decryptSecret(connection.refresh_token_encrypted)
    : undefined;

  const oauth = getGoogleOAuthClient();
  oauth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.expiry_date || undefined
  });

  oauth.on("tokens", async (tokens) => {
    const patch:any = {};
    if(tokens.access_token) patch.access_token_encrypted = encryptSecret(tokens.access_token);
    if(tokens.refresh_token) patch.refresh_token_encrypted = encryptSecret(tokens.refresh_token);
    if(tokens.expiry_date) patch.expiry_date = tokens.expiry_date;
    if(Object.keys(patch).length){
      await supabase.from("calendar_connections").update(patch).eq("id",connection.id);
    }
  });

  const { google } = await import("googleapis");
  return google.calendar({version:"v3",auth:oauth});
}
