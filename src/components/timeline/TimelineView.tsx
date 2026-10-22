/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Flame,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Event, TaskPriority, TaskStatus, TimelineTask } from '../../domain/types';
import { generateId } from '../../domain/validation';

interface TimelineViewProps {
  event: Event;
  tasks: TimelineTask[];
  onAddTask: (task: TimelineTask) => void;
  onUpdateTask: (task: TimelineTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  event,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'urgent' | 'completed'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New task form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState(() => event.date);
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [category, setCategory] = useState('General Coordination');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleToggleStatus = (task: TimelineTask) => {
    let nextStatus: TaskStatus = 'not_started';
    if (task.status === 'not_started') nextStatus = 'in_progress';
    else if (task.status === 'in_progress') nextStatus = 'completed';
    else nextStatus = 'not_started';

    onUpdateTask({ ...task, status: nextStatus });
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: TimelineTask = {
      id: generateId(),
      eventId: event.id,
      title: title.trim(),
      description: desc.trim(),
      dueDate,
      priority,
      status: 'not_started',
      category,
    };

    onAddTask(newTask);
    setIsAddModalOpen(false);
    setTitle('');
    setDesc('');
  };

  // Sort chronologically by dueDate
  const sortedTasks = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const filteredTasks = sortedTasks.filter((t) => {
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'urgent')
      return t.status !== 'completed' && (t.priority === 'urgent' || t.isCompressedDeadline || t.dueDate < todayStr);
    if (filter === 'upcoming')
      return t.status !== 'completed';
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const overdueCount = tasks.filter((t) => t.status !== 'completed' && t.dueDate < todayStr).length;
  const urgentCount = tasks.filter((t) => t.status !== 'completed' && (t.priority === 'urgent' || t.isCompressedDeadline)).length;

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0f2b20]">
            Timeline & Execution Milestones
          </h1>
          <p className="text-xs text-[#52635b] mt-0.5">
            Date-aware chronological schedule calibrated for {event.name}.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Total Milestones</span>
          <p className="font-mono text-lg font-bold text-[#0f2b20] mt-0.5">{tasks.length}</p>
        </div>
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Completed</span>
          <p className="font-mono text-lg font-bold text-[#2f7e5f] mt-0.5">
            {completedCount} ({tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%)
          </p>
        </div>
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Urgent / Compressed</span>
          <p className="font-mono text-lg font-bold text-[#bd9b46] mt-0.5">{urgentCount}</p>
        </div>
        <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
          <span className="text-[11px] text-[#6e7d76]">Overdue</span>
          <p className={`font-mono text-lg font-bold mt-0.5 ${overdueCount > 0 ? 'text-rose-700' : 'text-[#6e7d76]'}`}>
            {overdueCount}
          </p>
        </div>
      </div>

      {/* Overdue Warning */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Attention:</strong> You have {overdueCount} task(s) past their scheduled deadline. Review below to adjust due dates or mark completed.
          </span>
        </div>
      )}

      {/* Filter Tabs (Functional segmented controls) */}
      <div className="flex items-center gap-1 p-1 bg-[#f0eae1] rounded-lg max-w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === 'upcoming'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Upcoming ({tasks.length - completedCount})
        </button>
        <button
          onClick={() => setFilter('urgent')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === 'urgent'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Urgent & Compressed ({urgentCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === 'completed'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Tasks List */}
      <div className="bg-white border border-[#e8dfcf] rounded-xl overflow-hidden divide-y divide-[#f2ebe0]">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#6e7d76]">
            No milestones found for this filter.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isInProgress = task.status === 'in_progress';
            const isOverdue = !isCompleted && task.dueDate < todayStr;

            return (
              <div
                key={task.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  isCompleted ? 'bg-[#faf8f5]/60' : 'hover:bg-[#faf7f2]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="mt-0.5 text-[#52635b] hover:text-[#143c2c] shrink-0"
                    title={`Status: ${task.status} (Click to advance)`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#2f7e5f]" />
                    ) : isInProgress ? (
                      <Clock className="w-5 h-5 text-[#bd9b46]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#a3b3aa]" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isCompleted
                            ? 'line-through text-[#85968e]'
                            : 'text-[#0f2b20]'
                        }`}
                      >
                        {task.title}
                      </span>
                      {/* Quiet metadata unboxed with separators */}
                      <span className="text-[11px] text-[#6e7d76]">· {task.category}</span>
                      {task.isCompressedDeadline && (
                        <span className="text-[10px] text-[#8a5d1b] font-medium flex items-center gap-1 bg-[#fbf6ec] px-1.5 py-0.2 rounded">
                          <Flame className="w-3 h-3 text-[#bd9b46]" />
                          Compressed Deadline
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-[#52635b] leading-relaxed">{task.description}</p>
                    )}
                  </div>
                </div>

                {/* Right side: Due Date, Priority, Delete */}
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <span
                      className={`text-xs font-mono block ${
                        isOverdue ? 'text-rose-700 font-bold' : 'text-[#143c2c]'
                      }`}
                    >
                      {task.dueDate}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold ${
                        task.priority === 'urgent'
                          ? 'text-rose-700'
                          : task.priority === 'high'
                          ? 'text-[#bd9b46]'
                          : 'text-[#6e7d76]'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : task.priority}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1 text-[#85968e] hover:text-rose-700 rounded transition-colors"
                    title="Delete milestone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1f16]/60 backdrop-blur-xs">
          <div className="bg-[#fdfbf7] border border-[#e8dfcf] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8f3ea] border-b border-[#e8dfcf]">
              <h3 className="font-serif text-lg font-semibold text-[#0f2b20]">Add New Milestone</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#52635b] hover:text-[#0f2b20] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Confirm Welcome Drinks Menu"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Details, contact person, or specifications..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8dfcf]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#52635b] hover:bg-[#ede5d5] rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
