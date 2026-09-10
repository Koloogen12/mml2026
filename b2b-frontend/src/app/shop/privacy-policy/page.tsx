import Header from '../_components/header/Header';
import Footer from '../_components/footer/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-6">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-light text-foreground mb-4">Политика конфиденциальности</h1>
            <p className="text-muted-foreground">Последнее обновление: 10 апреля 2026</p>
          </header>
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Введение</h2>
              <p className="text-muted-foreground leading-relaxed">
                В MakeMeLook мы уважаем вашу конфиденциальность и защищаем ваши персональные данные. Настоящая политика объясняет, как мы собираем, используем и храним вашу информацию.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Какие данные мы собираем</h2>
              <p className="text-muted-foreground leading-relaxed">Имя, email, адрес доставки, платёжные данные (обрабатываются через защищённых провайдеров).</p>
            </section>
            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Контакты</h2>
              <p className="text-muted-foreground">Email: privacy@makemeelook.ai</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

