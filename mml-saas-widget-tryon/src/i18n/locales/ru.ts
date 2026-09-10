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
  'basicParams.nextCta': 'Продолжить',

  // Measurements
  'measurements.heading': 'Параметры тела',
  'measurements.subheading': 'Укажите обхваты груди, талии, бёдер и размер будет точнее.',
  'measurements.chest': 'Обхват груди',
  'measurements.waist': 'Обхват талии',
  'measurements.hip': 'Обхват бедер',
  'measurements.clothingSize': 'Размер одежды',
  'measurements.size': 'Размер',
  'measurements.nextCta': 'Продолжить',

  // BellyShape
  'bellyShape.heading': 'Форма живота',
  'bellyShape.subheading': 'Выберите, как выглядит ваш живот для лучшей посадки одежды',
  'bellyShape.flat': 'Плоский',
  'bellyShape.medium': 'Небольшой',
  'bellyShape.gross': 'Выраженный',
  'bellyShape.nextCta': 'Продолжить',

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
  'privacy.description': 'Мы не передаём и не продаём ваши данные третьим лицам и не используем их для обучения ИИ-моделей. Фотографии обрабатываются только для виртуальной примерки.',
  'privacy.badge': 'Приватность',
  'privacy.consentTitle': 'Согласие на обработку биометрических персональных данных',
  'privacy.consentPrefix': 'Я даю согласие на обработку моих фотографий (биометрических персональных данных) в соответствии со ст. 11 ФЗ-152 для целей виртуальной примерки. Условия — в',
  'privacy.consentLink': 'Политике обработки ПДн',
  'privacy.consentSuffix': 'ООО «МОНОРУС».',
  'privacy.policyTitle': 'Обработка персональных данных',
  'privacy.policy1Title': 'Оператор и основание',
  'privacy.policy1Text': 'Оператором персональных данных является ООО «МОНОРУС» (ИНН 9723121853, регистрационный номер в Реестре Роскомнадзора: 77-23-155314). Обработка осуществляется на основании вашего отдельного согласия в электронной форме в соответствии с ч. 1 ст. 11 Федерального закона № 152-ФЗ «О персональных данных».',
  'privacy.policy2Title': 'Состав данных и цели',
  'privacy.policy2Text': 'Обрабатываются: ваши фотографии (биометрические персональные данные), технические данные устройства, взаимодействия с Виджетом, а также контактные данные, если вы добровольно их укажете. Цели — генерация изображения виртуальной примерки, отображение результата, передача данных о заказе магазину, на сайте которого работает Виджет.',
  'privacy.policy3Title': 'Трансграничная передача и хранение',
  'privacy.policy3Text': 'Для генерации изображений фотографии могут передаваться привлечённым обработчикам, в том числе за пределы Российской Федерации. Данные передаются по защищённому каналу и не используются для обучения ИИ-моделей. Фотографии хранятся до 30 дней, сгенерированные изображения — до 90 дней. Перечень привлечённых обработчиков предоставляется по запросу. Вы можете отозвать согласие и потребовать удаления данных, написав на ceo@themono.ru.',
  'privacy.policy4Title': 'Полные документы',
  'privacy.policy4Text': 'Ознакомьтесь с полными документами: Политика конфиденциальности и Политика обработки персональных данных.',
  'privacy.fullPolicyLink': 'Открыть Политику обработки ПДн',
  'privacy.fullPrivacyLink': 'Открыть Политику конфиденциальности',

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
  'showroom.clearLayer': 'Снять эту вещь',
  'showroom.chooseColor': 'Выберите цвет',
  'showroom.recommendedSize': 'Рекомендуемый размер',
  'showroom.outOfChart': 'Ваши параметры вне размерной сетки бренда — рекомендация ориентировочная, уточните размер у магазина.',
  'showroom.noMatchingSize': 'К сожалению, у этого товара нет подходящего вам размера. Показываем ближайший доступный.',
  'showroom.calculatingSize': 'Подбираем размер...',
  'showroom.addToCart': 'В корзину',
  'showroom.addedToCart': 'Добавлено',
  'showroom.openInStore': 'В магазин',
  'showroom.pickVendor': 'Выберите поставщика',
  'showroom.pickVendorHint': 'Этот товар продают несколько магазинов — цены и условия могут отличаться.',
  'showroom.pickSizeFirst': 'Выберите размер перед добавлением в корзину',
  'showroom.loadingVendors': 'Получаем список магазинов...',
  'showroom.addingToCart': 'Добавляем в корзину...',
  'showroom.addedToCartSuccess': 'Товар добавлен в корзину',
  'showroom.cartDisabledOutOfChart': 'У товара нет вашего размера — добавление в корзину недоступно. Уточните наличие в магазине.',
  'showroom.sizesUnavailable': 'У этого товара не указаны размеры',
  'showroom.browseOtherOptions': 'Посмотреть другие варианты',
  'showroom.limitExceeded': 'Лимит примерок в этом месяце исчерпан. Попробуйте в следующем месяце.',
  'showroom.tryOn': 'Примерить',
  'showroom.resetSelection': 'Сбросить',

  // Try-on loading phrases. Order in components/TryOnLoader.tsx and
  // stages/PhotoUploadStage.tsx is "doing work" first, "honest disclaimer"
  // in the back half — the customer sees concrete action before any
  // expectation-setting copy.
  'loading.measuring': 'Снимаем мерки...',
  'loading.cutting': 'Кроим изделие...',
  'loading.fitting': 'Подгоняем изделие под вас...',
  'loading.adjusting': 'Подбираем посадку...',
  'loading.learning': 'Ещё учимся — возможны неточности...',
  'loading.almostReady': 'Почти готово, доделываем детали...',
  'loading.handCrafted': 'Каждая примерка собирается заново под вас...',
  'loading.finishing': 'Замеры сделаны успешно...',

  // Photo validation rejection messages. Keys map 1:1 to reason_code
  // returned by the backend (internal/service/tryon.go::validationPromptText).
  // Add a key here whenever you add a new reason_code in the prompt — the
  // widget falls back to the LLM-supplied `message` field if a code is
  // missing here, but localised hints land better.
  'validation.reject.title': 'Фото не подходит',
  'validation.reject.tryAnyway': 'Всё равно попробовать',
  'validation.reject.uploadAnother': 'Загрузить другое фото',
  'validation.reject.no_person': 'На фото не видно человека. Загрузите своё фото в полный рост.',
  'validation.reject.not_a_real_photo': 'Похоже на рисунок или рендер. Нужна реальная фотография человека.',
  'validation.reject.multiple_people': 'На фото несколько человек. Загрузите фото только себя.',
  'validation.reject.selfie_closeup': 'Это селфи крупным планом. Нужно фото в полный рост — отступите от камеры.',
  'validation.reject.not_full_body': 'Видна не вся фигура. Должны быть видны голова, корпус и ноги.',
  'validation.reject.too_far': 'Вы слишком далеко от камеры. Подойдите ближе.',
  'validation.reject.back_or_side_view': 'Сфотографируйтесь лицом к камере, а не спиной или в профиль.',
  'validation.reject.non_standing_pose': 'Встаньте прямо лицом к камере — не сидите и не наклоняйтесь.',
  'validation.reject.bulky_outerwear': 'Снимите верхнюю одежду (пуховик, шубу, тёплый плащ) — она мешает примерке.',
  'validation.reject.partial_occlusion': 'Тело частично закрыто. Уберите сумку или предмет из кадра.',
  'validation.reject.low_quality': 'Фото слишком тёмное или размытое. Снимите при хорошем свете.',
  'validation.reject.screenshot': 'Это скриншот. Загрузите оригинальную фотографию.',
  'validation.reject.collage': 'Это коллаж из нескольких фото. Загрузите одно фото.',
  'validation.reject.other': 'Фото не подходит для примерки. Попробуйте другое.',

  'showroom.tryOnFailed': 'Не удалось сгенерировать примерку. Попробуйте повторить через 30 секунд.',
  'showroom.nothingWorn': 'Сейчас ничего не надето',

  'showroom.shareTitle': 'Поделиться образом',
  'showroom.shareSubtitle': 'Сохраните себе или поделитесь образом',
  'showroom.copy': 'Скопировать',
  'showroom.save': 'Скачать',
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
  'settings.chestCirc': 'Параметры',
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
