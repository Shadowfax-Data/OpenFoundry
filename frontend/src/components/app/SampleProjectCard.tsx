import React from "react";

interface SampleProjectCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  iconBgColor: string;
}

export function SampleProjectCard({
  icon,
  title,
  description,
  onClick,
  iconBgColor,
}: SampleProjectCardProps) {
  return (
    <div
      className="rounded-lg border p-4 hover:bg-gray-50 cursor-pointer h-full"
      onClick={onClick}
    >
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white ${iconBgColor}`}
      >
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
