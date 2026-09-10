import Header from '../_components/header/Header';
import Footer from '../_components/footer/Footer';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-6">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-light text-foreground mb-4">Условия использования</h1>
            <p className="text-muted-foreground">Последнее обновление: 10 апреля 2026</p>
          </header>
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Принятие условий</h2>
              <p className="text-muted-foreground leading-relaxed">
                Используя сайт MakeMeLook, вы соглашаетесь с настоящими условиями. Если вы не согласны, пожалуйста, не используйте наш сайт.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-light text-foreground mb-4">Контакты</h2>
              <p className="text-muted-foreground">Email: hello@makemeelook.ai</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

