import { InsightShell } from '@/components/insight/InsightShell'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <InsightShell side="girls">{children}</InsightShell>
}
