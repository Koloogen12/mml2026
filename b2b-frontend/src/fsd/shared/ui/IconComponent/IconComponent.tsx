import s from './IconComponent.module.scss';

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  bgColor?: string;
  iconColor?: string;
}

export default function IconComponent({ icon, className, bgColor, iconColor, onClick }: IProps) {
  return (
    <div
      className={`${className || ''} ${s.container} `}
      onClick={onClick}
      style={{
        backgroundColor: bgColor,
        color: iconColor
      }}
    >
      {icon}
    </div>
  );
}
