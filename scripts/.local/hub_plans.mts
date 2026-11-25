// The 2026 offseason load plans (Kyle 2026-11-12/13): each event's files, date, tournaments per pool, and where each
// division goes. Shared by load_more.mts (placements) and load_hub_bouts (head-to-head bouts).
// 'HS-M' / 'HS-F': a 14U or 16U division (Kyle 2026-11-12): high school unless the roster grade is 8th or below
export type Dest = 'M' | 'F' | 'X' | 'skip' | 'HS-M' | 'HS-F'
export type Plan = { label: string; files: string[]; gradesFrom?: string;   // a roster to take grades from (placements copies have none)
  date: string | null; tournaments: Partial<Record<'M' | 'F' | 'X', string>>; newMixed?: { name: string; level: string; location: string; time_of_year: string }; dest: Record<string, Dest> }
export const MOB = ['106', '113', '120', '126 - 2026 Mobbin Classic — Toms River, New Jersey - 126', '132', '138', '144', '150', '157-', '165-', '175', '190', '215', '285']
export const PLANS: Plan[] = [
  // Super 32 (10/24/2026): loaded 2026-11-12 with scripts/.local/s32_*; listed here for its bouts
  { label: 'Super 32', files: ['Super 32 Roster.rtf', '2026DefenseSoapSuper32Challenge.csv'], date: '2026-10-24',
    tournaments: { M: 'Super 32 Challenge', F: 'Super 32 Challenge', X: 'Super 32 Challenge (MS Division)' },
    dest: { 'High School Boys': 'M', 'High School Girls': 'F', 'Middle School': 'X', '11U': 'X', '8U': 'X' } },
  { label: 'Early Qualifier', files: ['super 32 early qualifier.rtf', '2026NJSuper32EarlyEntry.csv'], date: '2026-08-30',
    tournaments: { M: 'Super 32 NJ Early Qualifier', F: 'Super 32 NJ Early Qualifier', X: 'Super 32 NJ Early Qualifier (MS / Youth)' },
    newMixed: { name: 'Super 32 NJ Early Qualifier (MS / Youth)', level: 'state', location: 'Manalapan, NJ', time_of_year: 'Late August' },
    dest: { 'High School Boys': 'M', 'High School Girls FS': 'F', 'Middle School': 'X', Elementary: 'X' } },
  { label: 'Journeymen', files: ['Journeymen Fall Classic.rtf', '2026JourneymenFallClassic.csv'], date: '2026-10-02',
    tournaments: { M: 'Journeymen Fall Classic', F: 'Journeymen Fall Classic', X: 'Journeymen Fall Classic (Overflo MS Division)' },
    dest: { Main: 'M', Over: 'M', 'Unlabeled (weight 215)': 'M', Girls: 'F', '14 U': 'HS-M', '11 U': 'X', 'Unlabeled (weight 135)': 'skip' } },
  // Flo placements copies (Kyle 2026-11-13), for the brackets the bout files couldn't place
  { label: 'Journeymen Flo', files: ['2026 Journeymen Fall Classic.rtfd'], gradesFrom: 'Journeymen Fall Classic.rtf', date: '2026-10-02',
    tournaments: { M: 'Journeymen Fall Classic', F: 'Journeymen Fall Classic', X: 'Journeymen Fall Classic (Overflo MS Division)' },
    dest: { Main: 'M', Over: 'M', Girls: 'F', '14 U': 'HS-M', '11 U': 'X' } },
  { label: 'NJ FS Flo', files: ['2026 New Jersey Freestyle & Greco State Championship Placements.rtfd'], gradesFrom: '2026 New Jersey Freestyle & Greco State Championship.rtf', date: '2026-05-17',
    tournaments: { M: 'USAW-NJ Freestyle & Greco State Championships', F: 'USAW-NJ Freestyle & Greco State Championships', X: 'USAW-NJ Freestyle & Greco State Championships (Youth / 14U)' },
    dest: { '16U Boys Freestyle': 'HS-M', 'Junior Boys Freestyle': 'M', '16U Girls Freestyle': 'HS-F', 'Junior Girls Freestyle': 'F', '14U Boys Freestyle': 'HS-M', '14U Girls Freestyle': 'HS-F', '12U Boys Freestyle': 'X' } },
  { label: 'NJ Scholastic', files: ['2026 New Jersey Scholastic State Championship.rtf', '2026NewJerseyScholasticStateChampionship.csv'], date: '2026-03-20',
    tournaments: { M: 'USAW-NJ Scholastic State Championships (Cadet/16U)', F: 'USAW-NJ Scholastic State Championships (Cadet/16U)', X: 'USAW-NJ Scholastic State Championships (NJUSA)' },
    // Junior (ages 13-14): Middle School Hub (Kyle 2026-11-13: "middle school")
    dest: { 'Boys Cadets (9th & 10th Grade)': 'M', 'Girls 16U': 'HS-F', 'Boys Junior': 'X', 'Girls Junior': 'X', 'Boys Novice': 'X', 'Girls Novice': 'X',
      'Boys Intermediate': 'X', 'Girls Intermediate': 'X', 'Boys Bantam': 'X', 'Girls Bantam': 'X', 'Boys Tot': 'X', 'Girls Tot': 'X' } },
  { label: 'NJ Scholastic 2025', files: ['../Middle School Championships/2025 New Jersey Scholastic State Championship.rtf', '../Middle School Championships/2025 Middle School Boys.csv'], date: '2025-03-15',
    tournaments: { M: 'USAW-NJ Scholastic State Championships (Cadet/16U)', F: 'USAW-NJ Scholastic State Championships (Cadet/16U)', X: 'USAW-NJ Scholastic State Championships (NJUSA)' },
    dest: { 'Boys Cadets (9th & 10th Grade)': 'M', 'Girls 16U': 'HS-F', 'Boys Junior': 'X', 'Girls Junior': 'X', 'Boys Novice': 'X', 'Girls Novice': 'X',
      'Boys Intermediate': 'X', 'Girls Intermediate': 'X', 'Boys Bantam': 'X', 'Girls Bantam': 'X', 'Boys Tot': 'X', 'Girls Tot': 'X' } },
  { label: 'NJ Scholastic 2024', files: ['../Middle School Championships/2024 USAW-NJ Kids Scholastic State Championships.rtfd', '../Middle School Championships/2024 Middle School Boys.csv'], date: '2024-03-09',
    tournaments: { M: 'USAW-NJ Scholastic State Championships (Cadet/16U)', F: 'USAW-NJ Scholastic State Championships (Cadet/16U)', X: 'USAW-NJ Scholastic State Championships (NJUSA)' },
    dest: { 'Cadets (9th & 10th Grade)': 'M', 'Girls 16U': 'HS-F', Junior: 'X', 'Girls Junior': 'X', Novice: 'X', 'Girls Novice': 'X', Intermediate: 'X', 'Girls Intermediate': 'X', Bantam: 'X', 'Girls Bantam': 'X', Tot: 'X', 'Girls Tot': 'X' } },
  { label: 'NJ Scholastic 2023', files: ['../Middle School Championships/2023 New Jersey Scholastic State Championship.rtfd', '../Middle School Championships/2023 Middle School Boys.csv'], date: '2023-03-11',
    tournaments: { M: 'USAW-NJ Scholastic State Championships (Cadet/16U)', F: 'USAW-NJ Scholastic State Championships (Cadet/16U)', X: 'USAW-NJ Scholastic State Championships (NJUSA)' },
    dest: { 'Cadets (9th & 10th Grade)': 'M', 'Girls 16U': 'HS-F', 'Girls 14U': 'X', 'Girls 12U': 'X', 'Girls 10U': 'X', 'Girls 8U': 'X', Junior: 'X', Novice: 'X', Intermediate: 'X', Bantam: 'X', Tot: 'X' } },
  // Brawl at the Beach (7/15-17/2026, Bally's Atlantic City): individual brackets only — the Duals divisions are
  // team duals (Kyle: individual tournaments only); adult divisions not tracked
  { label: 'Brawl', files: ['Brawl at the Beach.rtfd', 'BrawlattheBeach.csv'], date: '2026-07-15',
    tournaments: { M: 'Brawl at the Beach', F: 'Brawl at the Beach', X: 'Brawl at the Beach (MS Division)' },
    dest: { HS: 'M', 'Boys Freestyle HS': 'M', 'GIRLS HS': 'F', 'Girls Freestyle HS': 'F', '15U': 'HS-M',
      '13U': 'X', '11U': 'X', '9U': 'X', '7U': 'X', 'GIRLS 6-8': 'X', 'GIRLS K-5': 'X', 'Girls Freestyle MS': 'X', 'Boys Freestyle MS': 'X', 'Girls Freestyle K-6': 'X', 'Boys Freestyle K-6': 'X',
      ...Object.fromEntries(['HS Boys Duals', 'Girls HS Folkstyle Duals', 'Girls HS Freestyle Duals', 'Girls K-8 Folkstyle Duals', 'Girls K-8 Freestyle Duals', '15U Duals', '12U Duals', '10U Duals', '8U Duals', 'Adult Open', 'Mens Free Style', 'Unlabeled (weight 80)'].map(d => [d, 'skip' as Dest])) } },
  { label: 'NHSCA', files: ['NHSCA High School Nationals.rtf', '2026NHSCAHighSchoolNationals.csv'], date: '2026-03-26',
    tournaments: { M: 'NHSCA High School Nationals', F: 'NHSCA High School Nationals', X: 'NHSCA Middle School Nationals' },
    dest: { Freshman: 'M', Sophomore: 'M', Junior: 'M', Senior: 'M', Girls: 'F', 'Middle School': 'X' } },
  { label: 'War at the Shore', files: ['war at the shore.rtf', '2026WarattheShore.csv'], date: '2026-04-03',
    tournaments: { M: 'War at the Shore (HS Open)', F: 'War at the Shore (HS Open)', X: 'War at the Shore' },
    dest: { 'High School': 'M', 'MEN FREESTYLE': 'M', 'Girls - High School': 'F', 'GIRLS FREESTYLE': 'F',
      'Girls - MS, 6th - 8th Grade': 'X', Intermediate: 'X', Junior: 'X', Midget: 'X', Bantam: 'X', 'Girls Elementary School (K-5)': 'X', 'Kindergarten (Tot)': 'X', Tot: 'X',
      // second-chance brackets, adults and two unlabeled tot brackets: not tracked
      'Tot-2nd Chance': 'skip', 'High School-2nd Chance': 'skip', 'Junior-2nd Chance': 'skip', 'Midget-2nd Chance': 'skip', 'Bantam-2nd Chance': 'skip', 'Intermediate-2nd Chance': 'skip', Adults: 'skip', 'Unlabeled (weight 38-T)': 'skip', 'Unlabeled (weight 41-T)': 'skip' } },
  { label: 'NJ Freestyle States', files: ['2026 New Jersey Freestyle & Greco State Championship.rtf', '2026NewJerseyFreestyle&GrecoStateChampionship.csv'], date: '2026-05-17',
    tournaments: { M: 'USAW-NJ Freestyle & Greco State Championships', F: 'USAW-NJ Freestyle & Greco State Championships', X: 'USAW-NJ Freestyle & Greco State Championships (Youth / 14U)' },
    dest: { '16U Boys Freestyle': 'HS-M', 'Junior Boys Freestyle': 'M', '16U Girls Freestyle': 'HS-F', 'Junior Girls Freestyle': 'F',
      '14U Boys Freestyle': 'HS-M', '14U Girls Freestyle': 'HS-F', '12U Boys Freestyle': 'X', '10U Boys Freestyle': 'X', '8U Boys Freestyle': 'X', '10U Girls Freestyle': 'X', '8U Girls Freestyle': 'X',
      ...Object.fromEntries(['14U Boys Greco', '16U Boys Greco', 'Junior Boys Greco', '12U Boys Greco', '10U Boys Greco', '8U Boys Greco'].map(d => [d, 'skip' as Dest])),
      ...Object.fromEntries(['94', '67', '84', '59', '70', '63', '115', '108', '140'].map(w => [`Unlabeled (weight ${w})`, 'skip' as Dest])) } },
  { label: 'Northeast Regional', files: ['2026 Phil Portuese Northeast Regional Championships.rtf'], date: '2026-05-08',
    tournaments: { M: 'USAW Northeast Regional Championships', F: 'USAW Northeast Regional Championships', X: 'USAW Northeast Regional Championships (14U)' },
    newMixed: { name: 'USAW Northeast Regional Championships (14U)', level: 'regional', location: 'Northeast', time_of_year: 'May' },
    dest: { 'Junior FS': 'M', '16U FS': 'M', 'Junior Girls FS': 'F', '16U Girls FS': 'F', '14U FS': 'HS-M', '14U Girls FS': 'HS-F' } },   // 14U: high school (no grades in this file), Kyle 2026-11-13
  { label: 'Mobbin', files: [...MOB.map(w => `Mobbin/${w.includes('Mobbin') ? w : `${w}${w.endsWith('-') ? '' : ' -'} 2026 Mobbin Classic — Toms River, New Jersey`}.pdf`),
      ...['Girls 105', 'Girls 125', 'Girls 130', 'Girls 135', 'Girls 145', 'Girls 155', 'Grils 115'].map(w => `Mobbin/${w} - 2026 Mobbin Classic — Toms River, New Jersey.pdf`)], date: null,
    tournaments: { M: 'Mobbin Classic Preseason Open', F: 'Mobbin Classic Preseason Open' },
    dest: { 'High School': 'M', Girls: 'F' } },
]

