// The bracket format's settings (Aesthetic tool → Brackets; Kyle 2026-11-21). Saved with the site look
// (src/lib/siteLook.ts, site_aesthetic_versions); the live bracket page uses the new format once "live" is saved on.
export type BracketLook = {
  split: boolean          // halves facing each other (else one tree left to right)
  cardW: number           // card width, px
  rowH: number            // one wrestler's line, px
  firstRowH: number       // a first-round wrestler's line (the round with the most bouts), px
  pigtailRowH: number     // a pigtail's line (a bout whose winner meets a wrestler who had a bye), px
  gap: number             // space between first-round cards, px
  font: number            // name size, px
  lastNameOnly: boolean
  showSchool: boolean     // a school line under each name in the compact card
  hover: boolean          // hover opens the full bout
  fit: boolean            // card width sized so the whole tree fits the page width (cardW is then the most a card gets)
  live: boolean           // the live bracket page uses this format (Kyle saves it on in the Aesthetic tool = approved)
}
export const BRACKET_LOOK_DEFAULT: BracketLook = { split: true, cardW: 120, rowH: 16, firstRowH: 13, pigtailRowH: 11, gap: 3, font: 10, lastNameOnly: true, showSchool: false, hover: true, fit: true, live: false }
