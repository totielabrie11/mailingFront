import React, { useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_URL;

const EmailSender = ({ clients, template, group }) => {
  // Filtra emails válidos
  const emailsValidos = useMemo(() => {
    return (clients ?? [])
      .map(c => typeof c === 'string' ? c : c.email)
      .filter(e => !!e && e.includes('@'));
  }, [clients]);

  const handleSend = async () => {
    if (!template) {
      toast.error("No hay plantilla cargada ❌");
      return;
    }

    if (emailsValidos.length === 0) {
      toast.error("No hay clientes válidos para enviar el email 😓");
      return;
    }

    const formData = new FormData();
    formData.append('pdf', template.pdfFile);
    formData.append('text', template.text);
    formData.append('emails', JSON.stringify(emailsValidos));

    if (template.imageFile) {
      formData.append('image', template.imageFile);
    }

    try {
      const res = await axios.post(`${API_BASE}/send-email`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.status === 200) {
        toast.success("Correos enviados con éxito 🎉");
        console.log("➡️ Correos enviados a:", emailsValidos);

        if (group !== 'ninguno') {
          console.log("📌 Actualizando grupo en DB:", group);
        } else {
          console.log("⚠️ Envío sin DB (DropManager)");
        }
      } else {
        toast.error("Ocurrió un error al enviar los correos ❗");
      }
    } catch (err) {
      toast.error("Fallo en la conexión con el servidor 😵");
      console.error(err);
    }
  };

  return (
    <div style={{ marginTop: 12, padding: 8 }}>
      <h3>🚀 Envío de Emails</h3>
      
      {emailsValidos.length === 0 && (
        <p style={{ color: '#d9534f', marginBottom: 8 }}>
          ⚠️ No hay destinatarios válidos para este envío
        </p>
      )}

      <button
        onClick={handleSend}
        disabled={emailsValidos.length === 0}
        style={{
          padding: '8px 16px',
          backgroundColor: emailsValidos.length === 0 ? '#ccc' : '#0077cc',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: emailsValidos.length === 0 ? 'not-allowed' : 'pointer'
        }}
      >
        Enviar a Todos ({emailsValidos.length})
      </button>
    </div>
  );
};

export default EmailSender;