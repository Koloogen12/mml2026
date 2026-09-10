import type { Translations } from '../index';

export const ru: Translations = {
  // Navigation
  'nav.back': 'Назад',
  'nav.step': 'Шаг',
  'nav.skip': 'Пропустить',

  // Common
  'common.back': 'Назад',
  'common.continue': 'Продолжить',
  'common.loading': 'Загрузка...',
  'common.cm': 'см',
  'common.kg': 'кг',
  'common.close': 'Закрыть',
  'common.save': 'Сохранить',
  'common.saving': 'Сохранение...',
  'common.delete': 'Удалить',
  'common.female': 'Женский',
  'common.male': 'Мужской',
  'common.all': 'Все',
  'common.poweredBy': 'Powered by MakeMeLook',
  'common.error': 'Что-то пошло не так',
  'common.tryAgain': 'Попробовать снова',
  'common.sessionRefreshed': 'Сессия обновлена',
  'common.errorLoading': 'Не удалось загрузить. Попробуйте ещё раз.',
  'common.fileTooLarge': 'Файл слишком большой (максимум 10 МБ)',
  'common.unrealisticParams': 'Проверьте параметры — значения кажутся нереалистичными',

  // Intro
  'intro.heading': 'Виртуальная примерка',
  'intro.description': 'Загрузите свою фотографию и примеряйте вещи/ составляйте целые образы в одно касание.',
  'intro.start': 'Начать',

  // PhotoChoice
  'photoChoice.heading': 'Выберите модель',
  'photoChoice.subheading': 'Выберите способ примерки одежды',
  'photoChoice.uploadTitle': 'Загрузить фото',
  'photoChoice.uploadDesc': 'Сделайте или загрузите своё фото для наиболее точного результата',
  'photoChoice.avatarTitle': 'Выбрать аватар',
  'photoChoice.avatarDesc': 'Выберите модель из нашей коллекции, подходящую по типу фигуры',
  'photoChoice.autoMatchTitle': 'Автоподбор',
  'photoChoice.autoMatchLoading': 'Подбираем...',
  'photoChoice.autoMatchDesc': 'Мы найдём лучший аватар на основе ваших параметров',
  'photoChoice.noMatch': 'Подходящий аватар не найден. Попробуйте выбрать вручную.',
  'photoChoice.matchFailed': 'Не удалось найти совпадение. Попробуйте снова.',

  // PhotoUpload
  'photoUpload.heading': 'Загрузите ваше фото',
  'photoUpload.subheading': '',
  'photoUpload.descPrefix': 'Для получения качественных результатов примерки, пожалуйста, следуйте нашим',
  'photoUpload.descLink': 'рекомендациям.',
  'photoUpload.selectBtn': 'Выбрать',
  'photoUpload.uploading': 'Загрузка...',
  'photoUpload.button': 'Загрузить фото',
  'photoUpload.badgeFullBody': 'В полный рост',
  'photoUpload.badgeStraight': 'Корпус ровно',
  'photoUpload.badgeFitting': 'Облегающая одежда',
  'photoUpload.goodHint': 'Фото в полный рост с видимыми руками и ногами',
  'photoUpload.badHint': 'Избегайте обрезанных, размытых или групповых фото',
  'photoUpload.uploadError': 'Ошибка загрузки. Попробуйте ещё раз.',

  // BasicParameters
  'basicParams.heading': 'Основные параметры',
  'basicParams.subheading': 'Укажите рост, вес и пол – основа для подбора размера',
  'basicParams.height': 'Рост',
  'basicParams.weight': 'Вес',
  'basicParams.female': 'Я – Женщина',
  'basicParams.male': 'Я – Мужчина',
  'basicParams.nextCta': 'Параметры тела',

  // Measurements
  'measurements.heading': 'Параметры тела',
  'measurements.subheading': 'Укажите обхваты груди, талии, бёдер и размер будет точнее.',
  'measurements.chest': 'Обхват груди',
  'measurements.waist': 'Обхват талии',
  'measurements.hip': 'Обхват бедер',
  'measurements.clothingSize': 'Размер одежды',
  'measurements.size': 'Размер',
  'measurements.nextCta': 'Форма живота',

  // BellyShape
  'bellyShape.heading': 'Форма живота',
  'bellyShape.subheading': 'Выберите, как выглядит ваш живот для лучшей посадки одежды',
  'bellyShape.flat': 'Плоский',
  'bellyShape.medium': 'Небольшой',
  'bellyShape.gross': 'Выраженный',
  'bellyShape.nextCta': 'Тип фигуры',

  // FigureType
  'figureType.heading': 'Тип фигуры',
  'figureType.subheading': 'Выберите силуэт, который больше всего похож на ваш.',
  'figureType.nextCta': 'Продолжить',
  'figureType.pear': 'Шире бедра',
  'figureType.aLine': 'А-силуэт',
  'figureType.rectangle': 'Плечи = Бёдра',
  'figureType.triangle': 'Шире плечи',
  'figureType.hourglass': 'Выраженная талия',
  'figureType.apple': 'Талия шире',

  // PrivacyPolicy
  'privacy.heading': 'Ваши фото будут видны только вам',
  'privacy.subheading': '',
  'privacy.description': 'Мы не передаём и не продаём ваши данные третьим лицам. Ваши данные используются только для предоставления услуг виджета MakeMeLook',
  'privacy.badge': 'Приватность',
  'privacy.consentTitle': 'Обработка персональных данных',
  'privacy.consentPrefix': 'Согласен на',
  'privacy.consentLink': 'обработку данных',
  'privacy.consentSuffix': 'и с политикой конфиденциальности MakeMeLook',
  'privacy.policyTitle': 'Политика обработки персональных данных',
  'privacy.policy1Title': 'Оператор данных',
  'privacy.policy1Text': 'Оператором персональных данных является MakeMeLook (далее — «Оператор»). Оператор определяет цели и способы обработки персональных данных пользователей сервиса.',
  'privacy.policy2Title': 'Категории обрабатываемых данных',
  'privacy.policy2Text': 'Оператор обрабатывает следующие категории данных: идентификационные данные (email, имя); пользовательский контент (фотографии, изображения одежды); данные профиля и предпочтений; технические и сетевые данные; данные использования сервиса.',
  'privacy.policy3Title': 'Цели обработки',
  'privacy.policy3Text': 'Персональные данные обрабатываются для: исполнения пользовательского соглашения; предоставления функций AI-стилиста; персонализации рекомендаций; обеспечения безопасности платформы; аналитики и улучшения сервиса.',

  // Auth
  'auth.heading': 'Войдите чтобы продолжить',
  'auth.subheading': 'Введите номер или почту и мы пришлём код.',
  'auth.inputPlaceholder': 'Телефон или почта',
  'auth.sendCode': 'Получить код',
  'auth.oauthLabel': 'Войти с помощью',
  'auth.googleId': 'Google ID',
  'auth.yandexId': 'Яндекс ID',
  'auth.codeHeadingSms': 'Введите код из смс',
  'auth.codeHeadingEmail': 'Введите код',
  'auth.codeSentSms': 'Мы отправили его на номер',
  'auth.codeSentEmail': 'Мы отправили его на почту',
  'auth.next': 'Далее',
  'auth.resendCode': 'Отправить код',
  'auth.verify': 'Подтвердить',
  'auth.changeContact': 'Изменить номер или почту',

  // Photo Recommendations
  'photoRec.heading': 'Рекомендации к фотографиям',
  'photoRec.tip1Title': 'Камера на уровне глаз (не снизу и не сверху)',
  'photoRec.tip1Desc': 'MakeMeLook AI корректно определяет пропорции тела только при нейтральной перспективе.',
  'photoRec.tip2Title': 'Полный рост — тело должно быть видно целиком',
  'photoRec.tip2Desc': 'Виртуальная примерка строит одежду по всей фигуре.',
  'photoRec.tip3Title': 'Прямая поза, без поворотов корпуса',
  'photoRec.tip3Desc': 'Алгоритм должен видеть реальные размеры плеч, талии и бёдер.',
  'photoRec.tip4Title': 'Простое освещение и минимум фона',
  'photoRec.tip4Desc': 'MakeMeLook AI сможет проще отделить человека от окружения.',

  // Showroom
  'showroom.outerwear': 'Верхняя одежда',
  'showroom.tops': 'Топы',
  'showroom.bottoms': 'Низ',
  'showroom.shoes': 'Обувь',
  'showroom.accessories': 'Аксессуары',
  'showroom.settings': 'Настройки',
  'showroom.takeItOff': 'Снять',
  'showroom.chooseColor': 'Выберите цвет',
  'showroom.recommendedSize': 'Рекомендуемый размер',
  'showroom.calculatingSize': 'Подбираем размер...',
  'showroom.addToCart': 'В корзину',
  'showroom.addedToCart': 'Добавлено',
  'showroom.openInStore': 'В магазин',
  'showroom.limitExceeded': 'Лимит примерок в этом месяце исчерпан. Попробуйте в следующем месяце.',
  'showroom.tryOn': 'Примерить',

  // Try-on loading phrases
  'loading.measuring': 'Снимаем мерки...',
  'loading.cutting': 'Кроим изделие...',
  'loading.fitting': 'Подгоняем изделие под вас...',
  'loading.adjusting': 'Подбираем посадку...',
  'loading.finishing': 'Замеры сделаны успешно...',
  'showroom.tryOnFailed': 'Примерка не удалась. Попробуйте ещё раз.',
  'showroom.nothingWorn': 'Сейчас ничего не надето',

  'showroom.shareTitle': 'Поделиться образом',
  'showroom.shareSubtitle': 'Сохраните себе или поделитесь образом',
  'showroom.copy': 'Скопировать',
  'showroom.save': 'Сохранить',
  'showroom.shareIn': 'Поделиться в приложении',
  'showroom.copied': 'Ссылка скопирована',
  'showroom.savedForInstagram': 'Изображение сохранено — поделитесь в Instagram',
  'showroom.addedToFavorites': 'Добавлено в избранное',
  'showroom.goToFavorites': 'В избранное',

  // Settings
  'settings.heading': 'Настройки',
  'settings.favorites': 'Избранное',
  'settings.uploadPhoto': 'Загрузить фото',
  'settings.basicParams': 'Основные параметры',
  'settings.chestCirc': 'Обхват груди',
  'settings.bodyShape': 'Форма тела',
  'settings.figureType': 'Тип фигуры',
  'settings.account': 'Аккаунт',
  'settings.privacyPolicy': 'Политика конфиденциальности',

  // Account
  'account.heading': 'Аккаунт',
  'account.email': 'Email',
  'account.emailPlaceholder': 'Введите ваш email',
  'account.fittingHistory': 'История примерок',
  'account.myPurchases': 'Мои покупки',
  'account.deleteAccount': 'Удалить аккаунт',

  // DeleteAccount
  'deleteAccount.heading': 'Удалить аккаунт',
  'deleteAccount.description': 'Вы уверены, что хотите удалить аккаунт? Все ваши данные, включая параметры тела, историю примерок, избранное и покупки, будут безвозвратно удалены.',

  // AvatarCollection
  'avatarCollection.heading': 'Выбор аватара',
  'avatarCollection.noAvatars': 'Нет доступных аватаров. Загрузите своё фото.',

  // Favorites
  'favorites.empty': 'Пока нет избранного. Примерьте наряды и нажмите на сердечко!',

  // FittingHistory
  'fittingHistory.empty': 'Пока нет истории примерок.',

  // MyPurchases
  'myPurchases.heading': 'Мои покупки',
  'myPurchases.product': 'Товар',
  'myPurchases.empty': 'Пока нет покупок.',
};
