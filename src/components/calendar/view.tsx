import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { CreateEventModal } from "~/components/calendar/create-event-modal";
import { toast } from "sonner";

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);

  // Get start and end of current month
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const events = useQuery(api.calendar.listEvents, {
    startDate: startOfMonth.getTime(),
    endDate: endOfMonth.getTime(),
    showCompleted,
    labelFilter: selectedLabels.length > 0 ? selectedLabels : undefined,
  });
  
  const availableLabels = useQuery(api.calendar.getLabels);
  const updateEvent = useMutation(api.calendar.update);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    if (!events) return [];
    
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateEvent(true);
  };

  const handleEventClick = async (eventId: string, completed: boolean) => {
    try {
      await updateEvent({
        eventId: eventId as any,
        isCompleted: !completed,
      });
      toast.success(completed ? "Event marked as incomplete" : "Event completed!");
    } catch (error) {
      toast.error("Failed to update event");
    }
  };

  const handleLabelToggle = (label: string) => {
    setSelectedLabels(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (events === undefined || availableLabels === undefined) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                ←
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                →
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowCreateEvent(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            + Add Event
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Show completed events</span>
          </label>

          {availableLabels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Filter by labels:</span>
              <div className="flex flex-wrap gap-1">
                {availableLabels.map((label) => (
                  <button
                    key={label}
                    onClick={() => handleLabelToggle(label)}
                    className={`text-xs px-2 py-1 rounded ${
                      selectedLabels.includes(label)
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-gray-100 text-gray-700 border border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedLabels.length > 0 && (
                <button
                  onClick={() => setSelectedLabels([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames.map((day) => (
              <div key={day} className="p-4 text-center font-medium text-gray-700 bg-gray-50">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {getDaysInMonth().map((date, index) => {
              if (!date) {
                return <div key={index} className="h-32 border-r border-b border-gray-200"></div>;
              }

              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={date.toISOString()}
                  className="h-32 border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleDateClick(date)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? "text-blue-600" : "text-gray-900"
                  }`}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1 overflow-y-auto max-h-20">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event._id}
                        className={`text-xs p-1 rounded cursor-pointer truncate ${
                          event.isCompleted ? "opacity-60 line-through" : ""
                        }`}
                        style={{ 
                          backgroundColor: event.color + "20", 
                          borderLeft: `3px solid ${event.color}` 
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event._id, event.isCompleted);
                        }}
                        title={event.title}
                      >
                        {event.title}
                        {event.labels.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {event.labels.slice(0, 2).map((label, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-200 text-gray-600 px-1 rounded"
                              >
                                {label}
                              </span>
                            ))}
                            {event.labels.length > 2 && (
                              <span className="text-xs text-gray-500">+{event.labels.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showCreateEvent && (
        <CreateEventModal
          onClose={() => {
            setShowCreateEvent(false);
            setSelectedDate(null);
          }}
          initialDate={selectedDate || undefined}
        />
      )}
    </div>
  );
}
