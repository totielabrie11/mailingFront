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

const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:5000';

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventType, setEventType] = useState('Envío programado');
  const [showDayView, setShowDayView] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/events`);
      const parsed = res.data.map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end)
      }));
      setEvents(parsed);
    } catch (err) {
      toast.error('Error al cargar eventos 🛑');
      console.error('Eventos error:', err);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSelectSlot = (slotInfo) => {
    setSelectedSlot(slotInfo.start);
    setModalVisible(true);
    setShowDayView(false);
  };

  const handleAddEvent = async () => {
    if (!selectedSlot) return;

    const newEvent = {
      title: eventType === 'Envío programado'
        ? '📤 Envío programado: nuevos clientes'
        : '📊 Seguimiento grupo viejo',
      start: selectedSlot.toISOString(),
      end: new Date(selectedSlot.getTime() + 60 * 60 * 1000).toISOString(),
      allDay: false
    };

    try {
      const res = await axios.post(`${API_BASE}/api/events`, newEvent);
      const eventoFinal = {
        ...res.data,
        start: new Date(res.data.start),
        end: new Date(res.data.end)
      };

      setEvents(prev => [...prev, eventoFinal]);
      toast.success('Evento guardado ✔️');
      setModalVisible(false);
      setShowDayView(false);
    } catch (err) {
      toast.error('Error al guardar evento 😵');
      console.error('Guardar evento error:', err);
    }
  };

  const handleEventDrop = async ({ event, start, end, allDay }) => {
    if (!event.id) {
      toast.error('Evento sin ID — no se puede actualizar 😵');
      return;
    }

    try {
      const updatedEvent = {
        title: event.title,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: !!allDay
      };

      await axios.put(`${API_BASE}/api/events/${event.id}`, updatedEvent);

      setEvents(prev =>
        prev.map(e =>
          e.id === event.id
            ? { ...e, start, end, allDay }
            : e
        )
      );

      toast.success('Evento reprogramado ⏱️');
    } catch (err) {
      toast.error('Error al mover evento 😵');
      console.error('Mover evento error:', err);
    }
  };

  const eventosDelDía = events.filter(e =>
    new Date(e.start).toDateString() === selectedSlot?.toDateString()
  );

  return (
    <div style={{ height: 600, position: 'relative' }}>
      <h3 style={{ marginBottom: 16 }}>📆 Agenda de actividades</h3>
      <Calendar
        selectable
        culture="es"
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={['month', 'week', 'day']}
        view={currentView}
        onView={setCurrentView}
        date={currentDate}
        onNavigate={setCurrentDate}
        onSelectSlot={handleSelectSlot}
        popup
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 10,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
        }}
      />

      {modalVisible && (
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -20%)',
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 8,
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            zIndex: 10,
            width: 360
          }}
        >
          <h4>📌 Crear nuevo evento</h4>
          <p><strong>Fecha seleccionada:</strong><br />{selectedSlot?.toLocaleDateString()}</p>
          <label style={{ display: 'block', marginTop: 10 }}>Tipo de evento:</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            style={{ width: '100%', padding: 6, borderRadius: 4 }}
          >
            <option value="Envío programado">Envío programado</option>
            <option value="Seguimiento grupo">Seguimiento grupo</option>
          </select>

          <button
            onClick={() => setShowDayView(true)}
            style={{
              marginTop: 12,
              padding: '6px 12px',
              borderRadius: 4,
              backgroundColor: '#666',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Ver horarios
          </button>

          <button
            onClick={handleAddEvent}
            style={{
              marginTop: 10,
              padding: '6px 12px',
              borderRadius: 4,
              backgroundColor: '#0077cc',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Agregar evento
          </button>

          <button
            onClick={() => {
              setModalVisible(false);
              setShowDayView(false);
            }}
            style={{
              marginTop: 10,
              padding: '6px 12px',
              borderRadius: 4,
              backgroundColor: '#eee',
              color: '#333',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {showDayView && selectedSlot && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(20% + 340px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 8,
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            zIndex: 9,
            width: 620
          }}
        >
          <h4>🕒 Horarios de {selectedSlot.toLocaleDateString()}</h4>
          <DragAndDropCalendar
            localizer={localizer}
            events={eventosDelDía}
            startAccessor="start"
            endAccessor="end"
            defaultView="day"
            views={['day']}
            date={selectedSlot}
            onEventDrop={handleEventDrop}
            style={{
              height: 300,
              backgroundColor: '#f9f9f9',
              borderRadius: 4,
              padding: 8,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
            }}
          />
          <button
            onClick={() => setShowDayView(false)}
            style={{
              marginTop: 12,
              padding: '6px 12px',
              borderRadius: 4,
              backgroundColor: '#ddd',
              color: '#333',
              border: 'none', cursor: 'pointer' }} > Cerrar horarios </button> </div> )} 
              </div> ); 
            };
export default CalendarView;
