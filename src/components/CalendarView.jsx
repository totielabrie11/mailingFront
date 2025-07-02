// CalendarView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

const DragAndDropCalendar = withDragAndDrop(Calendar);
const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:5000';

const LISTAS = [
  { key: 'nuevos', label: 'Nuevos clientes' },
  { key: 'viejos', label: 'Viejos clientes' },
  { key: 'compras_recientes', label: 'Compras recientes' }
];

const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [grupoObjetivo, setGrupoObjetivo] = useState(LISTAS[0].key);

  // 1) Carga inicial de eventos con id
  const loadEvents = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/events`);
      const parsed = data.map(e => ({
        ...e,
        start: new Date(e.start),
        end:   new Date(e.end)
      }));
      setEvents(parsed);
    } catch (err) {
      toast.error('Error al cargar eventos');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // 2) Modal: slot seleccionado
  const handleSelectSlot = slotInfo => {
    setSelectedSlot(slotInfo.start);
    setGrupoObjetivo(LISTAS[0].key);
    setModalVisible(true);
  };

  // 3) Crear evento y guardar id en state
  const handleAddEvent = async () => {
    if (!selectedSlot) return;

    const payload = {
      title: `📤 Envío a ${grupoObjetivo}`,
      start: selectedSlot.toISOString(),
      end:   new Date(selectedSlot.getTime() + 60 * 60 * 1000).toISOString(),
      allDay: false,
      grupoObjetivo,
      plantilla: 'default',
      pendiente: true
    };

    try {
      // Extraemos el objeto completo con id
      const { data: nuevo } = await axios.post(`${API_BASE}/api/events`, payload);
      console.log('Evento creado ->', nuevo);

      setEvents(prev => [
        ...prev,
        {
          ...nuevo,
          start: new Date(nuevo.start),
          end:   new Date(nuevo.end)
        }
      ]);

      toast.success('Envío programado ✔️');
      setModalVisible(false);
    } catch (err) {
      toast.error('Error al programar envío');
      console.error(err);
    }
  };

  // 4) Drag & Drop: mover evento con id
  const handleEventDrop = async ({ event, start, end, allDay }) => {
    console.log('Moviendo evento ->', event.id, event);
    if (!event.id) {
      toast.error('Evento sin ID, recarga la página');
      return;
    }

    const updatePayload = {
      title:         event.title,
      start:         start.toISOString(),
      end:           end.toISOString(),
      allDay,
      grupoObjetivo: event.grupoObjetivo,
      plantilla:     event.plantilla,
      pendiente:     event.pendiente
    };

    try {
      const { data: actualizado } = await axios.put(
        `${API_BASE}/api/events/${event.id}`,
        updatePayload
      );

      setEvents(prev =>
        prev.map(e =>
          e.id === event.id
            ? { ...actualizado, start: new Date(actualizado.start), end: new Date(actualizado.end) }
            : e
        )
      );

      toast.success('Horario ajustado ✔️');
    } catch (err) {
      toast.error('Error al mover evento');
      console.error(err);
    }
  };

  return (
    <div style={{ height: 600, position: 'relative', padding: 12 }}>
      <DragAndDropCalendar
        selectable
        localizer={localizer}
        events={events}
        views={['month', 'week', 'day']}
        view={currentView}
        onView={setCurrentView}
        date={currentDate}
        onNavigate={setCurrentDate}
        onSelectSlot={handleSelectSlot}
        onEventDrop={handleEventDrop}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%', backgroundColor: '#fff' }}
      />

      {modalVisible && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -20%)',
          backgroundColor: '#fff',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          width: 320
        }}>
          <h4>Programar envío masivo</h4>

          <label style={{ display: 'block', marginTop: 12 }}>Lista de destino:</label>
          <select
            value={grupoObjetivo}
            onChange={e => setGrupoObjetivo(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4, borderRadius: 4 }}
          >
            {LISTAS.map(l => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>

          <p style={{ marginTop: 12 }}>
            Fecha y hora:<br />
            <strong>{selectedSlot.toLocaleString()}</strong>
          </p>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              onClick={handleAddEvent}
              style={{
                flex: 1,
                padding: '8px 0',
                backgroundColor: '#0077cc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Agendar envío
            </button>
            <button
              onClick={() => setModalVisible(false)}
              style={{
                flex: 1,
                padding: '8px 0',
                backgroundColor: '#ccc',
                color: '#333',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;