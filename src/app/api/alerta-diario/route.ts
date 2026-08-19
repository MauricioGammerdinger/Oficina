import { NextResponse, type NextRequest } from "next/server";
import { enviarAlertaDeCompras } from "@/lib/alerta-email";

/**
 * Chamado uma vez por dia pela tarefa agendada da Vercel (ver vercel.json).
 * A Vercel manda "Authorization: Bearer <CRON_SECRET>" sozinha — conferimos
 * isso para que ninguém de fora consiga disparar e-mail chamando esta URL.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const resultado = await enviarAlertaDeCompras();
  return NextResponse.json(resultado);
}
