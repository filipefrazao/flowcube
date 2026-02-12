"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getCalendar, type ScheduledPost } from "@/lib/socialcubeApi";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCalendar(year, month)
      .then((res) => setEvents(res.data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prev = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const next = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const getEventsForDay = (day: number) =>
    events.filter((e) => {
      if (!e.scheduled_at) return false;
      const d = new Date(e.scheduled_at);
      return d.getDate() === day;
    });

  const statusColor: Record<string, string> = {
    draft: "bg-gray-500",
    scheduled: "bg-blue-500",
    publishing: "bg-yellow-500",
    published: "bg-green-500",
    failed: "bg-red-500",
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/socialcube")} className="p-2 hover:bg-card rounded-lg"><ArrowLeft className="w-5 h-5 text-text-secondary" /></button>
          <h1 className="text-2xl font-bold text-text-primary">Content Calendar</h1>
          <div className="flex-1" />
          <button onClick={() => router.push("/socialcube/posts/new")} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={prev} className="p-2 hover:bg-card rounded-lg"><ChevronLeft className="w-5 h-5 text-text-secondary" /></button>
          <h2 className="text-xl font-semibold text-text-primary w-48 text-center">{MONTHS[month - 1]} {year}</h2>
          <button onClick={next} className="p-2 hover:bg-card rounded-lg"><ChevronRight className="w-5 h-5 text-text-secondary" /></button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7">
            {DAYS.map((d) => (
              <div key={d} className="p-3 text-center text-sm font-medium text-text-secondary border-b border-border">{d}</div>
            ))}
            {days.map((day, i) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
              return (
                <div key={i} className={`min-h-[100px] p-2 border-b border-r border-border ${!day ? "bg-background/50" : "hover:bg-background/30 cursor-pointer"}`}>
                  {day && (
                    <>
                      <span className={`text-sm ${isToday ? "bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center" : "text-text-secondary"}`}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div key={e.id} className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${statusColor[e.status] || "bg-gray-500"}`}>
                            {e.title || e.caption?.slice(0, 20) || "Post"}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-xs text-text-tertiary">+{dayEvents.length - 3} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
