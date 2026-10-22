/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  FolderHeart,
  MapPin,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { Event } from '../../domain/types';
import { formatCurrency } from '../../domain/validation';

interface MyEventsViewProps {
  events: Event[];
  activeEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onOpenWizard: () => void;
  onExportEvent: (eventId: string) => void;
  onImportBackup: (jsonString: string) => void;
}

export const MyEventsView: React.FC<MyEventsViewProps> = ({
  events,
  activeEventId,
  onSelectEvent,
  onDeleteEvent,
  onOpenWizard,
  onExportEvent,
  onImportBackup,
}) => {
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        onImportBackup(text);
      } catch (err) {
        setImportError('Failed to read file: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.onerror = () => setImportError('Error reading file from disk.');
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      onDeleteEvent(eventToDelete.id);
      setEventToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0f2b20]">
            Celebration Portfolio
          </h1>
          <p className="text-xs text-[#52635b] mt-0.5">
            Switch between events, archive past celebrations, or restore from backup files.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#143c2c] hover:bg-[#ede5d5] border border-[#d8cdb8] rounded-md transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>

          <button
            onClick={onOpenWizard}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Celebration</span>
          </button>
        </div>
      </div>

      {importError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          {importError}
        </div>
      )}

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#e8dfcf] rounded-xl max-w-md mx-auto space-y-3">
          <FolderHeart className="w-8 h-8 text-[#a3b3aa] mx-auto" />
          <h3 className="font-serif text-lg font-semibold text-[#0f2b20]">No Celebrations Saved</h3>
          <p className="text-xs text-[#6e7d76]">
            Plan your wedding, birthday, anniversary, or community gathering to get started.
          </p>
          <button
            onClick={onOpenWizard}
            className="mt-2 px-4 py-2 text-xs font-medium text-white bg-[#143c2c] rounded-md shadow-xs"
          >
            Plan a Celebration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((evt) => {
            const isActive = evt.id === activeEventId;

            return (
              <div
                key={evt.id}
                className={`bg-white border rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all shadow-xs ${
                  isActive
                    ? 'border-[#143c2c] ring-1 ring-[#143c2c] bg-[#fcfaf6]'
                    : 'border-[#e8dfcf] hover:border-[#d8cdb8]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-[#f2ebe0] pb-2.5">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#6e7d76]">
                        {evt.type}
                      </span>
                      <h3 className="font-serif text-lg font-semibold text-[#0f2b20] line-clamp-1">
                        {evt.name}
                      </h3>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#143c2c] bg-[#e8dfcf] px-2 py-0.5 rounded">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectEvent(evt.id)}
                        className="text-xs font-medium text-[#143c2c] hover:underline"
                      >
                        Select
                      </button>
                    )}
                  </div>

                  <div className="py-3 space-y-2 text-xs text-[#384841]">
                    <p className="flex items-center gap-2 text-[#52635b]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{evt.date}</span>
                    </p>
                    <p className="flex items-center gap-2 text-[#52635b]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{evt.location}</span>
                    </p>
                    <p className="flex items-center gap-2 text-[#52635b] font-mono">
                      <Users className="w-3.5 h-3.5" />
                      <span>{evt.guestCount} Guests · {evt.venuePreference}</span>
                    </p>
                    <div className="pt-2 border-t border-[#f2ebe0]">
                      <span className="text-[11px] text-[#7d8b84]">Planned Budget:</span>
                      <p className="font-mono text-sm font-bold text-[#0f2b20]">
                        {formatCurrency(evt.totalBudget, evt.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#f2ebe0]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onExportEvent(evt.id)}
                      className="p-1.5 text-xs text-[#52635b] hover:text-[#0f2b20] hover:bg-[#f0eae1] rounded transition-colors"
                      title="Download JSON backup"
                      aria-label="Export backup"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEventToDelete(evt)}
                      className="p-1.5 text-xs text-[#85968e] hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      title="Delete celebration"
                      aria-label="Delete celebration"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!isActive && (
                    <button
                      onClick={() => onSelectEvent(evt.id)}
                      className="px-3 py-1 text-xs font-medium text-[#143c2c] bg-[#f5efe4] hover:bg-[#ede5d5] rounded-md transition-colors"
                    >
                      Switch to Event
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1f16]/60 backdrop-blur-xs">
          <div className="bg-[#fdfbf7] border border-[#e8dfcf] rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <h3 className="font-serif text-lg font-semibold text-[#0f2b20]">Delete Celebration?</h3>
            </div>
            <p className="text-xs text-[#52635b] leading-relaxed">
              Are you sure you want to delete <strong>{eventToDelete.name}</strong>? All associated
              budget allocations, recorded expenses, timeline tasks, and vendor contracts will be
              permanently removed from your local storage.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8dfcf]">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-[#52635b] hover:bg-[#ede5d5] rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded-md shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
