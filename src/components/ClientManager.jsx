import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:5000';

const ClientManager = ({ onClientsUpdate, group, setGroup, filtro }) => {
  const [clients, setClients] = useState([]);
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [historiales, setHistoriales] = useState({});
  const [expandido, setExpandido] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const timeSince = (isoDate) => {
    if (!isoDate) return 'Nunca contactado';
    const diff = Date.now() - new Date(isoDate).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Hace 1 día';
    return `Hace ${days} días`;
  };

  const loadClients = useCallback(async (selectedGroup) => {
    try {
      const res = await axios.get(`${API_BASE}/api/clients/${selectedGroup}`);
      const formatted = (res.data || []).map((item) =>
        typeof item === 'string' ? { email: item, lastSent: null } : item
      );
      setClients(formatted);
      onClientsUpdate(formatted);
      setCurrentPage(1);
    } catch (err) {
      toast.error('Error al cargar clientes 😵');
      console.error(err);
    }
  }, [onClientsUpdate]);

  useEffect(() => {
    if (group === 'ninguno') {
      setClients([]);
      onClientsUpdate([]);
    } else {
      loadClients(group);
    }
  }, [group, loadClients, onClientsUpdate]);

  const addClient = async () => {
    if (!email) return toast.error('Debe ingresar un correo válido ❗');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) return toast.error('Correo inválido 😓');
    if (clients.find((c) => c.email === email)) return toast.warn('Este correo ya fue agregado ⚠️');

    try {
      const res = await axios.post(`${API_BASE}/api/clients/${group}`, { email });
      const newClient = { ...res.data, lastSent: null };
      const updated = [...clients, newClient];
      setClients(updated);
      onClientsUpdate(updated);
      setEmail('');
      toast.success('Cliente agregado ✔️');
    } catch (err) {
      if (err.response?.status === 409) toast.warn('Este cliente ya está registrado ⚠️');
      else toast.error('Error al guardar en el servidor 😵');
      console.error(err);
    }
  };

  const deleteClient = async (emailToDelete) => {
    const confirmed = window.confirm(`¿Eliminar el cliente ${emailToDelete}?`);
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE}/api/clients/${group}/${encodeURIComponent(emailToDelete)}`);
      const updated = clients.filter((c) => c.email !== emailToDelete);
      setClients(updated);
      onClientsUpdate(updated);
      toast.success('Correo eliminado ❌');
    } catch (err) {
      toast.error('No se pudo eliminar el correo');
      console.error(err);
    }
  };

  const toggleHistorial = async (email) => {
    if (expandido === email) {
      setExpandido(null);
      return;
    }
    if (!historiales[email]) {
      try {
        const res = await axios.get(`${API_BASE}/api/envios/cliente/${encodeURIComponent(email)}`);
        setHistoriales((prev) => ({ ...prev, [email]: res.data }));
      } catch {
        toast.error('No se pudo obtener el historial');
      }
    }
    setExpandido(email);
  };

  const clientesFiltrados = clients
    .filter((c) => {
      if (filtro === 'sinContacto') return !c.lastSent;
      if (filtro === 'contactados') return !!c.lastSent;
      return true;
    })
    .filter((c) => c.email.toLowerCase().includes(search.toLowerCase()));

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const paginatedClients = clientesFiltrados.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(clientesFiltrados.length / itemsPerPage);

  const handlePageChange = (direction) => {
    setCurrentPage((prev) => {
      if (direction === 'next') return Math.min(prev + 1, totalPages);
      if (direction === 'prev') return Math.max(prev - 1, 1);
      return prev;
    });
  };

  return (
    <div>
      <h3>📇 Lista de Clientes: {group.replace(/_/g, ' ')}</h3>

      {filtro && (
        <div style={{ marginBottom: 10, fontSize: '0.9rem', color: '#444' }}>
          🔍 Filtro activo: <strong>{filtro === 'contactados' ? 'Contactados' : 'Sin contacto'}</strong>
        </div>
      )}

      <select
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        style={{
          marginBottom: 12,
          padding: '6px 10px',
          borderRadius: 4,
          border: '1px solid #ccc'
        }}
      >
        <option value="ninguno">Ninguno</option>
        <option value="nuevos">Nuevos</option>
        <option value="viejos">Viejos</option>
        <option value="compras_recientes">Compras recientes</option>
      </select>

      <div style={{ marginBottom: 12 }}>
        <input
          type="email"
          placeholder="email@cliente.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginRight: '8px',
            width: '260px'
          }}
        />
        <button onClick={addClient} style={{ padding: '8px 12px' }}>
          Agregar
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginBottom: 16,
          padding: '6px',
          width: '260px',
          borderRadius: '4px',
          border: '1px solid #ccc'
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {paginatedClients.map((client, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify(client));
              e.dataTransfer.effectAllowed = 'move';
            }}
            style={{
              padding: '10px 14px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              minWidth: '260px',
              position: 'relative',
              cursor: 'grab'
            }}
          >
            <div
              style={{ fontWeight: 500, color: '#0077cc', cursor: 'pointer' }}
              onClick={() => toggleHistorial(client.email)}
              title="Ver historial de envíos"
            >
              {client.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 8 }}>
              Último envío: {timeSince(client.lastSent)}
            </div>

            {expandido === client.email && (
              <div style={{ fontSize: '0.75rem', color: '#333', marginTop: 6 }}>
                <strong>📬 Historial:</strong>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {(historiales[client.email] || []).map((h, i) => (
                    <li key={i}>{new Date(h.fecha).toLocaleString()}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => deleteClient(client.email)}
              style={{
                position: 'absolute',
                top: 8,
                right: 10,
                background: 'transparent',
                border: 'none',color: 'crimson', fontSize: '1.2rem', cursor: 'pointer' }} title="Eliminar" > 🗑️ </button> </div> ))} </div>
  {/* ⬅➡ Controles de paginación */}
  {totalPages > 1 && (
    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
      <button
        onClick={() => handlePageChange('prev')}
        disabled={currentPage === 1}
        style={{
          padding: '6px 12px',
          borderRadius: 4,
          border: '1px solid #ccc',
          backgroundColor: currentPage === 1 ? '#e9e9e9' : '#fff',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
        }}
      >
        ◀ Anterior
      </button>

      <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
        Página {currentPage} de {totalPages}
      </span>

      <button
        onClick={() => handlePageChange('next')}
        disabled={currentPage === totalPages}
        style={{
          padding: '6px 12px',
          borderRadius: 4,
          border: '1px solid #ccc',
          backgroundColor: currentPage === totalPages ? '#e9e9e9' : '#fff',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
        }}
      >
        Siguiente ▶
      </button>
    </div>
  )}
</div>); 
};
export default ClientManager;
