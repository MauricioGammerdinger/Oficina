import { Resend } from "resend";
import { money, qty } from "@/lib/parse";
import { getAlertSettings, getShoppingList } from "@/lib/queries";

/**
 * Monta e envia o e-mail diário de "o que falta comprar", se houver algo.
 * Retorna um resumo do que aconteceu, pra aparecer no log da tarefa agendada.
 *
 * Chamado tanto pela tarefa agendada da Vercel quanto pelo botão "testar
 * agora" da tela de Configurações — por isso ignoraSaldo permite mandar o
 * e-mail de teste mesmo com a lista de compras vazia.
 */
export async function enviarAlertaDeCompras({
  ignorarListaVazia = false,
}: { ignorarListaVazia?: boolean } = {}) {
  const config = await getAlertSettings();
  if (!config.enabled) {
    return { enviado: false, motivo: "alerta desligado nas configurações" };
  }
  if (!config.email) {
    return { enviado: false, motivo: "nenhum e-mail configurado" };
  }

  const lista = await getShoppingList();

  if (lista.length === 0 && !ignorarListaVazia) {
    return { enviado: false, motivo: "nada abaixo do mínimo hoje" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const destino = config.email;
  if (!apiKey) {
    // Não derruba a tarefa agendada por falta de configuração — só avisa.
    return {
      enviado: false,
      motivo: "RESEND_API_KEY não configurada no servidor",
    };
  }

  const resend = new Resend(apiKey);
  const total = lista.reduce((soma, item) => soma + item.estimated, 0);
  const vazio = lista.length === 0;

  const linhas = vazio
    ? "Nada abaixo do mínimo agora — isto é só um envio de teste."
    : lista
        .map((item) => {
          const alerta = item.zeroed ? "🔴 acabou" : "🟡 no mínimo";
          return `${alerta} — ${item.name}: comprar ${qty(item.suggested)} ${
            item.unit
          } (≈ ${money(item.estimated)})`;
        })
        .join("\n");

  const html = `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">${
        vazio
          ? "Teste do alerta"
          : `Comprar (${lista.length} ${lista.length === 1 ? "item" : "itens"})`
      }</h2>
      <p style="color: #666; margin-top: 0;">
        ${vazio ? "Nada abaixo do mínimo agora — isto é só um teste." : `Total estimado: ${money(total)}`}
      </p>
      ${
        vazio
          ? ""
          : `<ul style="padding-left: 18px;">
        ${lista
          .map(
            (item) => `<li style="margin-bottom: 6px;">
              ${item.zeroed ? "🔴 <b>acabou</b>" : "🟡 no mínimo"} —
              ${item.name}: comprar ${qty(item.suggested)} ${item.unit}
              <span style="color:#888;">(≈ ${money(item.estimated)})</span>
            </li>`
          )
          .join("")}
      </ul>`
      }
      <p style="color: #999; font-size: 12px;">
        Alerta automático do Controle da Oficina.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: process.env.ALERT_EMAIL_FROM ?? "Controle da Oficina <onboarding@resend.dev>",
    to: destino,
    subject: vazio
      ? "🔧 Teste do alerta de compras"
      : `🔧 Comprar: ${lista.length} ${
          lista.length === 1 ? "item" : "itens"
        } no mínimo (${money(total)})`,
    text: `${linhas}${vazio ? "" : `\n\nTotal estimado: ${money(total)}`}`,
    html,
  });

  if (error) return { enviado: false, motivo: error.message };
  return { enviado: true, itens: lista.length, total };
}
