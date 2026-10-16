export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[30px] font-bold leading-tight sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-3 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}
