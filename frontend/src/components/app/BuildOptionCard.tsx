export interface BuildOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  onClick: () => void;
  disabled?: boolean;
}

export function BuildOptionCard({
  title,
  description,
  icon,
  iconBgColor,
  onClick,
  disabled,
}: Omit<BuildOption, "id">) {
  return (
    <div
      className={`rounded-lg border p-6 text-left transition h-full flex flex-col ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:shadow-lg"
      }`}
      onClick={!disabled ? onClick : undefined}
    >
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${iconBgColor} text-white`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
