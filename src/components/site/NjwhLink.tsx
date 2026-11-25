// The credit link to NJ Wrestling History wherever its results show (Kyle 2026-11-14). Their https certificate doesn't
// match the site, so the link is http (https warns visitors).
export function NjwhLink({ children = 'NJ Wrestling History (njwrestlinghistory.info)' }: { children?: React.ReactNode }) {
  return <a href="http://njwrestlinghistory.info" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">{children}</a>
}
