'use client'

export default function LoadingSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="inline-block max-w-xl rounded-2xl bg-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          />
          <div
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.4s' }}
          />
          <span className="text-sm text-slate-500 ml-2">Thinking...</span>
        </div>
      </div>
    </div>
  )
}
