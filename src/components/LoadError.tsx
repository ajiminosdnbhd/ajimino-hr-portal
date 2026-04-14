'use client'

// Shown when a page fails to load data. Makes failures visible immediately
// instead of silently showing an empty page — so problems are easy to diagnose.
export default function LoadError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 mb-6 rounded-xl text-sm"
      style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B42318' }}>
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span><strong>Failed to load data:</strong> {message}. Try refreshing the page.</span>
    </div>
  )
}
