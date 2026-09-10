'use client';

import { useState } from 'react';
import { CreditCard, Check } from 'lucide-react';
import CheckoutHeader from '../_components/header/CheckoutHeader';
import Footer from '../_components/footer/Footer';
import { Button } from '../_components/ui/button';
import { Input } from '../_components/ui/input';
import { Label } from '../_components/ui/label';
import { RadioGroup, RadioGroupItem } from '../_components/ui/radio-group';
import { Checkbox } from '../_components/ui/checkbox';

const CheckoutClient = () => {
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [customerDetails, setCustomerDetails] = useState({ email: '', firstName: '', lastName: '', phone: '' });
  const [shippingAddress, setShippingAddress] = useState({ address: '', city: '', postalCode: '', country: '' });
  const [hasSeparateBilling, setHasSeparateBilling] = useState(false);
  const [shippingOption, setShippingOption] = useState('standard');
  const [paymentDetails, setPaymentDetails] = useState({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const cartItems: Array<{ id: number; name: string; price: string; quantity: number }> = [];

  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
    return sum + price * item.quantity;
  }, 0);

  const getShippingCost = () => shippingOption === 'express' ? 15 : shippingOption === 'overnight' ? 35 : 0;
  const shipping = getShippingCost();
  const total = subtotal + shipping;

  const handleCompleteOrder = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setPaymentComplete(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader />
      <main className="pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-1 lg:order-2">
              <div className="bg-muted/20 p-8 rounded-none sticky top-6">
                <h2 className="text-lg font-light text-foreground mb-6">Сводка заказа</h2>
                {cartItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">Корзина пуста</p>
                )}
                {!showDiscountInput ? (
                  <button onClick={() => setShowDiscountInput(true)} className="text-sm text-foreground underline hover:no-underline transition-all mt-8">
                    Промокод
                  </button>
                ) : (
                  <div className="flex gap-2 mt-8">
                    <Input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="Введите промокод" className="flex-1 rounded-none" />
                    <button onClick={() => setShowDiscountInput(false)} className="text-sm text-foreground underline hover:no-underline px-2">Применить</button>
                  </div>
                )}
                <div className="border-t border-muted-foreground/20 mt-4 pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Подытог</span>
                    <span className="text-foreground">{subtotal.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Forms */}
            <div className="lg:col-span-2 lg:order-1 space-y-8">
              {/* Customer details */}
              <div className="bg-muted/20 p-8 rounded-none">
                <h2 className="text-lg font-light text-foreground mb-6">Данные покупателя</h2>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-sm font-light">Email *</Label>
                    <Input id="email" type="email" value={customerDetails.email} onChange={(e) => setCustomerDetails((p) => ({ ...p, email: e.target.value }))} className="mt-2 rounded-none" placeholder="Email" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-light">Имя *</Label>
                      <Input id="firstName" value={customerDetails.firstName} onChange={(e) => setCustomerDetails((p) => ({ ...p, firstName: e.target.value }))} className="mt-2 rounded-none" />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-light">Фамилия *</Label>
                      <Input id="lastName" value={customerDetails.lastName} onChange={(e) => setCustomerDetails((p) => ({ ...p, lastName: e.target.value }))} className="mt-2 rounded-none" />
                    </div>
                  </div>
                  <div className="border-t border-muted-foreground/20 pt-6 mt-8">
                    <h3 className="text-base font-light text-foreground mb-4">Адрес доставки</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address" className="text-sm font-light">Адрес *</Label>
                        <Input id="address" value={shippingAddress.address} onChange={(e) => setShippingAddress((p) => ({ ...p, address: e.target.value }))} className="mt-2 rounded-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city" className="text-sm font-light">Город *</Label>
                          <Input id="city" value={shippingAddress.city} onChange={(e) => setShippingAddress((p) => ({ ...p, city: e.target.value }))} className="mt-2 rounded-none" />
                        </div>
                        <div>
                          <Label htmlFor="postal" className="text-sm font-light">Индекс *</Label>
                          <Input id="postal" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress((p) => ({ ...p, postalCode: e.target.value }))} className="mt-2 rounded-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="billing" checked={hasSeparateBilling} onCheckedChange={(c) => setHasSeparateBilling(c === true)} />
                    <Label htmlFor="billing" className="text-sm font-light cursor-pointer">Другой адрес для счёта</Label>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-muted/20 p-8 rounded-none">
                <h2 className="text-lg font-light text-foreground mb-6">Способ доставки</h2>
                <RadioGroup value={shippingOption} onValueChange={setShippingOption} className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-muted-foreground/20">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard" className="font-light">Стандартная доставка</Label>
                    </div>
                    <div className="text-sm text-muted-foreground">Бесплатно • 3-5 дней</div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-muted-foreground/20">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="express" id="express" />
                      <Label htmlFor="express" className="font-light">Экспресс-доставка</Label>
                    </div>
                    <div className="text-sm text-muted-foreground">750 ₽ • 1-2 дня</div>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment */}
              <div className="bg-muted/20 p-8 rounded-none">
                <h2 className="text-lg font-light text-foreground mb-6">Оплата</h2>
                {!paymentComplete ? (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="cardHolder" className="text-sm font-light">Имя на карте *</Label>
                      <Input id="cardHolder" value={paymentDetails.cardholderName} onChange={(e) => setPaymentDetails((p) => ({ ...p, cardholderName: e.target.value }))} className="mt-2 rounded-none" />
                    </div>
                    <div>
                      <Label htmlFor="cardNum" className="text-sm font-light">Номер карты *</Label>
                      <div className="relative mt-2">
                        <Input id="cardNum" value={paymentDetails.cardNumber} onChange={(e) => { const v = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim(); if (v.length <= 19) setPaymentDetails((p) => ({ ...p, cardNumber: v })); }} className="rounded-none pl-10" placeholder="0000 0000 0000 0000" maxLength={19} />
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry" className="text-sm font-light">Срок *</Label>
                        <Input id="expiry" value={paymentDetails.expiryDate} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, '$1/$2'); if (v.length <= 5) setPaymentDetails((p) => ({ ...p, expiryDate: v })); }} className="mt-2 rounded-none" placeholder="ММ/ГГ" maxLength={5} />
                      </div>
                      <div>
                        <Label htmlFor="cvv" className="text-sm font-light">CVV *</Label>
                        <Input id="cvv" value={paymentDetails.cvv} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 3) setPaymentDetails((p) => ({ ...p, cvv: v })); }} className="mt-2 rounded-none" placeholder="123" maxLength={3} />
                      </div>
                    </div>
                    <div className="bg-muted/10 p-6 border border-muted-foreground/20 space-y-3">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Подытог</span><span>{subtotal.toLocaleString('ru-RU')} ₽</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Доставка</span><span>{shipping === 0 ? 'Бесплатно' : `${shipping * 75} ₽`}</span></div>
                      <div className="flex justify-between text-lg font-medium border-t border-muted-foreground/20 pt-3"><span>Итого</span><span>{total.toLocaleString('ru-RU')} ₽</span></div>
                    </div>
                    <Button onClick={handleCompleteOrder} disabled={isProcessing || !paymentDetails.cardNumber || !paymentDetails.cvv || !paymentDetails.cardholderName} className="w-full rounded-none h-12 text-base">
                      {isProcessing ? 'Обработка...' : `Оформить заказ • ${total.toLocaleString('ru-RU')} ₽`}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-light text-foreground mb-2">Заказ оформлен!</h3>
                    <p className="text-muted-foreground">Спасибо за покупку. Подтверждение отправлено на ваш email.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutClient;

