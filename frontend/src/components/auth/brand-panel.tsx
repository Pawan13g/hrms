export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full flex-col bg-slate-900 p-10 text-white lg:flex">
      <div className="relative z-20 flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-600 text-white">
          H
        </span>
        Sodium Labs HRMS
      </div>

      <div className="relative z-20 mt-auto">
        <blockquote className="space-y-3">
          <p className="text-lg leading-relaxed">
            &ldquo;We replaced three spreadsheets and a Slack channel with this
            in a single afternoon. Our HR ops finally feels like product
            engineering.&rdquo;
          </p>
          <footer className="text-sm text-slate-400">
            Sofia Davis, Head of People Ops
          </footer>
        </blockquote>
      </div>
    </div>
  )
}
