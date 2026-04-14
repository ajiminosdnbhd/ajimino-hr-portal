export interface Holiday {
  date: string
  name: string
}

// Comprehensive Malaysian public holidays — national + all 14 states/territories
// Islamic holiday dates are based on official Malaysian government gazette announcements.
const MY_HOLIDAYS: Holiday[] = [

  // ══════════════════════════════════════════════════════════════════════════
  //  2025
  // ══════════════════════════════════════════════════════════════════════════

  // ── National (all states) ─────────────────────────────────────────────────
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Chinese New Year (2nd Day)' },
  { date: '2025-03-17', name: 'Hari Raya Aidilfitri' },
  { date: '2025-03-18', name: 'Hari Raya Aidilfitri (2nd Day)' },
  { date: '2025-04-10', name: 'Hari Raya Haji' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-12', name: 'Vesak Day' },
  { date: '2025-06-02', name: "Agong's Birthday" },
  { date: '2025-07-10', name: 'Maulidur Rasul' },
  { date: '2025-08-31', name: 'Merdeka Day' },
  { date: '2025-09-16', name: 'Malaysia Day' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-12-25', name: 'Christmas Day' },

  // ── Federal Territories (KL · Putrajaya · Labuan) ─────────────────────────
  { date: '2025-02-01', name: 'Federal Territory Day' },

  // ── Islamic observances (selected states) ─────────────────────────────────
  { date: '2025-01-14', name: 'Nuzul Al-Quran (Kedah / Terengganu)' },
  { date: '2025-02-27', name: 'Israk & Mikraj' },
  { date: '2025-03-29', name: 'Nuzul Al-Quran' },
  { date: '2025-04-11', name: 'Hari Raya Haji (2nd Day)' },
  { date: '2025-06-27', name: 'Awal Muharram' },

  // ── Thaipusam (Selangor · KL · Penang · Perak · Johor · N9) ──────────────
  { date: '2025-02-11', name: 'Thaipusam' },

  // ── Johor ─────────────────────────────────────────────────────────────────
  { date: '2025-03-23', name: "Sultan of Johor's Birthday" },

  // ── Kedah ─────────────────────────────────────────────────────────────────
  { date: '2025-06-21', name: "Sultan of Kedah's Birthday" },

  // ── Kelantan ──────────────────────────────────────────────────────────────
  { date: '2025-11-11', name: "Sultan of Kelantan's Birthday" },
  { date: '2025-11-12', name: "Sultan of Kelantan's Birthday (2nd Day)" },

  // ── Melaka ────────────────────────────────────────────────────────────────
  { date: '2025-08-23', name: "Yang DiPertua Negeri Melaka's Birthday" },
  { date: '2025-10-15', name: 'Melaka Historical City Day' },

  // ── Negeri Sembilan ───────────────────────────────────────────────────────
  { date: '2025-01-19', name: "Yang DiPertuan Besar NS's Birthday" },

  // ── Pahang ────────────────────────────────────────────────────────────────
  { date: '2025-07-30', name: "Sultan of Pahang's Birthday" },

  // ── Penang ────────────────────────────────────────────────────────────────
  { date: '2025-07-12', name: 'George Town Heritage City Day' },
  { date: '2025-08-29', name: "Yang DiPertua Negeri Penang's Birthday" },

  // ── Perak ─────────────────────────────────────────────────────────────────
  { date: '2025-11-21', name: "Sultan of Perak's Birthday" },

  // ── Perlis ────────────────────────────────────────────────────────────────
  { date: '2025-07-17', name: "Raja of Perlis' Birthday" },

  // ── Sabah ─────────────────────────────────────────────────────────────────
  { date: '2025-05-30', name: 'Kaamatan / Harvest Festival (Sabah)' },
  { date: '2025-05-31', name: 'Kaamatan / Harvest Festival — 2nd Day (Sabah)' },
  { date: '2025-12-24', name: 'Christmas Eve (Sabah)' },

  // ── Sarawak ───────────────────────────────────────────────────────────────
  { date: '2025-06-01', name: 'Hari Gawai (Sarawak)' },
  { date: '2025-06-02', name: 'Hari Gawai Holiday (Sarawak)' },
  { date: '2025-07-22', name: 'Sarawak Day' },

  // ── Selangor ──────────────────────────────────────────────────────────────
  { date: '2025-11-01', name: "Sultan of Selangor's Birthday" },
  { date: '2025-12-11', name: "Sultan of Selangor's Birthday (Additional)" },

  // ── Terengganu ────────────────────────────────────────────────────────────
  { date: '2025-03-04', name: "Sultan of Terengganu's Birthday" },
  { date: '2025-04-09', name: 'Hari Arafah (Terengganu)' },


  // ══════════════════════════════════════════════════════════════════════════
  //  2026
  // ══════════════════════════════════════════════════════════════════════════

  // ── National (all states) ─────────────────────────────────────────────────
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-17', name: 'Chinese New Year' },
  { date: '2026-01-18', name: 'Chinese New Year (2nd Day)' },
  { date: '2026-03-06', name: 'Hari Raya Aidilfitri' },
  { date: '2026-03-07', name: 'Hari Raya Aidilfitri (2nd Day)' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-02', name: 'Vesak Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-05-28', name: 'Hari Raya Haji (2nd Day)' },
  { date: '2026-06-01', name: "Agong's Birthday" },
  { date: '2026-06-29', name: 'Maulidur Rasul' },
  { date: '2026-08-31', name: 'Merdeka Day' },
  { date: '2026-09-16', name: 'Malaysia Day' },
  { date: '2026-11-08', name: 'Deepavali' },
  { date: '2026-12-25', name: 'Christmas Day' },

  // ── Federal Territories ───────────────────────────────────────────────────
  { date: '2026-02-01', name: 'Federal Territory Day' },

  // ── Islamic observances ───────────────────────────────────────────────────
  { date: '2026-01-03', name: 'Nuzul Al-Quran (Kedah / Terengganu)' },
  { date: '2026-02-16', name: 'Israk & Mikraj' },
  { date: '2026-03-19', name: 'Nuzul Al-Quran' },
  { date: '2026-06-17', name: 'Awal Muharram' },

  // ── Thaipusam ─────────────────────────────────────────────────────────────
  { date: '2026-03-31', name: 'Thaipusam' },

  // ── Johor ─────────────────────────────────────────────────────────────────
  { date: '2026-03-23', name: "Sultan of Johor's Birthday" },

  // ── Kedah ─────────────────────────────────────────────────────────────────
  { date: '2026-06-21', name: "Sultan of Kedah's Birthday" },

  // ── Kelantan ──────────────────────────────────────────────────────────────
  { date: '2026-11-11', name: "Sultan of Kelantan's Birthday" },
  { date: '2026-11-12', name: "Sultan of Kelantan's Birthday (2nd Day)" },

  // ── Melaka ────────────────────────────────────────────────────────────────
  { date: '2026-08-29', name: "Yang DiPertua Negeri Melaka's Birthday" },
  { date: '2026-10-15', name: 'Melaka Historical City Day' },

  // ── Negeri Sembilan ───────────────────────────────────────────────────────
  { date: '2026-01-18', name: "Yang DiPertuan Besar NS's Birthday" },

  // ── Pahang ────────────────────────────────────────────────────────────────
  { date: '2026-07-30', name: "Sultan of Pahang's Birthday" },

  // ── Penang ────────────────────────────────────────────────────────────────
  { date: '2026-07-11', name: 'George Town Heritage City Day' },
  { date: '2026-08-28', name: "Yang DiPertua Negeri Penang's Birthday" },

  // ── Perak ─────────────────────────────────────────────────────────────────
  { date: '2026-11-20', name: "Sultan of Perak's Birthday" },

  // ── Perlis ────────────────────────────────────────────────────────────────
  { date: '2026-07-17', name: "Raja of Perlis' Birthday" },

  // ── Sabah ─────────────────────────────────────────────────────────────────
  { date: '2026-05-30', name: 'Kaamatan / Harvest Festival (Sabah)' },
  { date: '2026-05-31', name: 'Kaamatan / Harvest Festival — 2nd Day (Sabah)' },
  { date: '2026-12-24', name: 'Christmas Eve (Sabah)' },

  // ── Sarawak ───────────────────────────────────────────────────────────────
  { date: '2026-06-01', name: 'Hari Gawai (Sarawak)' },
  { date: '2026-06-02', name: 'Hari Gawai Holiday (Sarawak)' },
  { date: '2026-07-22', name: 'Sarawak Day' },

  // ── Selangor ──────────────────────────────────────────────────────────────
  { date: '2026-11-01', name: "Sultan of Selangor's Birthday" },
  { date: '2026-12-11', name: "Sultan of Selangor's Birthday (Additional)" },

  // ── Terengganu ────────────────────────────────────────────────────────────
  { date: '2026-03-07', name: "Sultan of Terengganu's Birthday" },
  { date: '2026-05-16', name: 'Hari Arafah (Terengganu)' },
]

// Keep backward-compat export (used in dashboard & calendar panels)
export const SELANGOR_HOLIDAYS = MY_HOLIDAYS

export function isHoliday(dateStr: string): Holiday | undefined {
  const matches = MY_HOLIDAYS.filter(h => h.date === dateStr)
  if (matches.length === 0) return undefined
  if (matches.length === 1) return matches[0]
  // Combine names when multiple holidays fall on the same date
  return { date: dateStr, name: matches.map(h => h.name).join(' · ') }
}

export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return MY_HOLIDAYS.filter(h => h.date.startsWith(prefix))
}
