'use client'

// How to add results to the tournament hubs — for Kyle's team (2026-11-12). Matches what the uploader reads
// (src/lib/hubFiles.ts); update both together.

const h = 'text-sm font-semibold text-slate-900 mt-5 mb-1'
const p = 'text-sm text-slate-700'
const li = 'text-sm text-slate-700'

export function HowTo() {
  return (
    <div className="max-w-3xl">
      <p className={p}>Each tournament&apos;s results are added on its year&apos;s page. The files are read on your computer, then you check what was found and confirm who each NJ kid is. Individual tournaments only; duals aren&apos;t tracked.</p>

      <h3 className={h}>1. Open the tournament&apos;s year</h3>
      <ol className="list-decimal ml-5 space-y-0.5">
        <li className={li}>Pick the hub: <b>Offseason Hub</b> for high school divisions, <b>Middle School Hub</b> for middle school and youth (it&apos;s one pool for boys and girls).</li>
        <li className={li}>Choose the season at the top. On the <b>Tournaments</b> tab, click the tournament, then <b>Enter</b> the season (add the start date). The offseason season is the calendar year; middle school runs June–May.</li>
        <li className={li}>Click the year to open its page.</li>
      </ol>

      <h3 className={h}>2. Get the files</h3>
      <table className="w-full text-sm border border-slate-200 mt-1">
        <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-left text-[11px] uppercase text-slate-500"><th className="px-3 py-1">Where the results are</th><th className="px-3 py-1">What to save</th></tr></thead>
        <tbody>
          <tr className="border-b border-slate-100 align-top"><td className="px-3 py-1 font-medium">TrackWrestling<br /><span className="font-normal text-slate-500">Super 32, NHSCA, War at the Shore, Journeymen, NJ Scholastic and Freestyle/Greco States, Super 32 Early Entry</span></td>
            <td className="px-3 py-1">Two files: the <b>bout export</b> (the CSV download of all matches) and the <b>roster</b> (the wrestler list page: copy it all, paste into a document). The roster names each bracket&apos;s division and gives grades — upload both together.</td></tr>
          <tr className="border-b border-slate-100 align-top"><td className="px-3 py-1 font-medium">USA Bracketing<br /><span className="font-normal text-slate-500">Fargo, USA Wrestling regionals</span></td>
            <td className="px-3 py-1">The event&apos;s <b>Placements</b> tab with every division showing (&ldquo;1st - Name (State)&rdquo;): copy it all, paste into a document.</td></tr>
          <tr className="border-b border-slate-100 align-top"><td className="px-3 py-1 font-medium">FloArena<br /><span className="font-normal text-slate-500">Northeast Regional, Journeymen, NJ Freestyle</span></td>
            <td className="px-3 py-1">The <b>placements</b> page (division, place, weight, &ldquo;Name (Club)&rdquo;) or the <b>Results</b> page with every weight&apos;s places (&ldquo;106 lbs - 1st-8th&rdquo;): copy it all, paste into a document. Use it when a bout export can&apos;t be placed — Journeymen&apos;s pool brackets, freestyle and Greco mixed together.</td></tr>
          <tr className="border-b border-slate-100 align-top"><td className="px-3 py-1 font-medium">Duals<br /><span className="font-normal text-slate-500">NHSCA National Duals, AAU Scholastic Duals</span></td>
            <td className="px-3 py-1">The duals <b>results</b> page with the <b>participants</b> page (copy both into one document; Flo shows one division at a time — copy each). Duals give <b>bouts only</b>, no places: who beat whom, for the leaderboard&apos;s notable results. Names like &ldquo;N. Schuman&rdquo; are filled in from the participants list.</td></tr>
          <tr className="align-top"><td className="px-3 py-1 font-medium">Mobbin</td>
            <td className="px-3 py-1">Save each bracket as a <b>PDF</b> and name it by weight: &ldquo;126 - Mobbin.pdf&rdquo;, girls &ldquo;Girls 105 - Mobbin.pdf&rdquo;. The PDF itself doesn&apos;t say the weight.</td></tr>
        </tbody>
      </table>

      <h3 className={h}>Saving a copied page</h3>
      <p className={p}>Paste into TextEdit (or Word) and save as <b>.rtf</b> or <b>.txt</b>. In TextEdit choose <b>Format → Make Plain Text</b> first: if the copy brought along a logo, TextEdit saves an .rtfd, which can&apos;t be uploaded.</p>

      <h3 className={h}>3. Upload</h3>
      <ol className="list-decimal ml-5 space-y-0.5">
        <li className={li}>On the year&apos;s page: <b>Add results → Choose files</b>, and pick all of that tournament&apos;s files at once.</li>
        <li className={li}>Check the files list: anything in <span className="text-red-600">red (&ldquo;not recognized&rdquo;)</span> wasn&apos;t read. Mobbin PDFs show the weight and division from the file name — fix them if wrong.</li>
        <li className={li}>Check the divisions found. Each has a <b>style</b> and where it <b>belongs</b>; the ones for this hub are ticked (Greco isn&apos;t tracked). &ldquo;Unlabeled (weight …)&rdquo; means the roster didn&apos;t name it — tick it with the right destination or leave it out.</li>
        <li className={li}>Click <b>Review</b>. Divisions that belong on the other hub: upload the same files on that hub&apos;s year page.</li>
        <li className={li}>A duals page shows its bout count instead of divisions: click <b>Review bouts for this hub</b> (boys, girls, or middle school and elementary on the Middle School Hub).</li>
      </ol>

      <h3 className={h}>4. Confirm who each kid is, then save</h3>
      <ul className="list-disc ml-5 space-y-0.5">
        <li className={li}>NJ kids are listed first. A single exact match to one of our wrestlers or prospects is filled in; <span className="bg-amber-50 px-1">yellow rows</span> need a pick (two possible matches).</li>
        <li className={li}>Watch for a kid listed under another form of their name (Bobby / Robert, Mako / Joseph): pick their profile from the list, or leave &ldquo;New prospect&rdquo;.</li>
        <li className={li}>Kids from other states are matched only to a wrestler at a school in their state; middle school kids are never matched to a high schooler.</li>
        <li className={li}>Save. The page then shows the podium and &ldquo;placed through&rdquo; how deep the results go. Uploading the same file again adds nothing (it&apos;s refused as already loaded).</li>
      </ul>

      <h3 className={h}>If something looks wrong</h3>
      <p className={p}>Check a few places against the site the first time each year — Mobbin especially. If a file isn&apos;t recognized or the places are off, the site probably changed its page: send the file to Kyle so the reader can be updated. A year&apos;s results can be cleared and loaded again (&ldquo;Clear to re-import&rdquo; on its page).</p>
    </div>
  )
}
