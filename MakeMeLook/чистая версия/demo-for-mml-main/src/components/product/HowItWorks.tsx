import { Camera, Ruler, Eye } from "lucide-react";

const steps = [
  { icon: Camera, title: "Загрузите фото", description: "Сделайте фото или загрузите из галереи" },
  { icon: Ruler, title: "Выберите размер", description: "Укажите ваш размер для точной примерки" },
  { icon: Eye, title: "Увидьте результат", description: "Посмотрите, как одежда сидит на вас" },
];

const HowItWorks = () => {
  return (
    <div className="bg-secondary py-12 px-6">
      <h3 className="text-center text-sm font-medium uppercase tracking-widest text-foreground mb-8">
        Как это работает
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
        {steps.map((step, index) => (
          <div key={index} className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-blue/10 flex items-center justify-center">
              <step.icon className="w-5 h-5 text-accent-blue" />
            </div>
            <div className="text-xs font-medium text-muted-foreground mb-1">{index + 1}.</div>
            <h4 className="text-sm font-medium text-foreground mb-1">{step.title}</h4>
            <p className="text-xs font-light text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;
