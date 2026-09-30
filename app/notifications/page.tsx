'use client' 
import { AlertBox } from '@/components/alert-box'
import { DataTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function NotificationsPage() {
  const notificationData = [
    {
      timestamp: '2026-03-07 14:38:25',
      channel: 'WhatsApp',
      recipient: '+91 98765 43210',
      role: 'Doctor',
      eventType: 'Doctor Approved',
      entityId: 'SYR-D-0887',
      template: 'doctor_approval_v1',
      status: 'Delivered',
    },
    {
      timestamp: '2026-03-07 14:15:10',
      channel: 'WhatsApp',
      recipient: '+91 98765 01234',
      role: 'Patient',
      eventType: 'Booking Confirmed',
      entityId: 'APT-20260307-042',
      template: 'booking_confirm_v2',
      status: 'Delivered',
    },
    {
      timestamp: '2026-03-07 12:08:85',
      channel: 'WhatsApp',
      recipient: '+91 98765 01234',
      role: 'Patient',
      eventType: 'Appointment Reminder',
      entityId: 'APT-20260308-051',
      template: 'appt_reminder_24hr_v1',
      status: 'Delivered',
    },
    {
      timestamp: '2026-03-07 11:55:44',
      channel: 'WhatsApp',
      recipient: '+91 97654 32101',
      role: 'Doctor',
      eventType: 'New Appointment Booked',
      entityId: 'APT-20260308-051',
      template: 'new_booking_doctor_v1',
      status: 'Delivered',
    },
    {
      timestamp: '2026-03-07 11:42:18',
      channel: 'WhatsApp',
      recipient: '+91 97654 21099',
      role: 'Patient',
      eventType: 'Refund Initiated',
      entityId: 'APT-20260386-811',
      template: 'refund_initiated_v1',
      status: 'Delivered',
    },
    {
      timestamp: '2026-03-07 09:05:33',
      channel: 'SMS',
      recipient: '+91 87654 00112',
      role: 'Doctor',
      eventType: 'Doctor Suspended',
      entityId: 'SYR-D-0843',
      template: 'doctor_suspend_v1',
      status: 'Delivered',
    },
    {
      timestamp: '2026-03-06 16:25:02',
      channel: 'WhatsApp',
      recipient: '+91 97654 21099',
      role: 'Patient',
      eventType: 'Appointment Rescheduled',
      entityId: 'APT-20260386-028',
      template: 'reschedule_v1',
      status: 'Failed',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Notification Log</h1>
          <button className="text-sm font-medium text-primary hover:underline">
            Export CSV
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Record of all WhatsApp & SMS notifications sent by the platform — read-only
        </p>
      </div>

      {/* Phase 2 Feature Alert */}
      <AlertBox type="warning">
        <div>
          <span className="font-semibold">Phase 2 Feature — Prototype Preview Only.</span> Per SOW §19, the Notification Delivery Admin UI View is deferred to Phase 2. Backend notification logging is active in Phase 1 (all events are recorded server-side), but this admin-facing view and CSV export will be delivered in Phase 2. This screen is shown here as a design reference only and will{' '}
          <span className="font-semibold">not</span> be included in Phase 1 deliverables.
        </div>
      </AlertBox>

      {/* Phase 1 Channels Info */}
      <AlertBox type="info">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <span className="font-semibold">Phase 1 Notification Channels:</span> WhatsApp (primary) + SMS (fallback). No in-app push notifications (no Firebase/FCM). WhatsApp is one-way, template-based only. All template approvals and Meta policy compliance are Client&apos;s sole responsibility. Dwellings does not guarantee delivery rates.
          </div>
        </div>
      </AlertBox>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <FilterBar
            filters={[
              {
                id: 'dateFrom',
                type: 'date',
                label: 'Start Date',
              },
              {
                id: 'dateTo',
                type: 'date',
                label: 'End Date',
              },
              {
                id: 'channels',
                type: 'select',
                placeholder: 'All Channels',
                options: [
                  { value: 'all', label: 'All Channels' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'sms', label: 'SMS' },
                ],
              },
              {
                id: 'eventTypes',
                type: 'select',
                placeholder: 'All Event Types',
                options: [
                  { value: 'all', label: 'All Event Types' },
                  { value: 'doctor_approved', label: 'Doctor Approved' },
                  { value: 'booking_confirmed', label: 'Booking Confirmed' },
                  { value: 'appointment_reminder', label: 'Appointment Reminder' },
                  { value: 'refund_initiated', label: 'Refund Initiated' },
                ],
              },
              {
                id: 'statuses',
                type: 'select',
                placeholder: 'All Statuses',
                options: [
                  { value: 'all', label: 'All Statuses' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'pending', label: 'Pending' },
                ],
              },
              {
                id: 'recipient',
                type: 'text',
                placeholder: 'Recipient mobile / email',
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Notifications ({notificationData.length})</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Showing 5 of 1,284 notifications</p>
        </CardHeader>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              {
                header: 'TIMESTAMP',
                key: 'timestamp',
              },
              {
                header: 'CHANNEL',
                key: 'channel',
                render: (value) => (
                  <Badge variant="secondary" className="font-medium">
                    {value}
                  </Badge>
                ),
              },
              {
                header: 'RECIPIENT',
                key: 'recipient',
              },
              {
                header: 'ROLE',
                key: 'role',
                render: (value) => (
                  <span className="text-sm font-medium text-primary">● {value}</span>
                ),
              },
              {
                header: 'EVENT TYPE',
                key: 'eventType',
                render: (value) => (
                  <StatusBadge status="pending">{value}</StatusBadge>
                ),
              },
              {
                header: 'ENTITY ID',
                key: 'entityId',
              },
              {
                header: 'TEMPLATE',
                key: 'template',
              },
              {
                header: 'STATUS',
                key: 'status',
                render: (value) => (
                  <StatusBadge status={value === 'Delivered' ? 'active' : 'failed'}>
                    {value}
                  </StatusBadge>
                ),
              },
            ]}
            data={notificationData}
          />
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing 5 of 1,284 notifications</span>
            <div className="flex gap-2">
              <button className="font-medium text-primary hover:underline">1</button>
              <button className="hover:underline">2</button>
              <button className="hover:underline">52</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
