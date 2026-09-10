import Header from '../../_components/header/Header';
import Footer from '../../_components/footer/Footer';

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-6">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-light text-foreground mb-8">О компании</h1>
          <p className="text-muted-foreground leading-relaxed">
            MakeMeLook — платформа виртуальной примерки одежды, которая помогает покупателям видеть, как выглядит одежда на них до покупки.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

