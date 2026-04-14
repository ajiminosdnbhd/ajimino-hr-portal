export interface Profile {
  id: string
  name: string
  department: string
  role: 'management' | 'hr' | 'staff'
  al_entitled: number
  ml_entitled: number
  al_used: number
  ml_used: number
  join_date: string
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  user_name: string
  department: string
  room_id: string
  date: string
  start_time: string
  end_time: string
  purpose: string
  attendee_ids: string[] | null
  attendee_names: string[] | null
  created_at: string
}

export interface Leave {
  id: string
  user_id: string
  user_name: string
  department: string
  type: 'Annual Leave' | 'Medical Leave'
  start_date: string
  end_date: string
  days: number
  reason: string
  remarks: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancellation_requested' | 'cancelled'
  receipt_path: string | null
  receipt_name: string | null
  approved_by: string | null
  approved_at: string | null
  cancellation_reason: string | null
  created_at: string
}

export interface Policy {
  id: string
  title: string
  content: string
  target_departments: string[]
  attachment_path: string | null
  attachment_name: string | null
  created_by: string
  created_at: string
}

export interface Payslip {
  id: string
  user_id: string
  user_name: string
  department: string
  month: number
  year: number
  file_path: string
  file_name: string
  uploaded_by: string
  created_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  event_time: string | null       // start time (kept for backward compat)
  event_end_time: string | null   // end time
  description: string | null
  color: string
  created_by: string
  created_at: string
  // Visibility targeting
  visibility: 'all' | 'department' | 'individual'
  target_department: string | null
  target_user_ids: string[] | null
  // Ownership — used to determine if current user can edit/delete
  created_by_id: string | null
  created_by_role: 'management' | 'hr' | 'staff' | null
  room_id: string | null
  participant_ids: string[] | null
  participant_names: string[] | null
}

export const ROOMS = [
  { id: 'big-meeting-room', name: 'Big Meeting Room', capacity: 20, color: '#4f46e5' },
  { id: 'small-meeting-room', name: 'Small Meeting Room', capacity: 8, color: '#059669' },
  { id: 'discussion-room', name: 'Discussion Room', capacity: 4, color: '#d97706' },
] as const

export const DEPARTMENTS = ['Management', 'HR', 'Sales', 'Operations', 'Marketing'] as const

export function getRoleFromDepartment(department: string): 'management' | 'hr' | 'staff' {
  if (department === 'Management') return 'management'
  if (department === 'HR') return 'hr'
  return 'staff'
}
