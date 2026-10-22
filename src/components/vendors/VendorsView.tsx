/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  FileText,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  BookingStatus,
  ChecklistItem,
  Event,
  PaymentStatus,
  Vendor,
} from '../../domain/types';
import { formatCurrency, generateId, validateVendor } from '../../domain/validation';

interface VendorsViewProps {
  event: Event;
  vendors: Vendor[];
  checklist: ChecklistItem[];
  onAddVendor: (vendor: Vendor) => void;
  onUpdateVendor: (vendor: Vendor) => void;
  onDeleteVendor: (vendorId: string) => void;
  onToggleChecklist: (itemId: string) => void;
  onAddChecklistItem: (item: ChecklistItem) => void;
  onDeleteChecklistItem: (itemId: string) => void;
}

export const VendorsView: React.FC<VendorsViewProps> = ({
  event,
  vendors,
  checklist,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  onToggleChecklist,
  onAddChecklistItem,
  onDeleteChecklistItem,
}) => {
  const [activeTab, setActiveTab] = useState<'vendors' | 'checklist'>('vendors');
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Vendor form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Venue');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhoneOrEmail, setContactPhoneOrEmail] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | string>('');
  const [agreedCost, setAgreedCost] = useState<number | string>('');
  const [amountPaid, setAmountPaid] = useState<number | string>('');
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('researching');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [contractNotes, setContractNotes] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Checklist form state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistCategory, setNewChecklistCategory] = useState('General');

  const openAddVendor = () => {
    setEditingVendor(null);
    setName('');
    setCategory('Venue');
    setContactPerson('');
    setContactPhoneOrEmail('');
    setEstimatedCost('');
    setAgreedCost('');
    setAmountPaid('');
    setBookingStatus('researching');
    setPaymentStatus('pending');
    setContractNotes('');
    setEventNotes('');
    setErrors({});
    setIsAddVendorOpen(true);
  };

  const openEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setName(v.name);
    setCategory(v.category);
    setContactPerson(v.contactPerson || '');
    setContactPhoneOrEmail(v.contactPhoneOrEmail || '');
    setEstimatedCost(v.estimatedCost || '');
    setAgreedCost(v.agreedCost || '');
    setAmountPaid(v.amountPaid || '');
    setBookingStatus(v.bookingStatus);
    setPaymentStatus(v.paymentStatus);
    setContractNotes(v.contractNotes || '');
    setEventNotes(v.eventNotes || '');
    setErrors({});
    setIsAddVendorOpen(true);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateVendor({ name, category, estimatedCost, agreedCost });
    if (!val.isValid) {
      setErrors(val.errors);
      return;
    }

    const estNum = estimatedCost !== '' ? Math.max(0, Number(estimatedCost)) : 0;
    const agreedNum = agreedCost !== '' ? Math.max(0, Number(agreedCost)) : 0;
    const paidNum = amountPaid !== '' ? Math.max(0, Number(amountPaid)) : 0;

    if (editingVendor) {
      onUpdateVendor({
        ...editingVendor,
        name: name.trim(),
        category: category.trim(),
        contactPerson: contactPerson.trim() || undefined,
        contactPhoneOrEmail: contactPhoneOrEmail.trim() || undefined,
        estimatedCost: estNum,
        agreedCost: agreedNum,
        amountPaid: paidNum,
        bookingStatus,
        paymentStatus,
        contractNotes: contractNotes.trim() || undefined,
        eventNotes: eventNotes.trim() || undefined,
      });
    } else {
      const newV: Vendor = {
        id: generateId(),
        eventId: event.id,
        name: name.trim(),
        category: category.trim(),
        contactPerson: contactPerson.trim() || undefined,
        contactPhoneOrEmail: contactPhoneOrEmail.trim() || undefined,
        estimatedCost: estNum,
        agreedCost: agreedNum,
        amountPaid: paidNum,
        bookingStatus,
        paymentStatus,
        contractNotes: contractNotes.trim() || undefined,
        eventNotes: eventNotes.trim() || undefined,
      };
      onAddVendor(newV);
    }

    setIsAddVendorOpen(false);
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    onAddChecklistItem({
      id: generateId(),
      eventId: event.id,
      category: newChecklistCategory.trim() || 'General',
      title: newChecklistTitle.trim(),
      isCompleted: false,
    });
    setNewChecklistTitle('');
  };

  const bookedCount = vendors.filter((v) => v.bookingStatus === 'booked').length;
  const negotiatingCount = vendors.filter((v) => v.bookingStatus === 'negotiating' || v.bookingStatus === 'contacted').length;

  return (
    <div className="space-y-6">
      {/* Header and Toggle Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0f2b20]">
            Vendor & Operational Coordination
          </h1>
          <p className="text-xs text-[#52635b] mt-0.5">
            Manage partner agreements, verify service requirements, and audit logistics checklists.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'vendors' ? (
            <button
              onClick={openAddVendor}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vendor</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Segmented Controls for Sub-views */}
      <div className="flex items-center gap-1 p-1 bg-[#f0eae1] rounded-lg max-w-fit">
        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'vendors'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Vendor Partners ({vendors.length})
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'checklist'
              ? 'bg-white text-[#143c2c] shadow-xs'
              : 'text-[#61746b] hover:text-[#0f2b20]'
          }`}
        >
          Operational Checklist ({checklist.length})
        </button>
      </div>

      {/* VENDORS TAB */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          {/* Status Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
              <span className="text-[11px] text-[#6e7d76]">Confirmed Bookings</span>
              <p className="font-mono text-lg font-bold text-[#143c2c] mt-0.5">
                {bookedCount} / {vendors.length}
              </p>
            </div>
            <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
              <span className="text-[11px] text-[#6e7d76]">In Negotiation</span>
              <p className="font-mono text-lg font-bold text-[#bd9b46] mt-0.5">{negotiatingCount}</p>
            </div>
            <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
              <span className="text-[11px] text-[#6e7d76]">Total Agreed Cost</span>
              <p className="font-mono text-lg font-bold text-[#0f2b20] mt-0.5">
                {formatCurrency(
                  vendors.reduce((s, v) => s + (v.agreedCost || 0), 0),
                  event.currency
                )}
              </p>
            </div>
            <div className="bg-white border border-[#e8dfcf] p-3 rounded-lg">
              <span className="text-[11px] text-[#6e7d76]">Advance Paid</span>
              <p className="font-mono text-lg font-bold text-[#2f7e5f] mt-0.5">
                {formatCurrency(
                  vendors.reduce((s, v) => s + (v.amountPaid || 0), 0),
                  event.currency
                )}
              </p>
            </div>
          </div>

          {/* Vendors Grid */}
          {vendors.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#e8dfcf] text-xs text-[#6e7d76] space-y-2">
              <p>No vendor partners listed yet.</p>
              <button
                onClick={openAddVendor}
                className="text-xs font-semibold text-[#143c2c] hover:underline"
              >
                + Add Your First Vendor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((v) => {
                const outstanding = Math.max(0, (v.agreedCost || v.estimatedCost || 0) - (v.amountPaid || 0));

                return (
                  <div
                    key={v.id}
                    className="bg-white border border-[#e8dfcf] rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-[#d8cdb8] transition-colors shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 border-b border-[#f2ebe0] pb-2.5">
                        <div>
                          <span className="text-[10px] text-[#6e7d76] uppercase tracking-wider font-semibold">
                            {v.category}
                          </span>
                          <h3 className="font-serif text-base font-semibold text-[#0f2b20] line-clamp-1">
                            {v.name}
                          </h3>
                        </div>
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-[#143c2c] bg-[#f5efe4] px-2 py-0.5 rounded">
                          {v.bookingStatus}
                        </span>
                      </div>

                      <div className="py-2.5 space-y-1.5 text-xs text-[#384841]">
                        {v.contactPerson && (
                          <p className="flex items-center gap-1.5 text-[#52635b]">
                            <User className="w-3.5 h-3.5" />
                            <span>{v.contactPerson}</span>
                          </p>
                        )}
                        {v.contactPhoneOrEmail && (
                          <p className="flex items-center gap-1.5 text-[#52635b]">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{v.contactPhoneOrEmail}</span>
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                          <div>
                            <span className="text-[#7d8b84]">Agreed Cost:</span>
                            <p className="font-mono font-semibold text-[#0f2b20]">
                              {formatCurrency(v.agreedCost || v.estimatedCost || 0, event.currency)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#7d8b84]">Paid So Far:</span>
                            <p className="font-mono font-semibold text-[#2f7e5f]">
                              {formatCurrency(v.amountPaid || 0, event.currency)}
                            </p>
                          </div>
                        </div>

                        {outstanding > 0 && (
                          <p className="text-[10px] text-[#8a5d1b] font-mono pt-1">
                            Pending Balance: {formatCurrency(outstanding, event.currency)}
                          </p>
                        )}

                        {v.eventNotes && (
                          <p className="text-[11px] text-[#6e7d76] pt-1 italic line-clamp-2">
                            "{v.eventNotes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#f2ebe0]">
                      <button
                        onClick={() => openEditVendor(v)}
                        className="text-xs text-[#143c2c] hover:underline font-medium flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Details</span>
                      </button>
                      <button
                        onClick={() => onDeleteVendor(v.id)}
                        className="text-xs text-[#85968e] hover:text-rose-700 p-1"
                        title="Remove vendor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Practical Vendor Contract Check Guide */}
          <div className="p-4 bg-[#f8f3ea] border border-[#e8dfcf] rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#0f2b20] font-serif text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#2f7e5f]" />
              <span>CelebrAI Contract & Comparison Advisory</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[#52635b] text-[11px] leading-relaxed">
              <li>Always compare at least 2 itemized quotes for major categories like Venue, Catering, and Media.</li>
              <li>Ensure overtime hourly rate caps and cancellation refund tiers are recorded in writing.</li>
              <li>Verify power backup requirements: Stage equipment and catering deep-freezers require dedicated phases.</li>
            </ul>
          </div>
        </div>
      )}

      {/* CHECKLIST TAB */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Add Checklist Item */}
          <form onSubmit={handleAddChecklist} className="flex gap-2">
            <input
              type="text"
              required
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              placeholder="Add an operational checklist item (e.g., confirm generator fuel)..."
              className="flex-1 px-3 py-2 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
            />
            <input
              type="text"
              value={newChecklistCategory}
              onChange={(e) => setNewChecklistCategory(e.target.value)}
              placeholder="Category (e.g. Venue, AV)"
              className="w-32 px-3 py-2 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none hidden sm:block"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md transition-colors shrink-0"
            >
              Add Item
            </button>
          </form>

          {/* Checklist Items */}
          <div className="bg-white border border-[#e8dfcf] rounded-xl divide-y divide-[#f2ebe0]">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#faf7f2] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => onToggleChecklist(item.id)}
                    className="mt-0.5 text-[#52635b] hover:text-[#143c2c]"
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2f7e5f]" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#a3b3aa]" />
                    )}
                  </button>
                  <div className="space-y-0.5">
                    <span
                      className={`text-xs font-medium ${
                        item.isCompleted ? 'line-through text-[#85968e]' : 'text-[#143c2c]'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#7d8b84] block font-medium uppercase">
                      Category: {item.category}
                    </span>
                    {item.description && (
                      <p className="text-[11px] text-[#6e7d76]">{item.description}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteChecklistItem(item.id)}
                  className="p-1 text-[#85968e] hover:text-rose-700 rounded"
                  title="Delete checklist item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {isAddVendorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1f16]/60 backdrop-blur-xs">
          <div className="bg-[#fdfbf7] border border-[#e8dfcf] rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8f3ea] border-b border-[#e8dfcf]">
              <h3 className="font-serif text-lg font-semibold text-[#0f2b20]">
                {editingVendor ? 'Edit Vendor Record' : 'Add Vendor Partner'}
              </h3>
              <button
                onClick={() => setIsAddVendorOpen(false)}
                className="p-1 text-[#52635b] hover:text-[#0f2b20] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Vendor / Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Royal Caterers"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                  {errors.name && <p className="text-xs text-rose-700 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Service Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  >
                    <option value="Venue">Venue & Hall</option>
                    <option value="Catering">Food & Catering</option>
                    <option value="Photography">Photography & Video</option>
                    <option value="Decor">Decor & Florals</option>
                    <option value="Music">DJ & Sound</option>
                    <option value="Bakery">Cake & Bakery</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Transport">Transportation</option>
                    <option value="Styling">Attire & Styling</option>
                    <option value="Other">Other Service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Manager name"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Phone or Email
                  </label>
                  <input
                    type="text"
                    value={contactPhoneOrEmail}
                    onChange={(e) => setContactPhoneOrEmail(e.target.value)}
                    placeholder="+91 9876543210 or email"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Estimated ({event.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Agreed ({event.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={agreedCost}
                    onChange={(e) => setAgreedCost(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Paid ({event.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Booking Status
                  </label>
                  <select
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value as BookingStatus)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  >
                    <option value="researching">Researching</option>
                    <option value="contacted">Contacted</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="booked">Booked (Confirmed)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partially Paid</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Contract / Terms Notes
                </label>
                <textarea
                  rows={2}
                  value={contractNotes}
                  onChange={(e) => setContractNotes(e.target.value)}
                  placeholder="e.g. Overtime fee ₹5,000/hr, 50% advance deposited..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#143c2c] mb-1">
                  Day-of Execution Notes
                </label>
                <input
                  type="text"
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Load-in time: 10:00 AM at Gate 2"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#d8cdb8] rounded-md focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8dfcf]">
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#52635b] hover:bg-[#ede5d5] rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#143c2c] hover:bg-[#0f2b20] rounded-md shadow-xs"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
