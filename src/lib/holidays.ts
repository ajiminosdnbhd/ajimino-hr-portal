export interface Holiday {
  date: string
  name: string
}

export const SELANGOR_HOLIDAYS: Holiday[] = [
  // 2025
  { date: '2025-01-01', name: 'New Year\'s Day' },
  { date: '2025-01-02', name: 'Replacement Holiday' },
  { date: '2025-01-14', name: 'Hari Nuzu Quran' },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Chinese New Year (2nd Day)' },
  { date: '2025-02-01', name: 'Federal Territory Day' },
  { date: '2025-02-11', name: 'Thaipusam' },
  { date: '2025-02-27', name: 'Israk & Mikraj' },
  { date: '2025-03-17', name: 'Hari Raya Aidilfitri' },
  { date: '2025-03-18', name: 'Hari Raya Aidilfitri (2nd Day)' },
  { date: '2025-03-29', name: 'Nuzul Al-Quran' },
  { date: '2025-04-10', name: 'Hari Raya Haji' },
  { date: '2025-04-11', name: 'Hari Raya Haji (2nd Day)' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-01', name: 'Awal Muharram' },
  { date: '2025-05-12', name: 'Vesak Day' },
  { date: '2025-06-02', name: 'Agong\'s Birthday' },
  { date: '2025-07-10', name: 'Maulidur Rasul' },
  { date: '2025-08-31', name: 'Merdeka Day' },
  { date: '2025-09-16', name: 'Malaysia Day' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-11-01', name: 'Sultan of Selangor\'s Birthday' },
  { date: '2025-12-11', name: 'Sultan of Selangor\'s Birthday (Additional)' },
  { date: '2025-12-25', name: 'Christmas Day' },

  // 2026
  { date: '2026-01-01', name: 'New Year\'s Day' },
  { date: '2026-01-03', name: 'Hari Nuzu Quran' },
  { date: '2026-01-17', name: 'Chinese New Year' },
  { date: '2026-01-18', name: 'Chinese New Year (2nd Day)' },
  { date: '2026-02-01', name: 'Federal Territory Day' },
  { date: '2026-02-16', name: 'Israk & Mikraj' },
  { date: '2026-03-06', name: 'Hari Raya Aidilfitri' },
  { date: '2026-03-07', name: 'Hari Raya Aidilfitri (2nd Day)' },
  { date: '2026-03-19', name: 'Nuzul Al-Quran' },
  { date: '2026-03-31', name: 'Thaipusam' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-02', name: 'Vesak Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-05-28', name: 'Hari Raya Haji (2nd Day)' },
  { date: '2026-06-01', name: 'Agong\'s Birthday' },
  { date: '2026-06-17', name: 'Awal Muharram' },
  { date: '2026-06-29', name: 'Maulidur Rasul' },
  { date: '2026-08-31', name: 'Merdeka Day' },
  { date: '2026-09-16', name: 'Malaysia Day' },
  { date: '2026-11-08', name: 'Deepavali' },
  { date: '2026-11-01', name: 'Sultan of Selangor\'s Birthday' },
  { date: '2026-12-11', name: 'Sultan of Selangor\'s Birthday (Additional)' },
  { date: '2026-12-25', name: 'Christmas Day' },
]

export function isHoliday(dateStr: string): Holiday | undefined {
  return SELANGOR_HOLIDAYS.find(h => h.date === dateStr)
}

export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return SELANGOR_HOLIDAYS.filter(h => h.date.startsWith(prefix))
}
