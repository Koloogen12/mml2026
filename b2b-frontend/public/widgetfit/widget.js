(() => {
  console.log('Init fit widget');
  const VERSION = 'v25';
  const ASSETS_URL = 'https://b2b.makemelook.ai/widgetfit';
  const IMAGES_URL = `${ASSETS_URL}/img/`;
  const STAGES = {
    INTRO: 'INTRO',
    BASIC_PARAMETERS: 'BASIC_PARAMETERS',
    YOUR_PARAMETERS: 'YOUR_PARAMETERS',
    BELLY_SHAPE: 'BELLY_SHAPE',
    FIGURE_TYPE: 'FIGURE_TYPE',
    PRIVACY_POLICY: 'PRIVACY_POLICY',
    UPLOAD_MODEL_PHOTO: 'UPLOAD_MODEL_PHOTO',
    SHOW_ROOM: 'SHOW_ROOM',
    SETTINGS: 'SETTINGS',
    FAVORITES: 'FAVORITES',
    PRIVACY_POLICY_SETTINGS: 'PRIVACY_POLICY_SETTINGS',
    MY_ACCOUNT: 'MY_ACCOUNT',
    MY_ACCOUNT_EMAIL: 'MY_ACCOUNT_EMAIL',
    FITTING_HISTORY: 'FITTING_HISTORY',
    MY_PURCHASES: 'MY_PURCHASES',
    DELETE_ACCOUNT: 'DELETE_ACCOUNT'
  };
  const GENDERS = {
    MALE: 'male',
    FEMALE: 'female'
  };
  const CLOTH_TYPES = {
    OUTERWEAR: 'outerwear',
    TOP: 'top',
    BOTTOM: 'bottom',
    SHOES: 'shoes'
  };

  const nodes = {
    floatBtn: { html: null, node: null },
    modal: { html: null, node: null },
    introModal: { html: null, node: null },
    basicParametersModal: { html: null, node: null },
    yourParametersModal: { html: null, node: null },
    bellyShapeModal: { html: null, node: null },
    figureTypeModal: { html: null, node: null },
    privacyPolicyModal: { html: null, node: null },
    uploadPhotoModal: { html: null, node: null },
    showRoomModal: { html: null, node: null },
    settingsModal: { html: null, node: null },
    favoritesModal: { html: null, node: null },
    privacyPolicySettingsModal: { html: null, node: null },
    myAccount: { html: null, node: null },
    myAccountEmail: { html: null, node: null },
    fittingHistory: { html: null, node: null },
    myPurchases: { html: null, node: null },
    deleteAccount: { html: null, node: null }
  };

  const store = new Store();

  let GARMENTS = [];

  const CONTROLLERS = {
    [STAGES.INTRO]: new IntroController(),
    [STAGES.BASIC_PARAMETERS]: new BasicParametersController(),
    [STAGES.YOUR_PARAMETERS]: new YourParametersController(),
    [STAGES.BELLY_SHAPE]: new BellyShapeController(),
    [STAGES.FIGURE_TYPE]: new FigureTypeController(),
    [STAGES.PRIVACY_POLICY]: new PrivacyPolicyController(),
    [STAGES.UPLOAD_MODEL_PHOTO]: new UploadModelPhotoController(),
    [STAGES.SHOW_ROOM]: new ShowRoomController(),
    [STAGES.SETTINGS]: new SettingsController(),
    [STAGES.FAVORITES]: new FavoritesController(),
    [STAGES.PRIVACY_POLICY_SETTINGS]: new PrivacyPolicySettingsController(),
    [STAGES.MY_ACCOUNT]: new MyAccountController(),
    [STAGES.MY_ACCOUNT_EMAIL]: new MyAccountEmailController(),
    [STAGES.FITTING_HISTORY]: new FittingHistoryController(),
    [STAGES.MY_PURCHASES]: new MyPurchasesController(),
    [STAGES.DELETE_ACCOUNT]: new DeleteAccountController()
  };

  const core = {
    initCardSwitch: (node) => {
      const activeClass = 'mmltov1-card-switch__card--active';

      Array.from(node.querySelectorAll('.mmltov1-card-switch')).forEach((node) => {
        node.innerHTML = node.innerHTML;

        const gender = store.data.gender || GENDERS.FEMALE;
        const name = node.getAttribute('data-name');
        const cardsNode = node.querySelector('.mmltov1-card-switch__cards');
        const labelNode = node.querySelector('.mmltov1-card-switch__label');

        const refreshCardsState = () => {
          const value = store.data[name];

          Array.from(cardsNode.children).forEach((cardNode) => {
            const src = cardNode.getAttribute(`data-bg-${gender}`);

            if (cardNode.getAttribute('data-value') === value) {
              cardNode.classList.add(activeClass);
              labelNode.innerHTML = cardNode.getAttribute('data-label');
            } else {
              cardNode.classList.remove(activeClass);
            }

            if (src) {
              if (!cardNode.children.length) {
                cardNode.appendChild(document.createElement('img'));
              }
              cardNode.children[0].src = IMAGES_URL + src;
            }
          });
        };

        const shiftToSibling = (factor) => {
          for (let i = 0, l = cardsNode.children.length; i < l; ++i) {
            const child = cardsNode.children[i];

            if (child.classList.contains(activeClass)) {
              let index = i + factor;

              if (index < 0) {
                index = l - 1;
              } else if (index >= l) {
                index = 0;
              }

              store.set(name, cardsNode.children[index].getAttribute('data-value'));
              refreshCardsState();
              break;
            }
          }
        };

        const handleCardClick = function () {
          store.set(name, this.getAttribute('data-value'));
          refreshCardsState();
        };

        Array.from(cardsNode.children).forEach((cardNode) => {
          cardNode.addEventListener('click', handleCardClick);
        });

        node.querySelector('.mmltov1-card-switch__btn-left').addEventListener('click', () => {
          shiftToSibling(-1);
        });

        node.querySelector('.mmltov1-card-switch__btn-right').addEventListener('click', () => {
          shiftToSibling(1);
        });

        refreshCardsState();
      });
    },

    initMultiSwitch: (node) => {
      Array.from(node.querySelectorAll('.mmltov1-multi-switch')).forEach((widget) => {
        widget.innerHTML = widget.innerHTML;

        const name = widget.getAttribute('data-name');
        const items = widget.querySelector('.mmltov1-multi-switch__items');
        const value = store.data[name] || widget.getAttribute('data-default-value');
        const activeClass = 'mmltov1-multi-switch__item--active';

        items.innerHTML = widget
          .getAttribute('data-items')
          .split(',')
          .map(
            (label) =>
              `<div class="mmltov1-multi-switch__item${value === label ? ' ' + activeClass : ''}" data-value="${label}">${label}</div>`
          )
          .join('');

        items.addEventListener('click', (e) => {
          const target = e.target;

          if (target) {
            for (let i = 0, l = items.children.length; i < l; ++i) {
              items.children[i].classList.remove(activeClass);
            }

            target.classList.add(activeClass);

            store.set(name, target.getAttribute('data-value'));
          }
        });
      });
    },

    initSliders: (node) => {
      Array.from(node.querySelectorAll('.mmltov1-range-slider')).forEach((slider) => {
        slider.remove();
      });

      Array.from(node.querySelectorAll('[data-widget="slider"]')).forEach((input) => {
        const name = input.getAttribute('data-name');

        new RangeSlider({
          target: input,
          values: {
            min: parseInt(input.getAttribute('data-min')),
            max: parseInt(input.getAttribute('data-max'))
          },
          scaleItems: 14,
          set: [store.data[name]],
          step: 1,
          label: input.getAttribute('data-label'),
          unitLabel: input.getAttribute('data-unit-label'),
          onChange: (value) => {
            store.set(name, value);
          }
        });
      });
    },

    replaceContentInModal: (stage, content) => {
      const modal = nodes.modal.node;
      const contentNode = modal.querySelector('.mmltov1-modal__content');
      const helpNode = modal.querySelector('.mmltov1-modal__help');
      const helpText = CONTROLLERS[stage].helpText || null;
      modal.className =
        'mmltov1-modal stage-' +
        stage.toLowerCase() +
        (modal.classList.contains('visible') ? ' visible' : '') +
        (helpText ? ' with-help' : '');

      if (contentNode.children.length) {
        contentNode.children[0].remove();
      }

      if (helpText) {
        helpNode.setAttribute('data-help-text', helpText);
      } else {
        helpNode.removeAttribute('data-help-text');
      }

      contentNode.appendChild(content);
    },

    insertRequiredTags: () => {
      const head = document.querySelector('head');
      const div = document.createElement('div');

      div.innerHTML = `<link rel="stylesheet" href="${ASSETS_URL}/widget.css?v=${VERSION}" />`;

      return Promise.all(
        Array.from(div.children).map(
          (node) =>
            new Promise((resolve) => {
              node.onload = resolve;
              head.appendChild(node);
            })
        )
      );
    },

    insertGlobalComponents: () => {
      ['floatBtn', 'modal'].forEach((name) => {
        document.body.appendChild(nodes[name].node);
      });
    },

    loadHtmlChunks: () =>
      Promise.all(
        Object.keys(nodes).map((name) =>
          fetch(`${ASSETS_URL}/chunks/${name}.html?v=${VERSION}`)
            .then((response) => response.text())
            .then((html) => {
              nodes[name].html = html;
              const div = document.createElement('div');
              div.innerHTML = html;
              nodes[name].node = div.children[0];
            })
        )
      ),

    bindEvents: () => {
      const modal = nodes.modal.node;

      nodes.floatBtn.node.addEventListener('click', () => {
        modal.classList.add('visible');
      });

      modal.addEventListener('click', (e) => {
        const target = e.target;

        if (
          target.classList.contains('mmltov1-modal') ||
          target.classList.contains('mmltov1-modal__close') ||
          target.parentNode.classList.contains('mmltov1-modal__close')
        ) {
          modal.classList.remove('visible');
        }
      });

      Object.values(CONTROLLERS).forEach((ctr) => {
        if (ctr.init) {
          ctr.init();
        }
      });
    },

    switchToStage: (stage, back) => {
      if (back !== undefined) {
        store.set('backTo', back);
      }
      store.set('stage', stage);
      CONTROLLERS[stage].render();
    },

    initSession: () => {
      if (!store.data.token) {
        return fetch('https://api.makemelook.ai/v1/widget/session')
          .then((res) => res.json())
          .then((data) => {
            if (data.data.token) {
              store.set('token', data.data.token);
            } else {
              throw new Error('Token receiving fail');
            }
          });
      }
    },

    loadGarments: () =>
      fetch('https://api.makemelook.ai/v1/widget/garments')
        .then((res) => res.json())
        .then((data) => {
          GARMENTS = data.garments;
        }),

    init: () => {
      console.log('Init started');
      Promise.all([
        core.loadHtmlChunks(),
        core.insertRequiredTags(),
        core.initSession(),
        core.loadGarments()
      ]).then(() => {
        core.insertGlobalComponents();
        core.bindEvents();
        core.switchToStage(store.data.stage);
      });
    }
  };

  window.$MMLTryOnWidget = {};

  function IntroController() {
    let outer = null;

    this.init = function () {
      outer = nodes.introModal.node;

      outer.querySelector('.mmltov1-intro-modal__btn').addEventListener('click', () => {
        core.switchToStage(STAGES.BASIC_PARAMETERS);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.INTRO, outer);
    };
  }

  function BasicParametersController() {
    this.helpText = 'Basic parameters';

    let outer = null;
    let switcherNode = null;

    const updateSwitcherState = function () {
      for (const item of switcherNode.children) {
        if (item.getAttribute('data-value') === store.data.gender) {
          const span = item.querySelector('span') || document.createElement('span');
          span.innerHTML = item.getAttribute('data-text');
          item.classList.add('active');
          item.appendChild(span);
        } else {
          item.classList.remove('active');
          const span = item.querySelector('span');
          if (span) {
            span.remove();
          }
        }
      }
    };

    this.init = function () {
      outer = nodes.basicParametersModal.node;
      switcherNode = outer.querySelector('.mmltov1-basic-parameters-modal__switcher');

      const switcherHandler = function () {
        store.set('gender', this.getAttribute('data-value'));
        updateSwitcherState();
      };

      for (const item of switcherNode.children) {
        item.addEventListener('click', switcherHandler);
      }

      const buttons = outer.querySelector('.mmltov1-basic-parameters-modal__buttons');

      buttons.querySelector('.mmltov1-btn-secondary').addEventListener('click', () => {
        if (store.data.backTo) {
          if (store.data.backTo === 'settings') {
            core.switchToStage(STAGES.SETTINGS, null);
          }
        } else {
          core.switchToStage(STAGES.INTRO);
        }
      });

      buttons.querySelector('.mmltov1-btn-primary').addEventListener('click', () => {
        core.switchToStage(STAGES.YOUR_PARAMETERS);
      });
    };

    this.render = function () {
      updateSwitcherState();
      core.replaceContentInModal(STAGES.BASIC_PARAMETERS, outer);
      core.initSliders(outer);

      outer.classList[store.data.backTo ? 'add' : 'remove']('mmltov1--with-back');
    };
  }

  function YourParametersController() {
    let outer = null;

    this.helpText = 'Your parameters';

    this.init = function () {
      outer = nodes.yourParametersModal.node;

      const buttons = outer.querySelector('.mmltov1-your-parameters-modal__buttons');

      buttons.querySelector('.mmltov1-btn-secondary').addEventListener('click', () => {
        if (store.data.backTo) {
          if (store.data.backTo === 'settings') {
            core.switchToStage(STAGES.SETTINGS, null);
          }
        } else {
          core.switchToStage(STAGES.BASIC_PARAMETERS);
        }
      });

      buttons.querySelector('.mmltov1-btn-primary').addEventListener('click', () => {
        core.switchToStage(STAGES.BELLY_SHAPE);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.YOUR_PARAMETERS, outer);
      core.initSliders(outer);
      core.initMultiSwitch(outer);
      outer.classList[store.data.backTo ? 'add' : 'remove']('mmltov1--with-back');
    };
  }

  function UploadModelPhotoController() {
    let outer = null;

    this.helpText = 'Upload photo';

    this.init = function () {
      outer = nodes.uploadPhotoModal.node;

      outer.querySelector('.mmltov1-btn-primary input').addEventListener('change', function () {
        const file = this.files[0];

        this.value = '';

        if (file) {
          const data = new FormData();

          data.append('file', file);

          fetch('https://api.makemelook.ai/v1/widget/model/upload', {
            method: 'POST',
            body: data,
            headers: { Authorization: store.data.token }
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.data.url) {
                store.set('clothType', CLOTH_TYPES.OUTERWEAR);
                store.set('modelUrl', data.data.url);
                store.set('tryOnlUrl', null);
                store.set('selectedOuterwear', null);
                store.set('selectedTops', null);
                store.set('selectedBottoms', null);
                core.switchToStage(STAGES.SHOW_ROOM, null);
              } else {
                throw new Error('Fail uploading model file');
              }
            });
        }
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.UPLOAD_MODEL_PHOTO, outer);
    };
  }

  function BellyShapeController() {
    let outer = null;

    this.helpText = 'Your belly shape';

    this.init = function () {
      outer = nodes.bellyShapeModal.node;

      const buttons = outer.querySelector('.mmltov1-belly-shape-modal__buttons');

      buttons.querySelector('.mmltov1-btn-secondary').addEventListener('click', () => {
        if (store.data.backTo) {
          if (store.data.backTo === 'settings') {
            core.switchToStage(STAGES.SETTINGS, null);
          }
        } else {
          core.switchToStage(STAGES.YOUR_PARAMETERS);
        }
      });

      buttons.querySelector('.mmltov1-btn-primary').addEventListener('click', () => {
        core.switchToStage(STAGES.FIGURE_TYPE);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.BELLY_SHAPE, outer);
      core.initCardSwitch(outer);
      outer.classList[store.data.backTo ? 'add' : 'remove']('mmltov1--with-back');
    };
  }

  function FigureTypeController() {
    let outer = null;

    this.helpText = 'Your figure type';

    this.init = function () {
      outer = nodes.figureTypeModal.node;

      const buttons = outer.querySelector('.mmltov1-figure-type-modal__buttons');

      buttons.querySelector('.mmltov1-btn-secondary').addEventListener('click', () => {
        if (store.data.backTo) {
          if (store.data.backTo === 'settings') {
            core.switchToStage(STAGES.SETTINGS, null);
          }
        } else {
          core.switchToStage(STAGES.BELLY_SHAPE);
        }
      });

      buttons.querySelector('.mmltov1-btn-primary').addEventListener('click', () => {
        core.switchToStage(STAGES.PRIVACY_POLICY);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.FIGURE_TYPE, outer);
      core.initCardSwitch(outer);
      outer.classList[store.data.backTo ? 'add' : 'remove']('mmltov1--with-back');
    };
  }

  function PrivacyPolicyController() {
    let outer = null;

    this.helpText = 'Privacy policy';

    this.init = function () {
      outer = nodes.privacyPolicyModal.node;

      outer.querySelector('.mmltov1-btn-primary').addEventListener('click', () => {
        core.switchToStage(STAGES.UPLOAD_MODEL_PHOTO);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.PRIVACY_POLICY, outer);
    };
  }

  function ShowRoomController() {
    let outerNode = null;
    let sliderNode = null;
    let imageNode = null;
    let clothTypesNode = null;
    let catalogNode = null;
    let sizesNode = null;
    let favoriteNode = null;

    const catalogActiveClass = 'mmltov1-showroom--catalog-active';
    const sizesActiveClass = 'mmltov1-showroom--sizes-active';
    const clothTypeActiveClass = 'mmltov1-showroom__cloth-type--active';
    const favoriteActiveClass = 'mmltov1-showroom__favorite--active';
    const imageLoadingClass = 'mmltov1-showroom--image-loading';
    const activeSlideClass = 'mmltov1-showroom__slider-slide--active';

    const typeToKeyMap = {
      outerwear: 'selectedOuterwear',
      tops: 'selectedTops',
      bottoms: 'selectedBottoms'
    };

    const tagsByCategory = {
      outerwear: ['Jackets', 'Coats', 'Raincoat', 'Furs', 'Sweatshirts', 'Hoodies'],
      tops: ['Hoodies', 'Sweats', 'T-shirts', 'Long sleeve'],
      bottoms: ['Jeans', 'Trousers', 'Shorts'],
      shoes: ['Sneakers', 'Boots', 'Slippers', 'Casual Shoes']
    };

    const initClothTypes = function () {
      const childs = Array.from(clothTypesNode.children);

      const handleClick = function () {
        if (this.getAttribute('data-disable') !== 'true') {
          childs.forEach((node) => node.classList.remove(clothTypeActiveClass));
          this.classList.add(clothTypeActiveClass);
          outerNode.classList.add(catalogActiveClass);
          store.set('clothType', this.getAttribute('data-type'));
          initGallery();
          initTags();
        }
      };

      childs.forEach((node) => node.addEventListener('click', handleClick));

      syncClothTypes();
    };

    const syncClothTypes = function () {
      Array.from(clothTypesNode.children).forEach((node) => {
        const category = node.getAttribute('data-type');

        if (category && typeToKeyMap[category]) {
          const url = store.data[typeToKeyMap[category]];

          if (url) {
            const img = node.querySelector('img') || document.createElement('img');
            img.src = url;
            node.appendChild(img);
          } else {
            const img = node.querySelector('img');
            if (img) {
              img.remove();
            }
          }
        }
      });
    };

    const initTags = function () {
      const tagsNode = outerNode.querySelector('.mmltov1-showroom__tags');

      tagsNode.innerHTML = (tagsByCategory[store.data.clothType] || []).reduce(
        (acc, t) => `${acc}<div class="mmltov1-showroom__tag">${t}</div>`,
        ''
      );

      const childs = Array.from(tagsNode.children);
      const activeClass = 'mmltov1-showroom__tag--active';

      const handleClick = function () {
        childs.forEach((node) => node.classList.remove(activeClass));
        this.classList.add(activeClass);
      };

      childs.forEach((node) => node.addEventListener('click', handleClick));

      if (childs.length) {
        childs[0].click();
      }
    };

    const showImage = function () {
      const url = store.data.tryOnlUrl || store.data.modelUrl;
      imageNode.style.backgroundImage = `url(${url})`;
      favoriteNode.classList[store.data.favorites.includes(url) ? 'add' : 'remove'](
        favoriteActiveClass
      );
    };

    const initCatalogClose = function () {
      catalogNode
        .querySelector('.mmltov1-showroom__catalog-close')
        .addEventListener('click', () => {
          outerNode.classList.remove(catalogActiveClass);
          clothTypesNode
            .querySelector('.' + clothTypeActiveClass)
            .classList.remove(clothTypeActiveClass);
        });
      sizesNode.querySelector('.mmltov1-showroom__sizes-close').addEventListener('click', () => {
        outerNode.classList.remove(sizesActiveClass);
      });
    };

    const initFavoriteIcon = function () {
      favoriteNode.addEventListener('click', () => {
        const url = store.data.tryOnlUrl || store.data.modelUrl;

        if (store.data.favorites.includes(url)) {
          favoriteNode.classList.remove(favoriteActiveClass);
          store.set(
            'favorites',
            store.data.favorites.filter((u) => u !== url)
          );
        } else {
          favoriteNode.classList.add(favoriteActiveClass);
          store.set('favorites', store.data.favorites.concat(url));
        }
      });
    };

    const requestTryOn = function () {
      outerNode.classList.add(imageLoadingClass);

      return fetch('https://api.makemelook.ai/v1/widget/try-on', {
        method: 'POST',
        body: JSON.stringify({
          model_url: store.data.modelUrl,
          outerwear_url: store.data.selectedOuterwear,
          tops_url: store.data.selectedTops,
          bottoms_url: store.data.selectedBottoms
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: store.data.token
        }
      })
        .then((res) => res.json())
        .then((data) => {
          const handler = () => {
            showImage();
            outerNode.classList.remove(imageLoadingClass);
            syncClothTypes();
          };
          store.set('tryOnlUrl', data.url);

          if (store.data.tryOnlUrl) {
            const img = new Image();
            img.onload = handler;
            img.src = store.data.tryOnlUrl;
            store.set('tryOnHistory', {
              ...store.data.tryOnHistory,
              [Date.now()]: store.data.tryOnlUrl
            });
          } else {
            handler();
          }
        });
    };

    const openSizes = function () {
      outerNode.classList.add(sizesActiveClass);
      const cartBtn = sizesNode.querySelector('[data-action="addToCart"]');
      const url = store.data[typeToKeyMap[store.data.clothType]];

      cartBtn.classList[store.data.cart.find((u) => u.g === url) ? 'add' : 'remove'](
        'mmltov1-showroom__sizes-nav-btn--active'
      );
    };

    const initGallery = function () {
      const gender = store.data.gender;
      const category = store.data.clothType;
      const currentCategoryGarment = typeToKeyMap[category]
        ? store.data[typeToKeyMap[category]] || null
        : null;

      sliderNode.innerHTML = GARMENTS.filter(
        (g) => g.gender === gender && g.category === category
      ).reduce(
        (acc, g) =>
          `${acc}<div class="mmltov1-showroom__slider-slide${currentCategoryGarment === g.url ? ' ' + activeSlideClass : ''}" style="background-image: url('${g.url}')" data-url="${g.url}"></div>`,
        ''
      );

      const slides = Array.from(sliderNode.children);

      slides.forEach((node) => {
        node.addEventListener('click', () => {
          const category = store.data.clothType;

          if (!typeToKeyMap[category]) {
            return;
          }

          slides.forEach((node) => node.classList.remove(activeSlideClass));

          node.classList.add(activeSlideClass);
          store.set(typeToKeyMap[category], node.getAttribute('data-url'));

          openSizes();
          requestTryOn();
        });
      });
    };

    const initActions = function () {
      Array.from(outerNode.querySelectorAll('[data-action]')).forEach((node) => {
        const action = node.getAttribute('data-action');

        if (action === 'takeItOff') {
          node.addEventListener('click', () => {
            Object.values(typeToKeyMap).forEach((key) => store.set(key, null));
            store.set('tryOnlUrl', null);
            showImage();
            syncClothTypes();
          });
        } else if (action === 'takeItOffSingle') {
          node.addEventListener('click', () => {
            store.set(typeToKeyMap[store.data.clothType], null);
            requestTryOn().then(() => {
              outerNode.classList.remove(sizesActiveClass);
              initGallery();
            });
          });
        } else if (action === 'addToCart') {
          node.addEventListener('click', () => {
            const url = store.data[typeToKeyMap[store.data.clothType]];
            if (url) {
              if (store.data.cart.find((u) => u.g === url)) {
                store.set(
                  'cart',
                  store.data.cart.filter((u) => u.g && u.g !== url)
                );
              } else {
                store.set('cart', store.data.cart.concat({ g: url, t: store.data.tryOnlUrl }));
              }
            }
            openSizes();
          });
        } else if (action === 'settings') {
          node.addEventListener('click', () => {
            core.switchToStage(STAGES.SETTINGS);
          });
        }
      });
    };

    this.helpText = 'Show room';

    this.init = function () {
      outerNode = nodes.showRoomModal.node;
      sliderNode = outerNode.querySelector('.mmltov1-showroom__slider');
      imageNode = outerNode.querySelector('.mmltov1-showroom__image');
      clothTypesNode = outerNode.querySelector('.mmltov1-showroom__cloth-types');
      catalogNode = outerNode.querySelector('.mmltov1-showroom__catalog');
      sizesNode = outerNode.querySelector('.mmltov1-showroom__sizes');
      favoriteNode = outerNode.querySelector('.mmltov1-showroom__favorite');

      initClothTypes();
      initTags();
      initCatalogClose();
      initFavoriteIcon();
      initActions();

      core.initMultiSwitch(outerNode);
    };

    this.render = function () {
      if (!store.data.modelUrl) {
        return core.switchToStage(STAGES.UPLOAD_MODEL_PHOTO);
      }

      core.replaceContentInModal(STAGES.SHOW_ROOM, outerNode);

      showImage();

      if (store.data.clothType) {
        clothTypesNode.querySelector(`[data-type="${store.data.clothType}"]`).click();
      }

      initGallery();
    };
  }

  function SettingsController() {
    let outer = null;

    this.init = function () {
      outer = nodes.settingsModal.node;

      outer.querySelector('.mmltov1-modal__heading-back').addEventListener('click', () => {
        core.switchToStage(STAGES.SHOW_ROOM);
      });

      const routeHandler = function () {
        const route = this.getAttribute('data-route');

        if (route === 'basicParameters') {
          core.switchToStage(STAGES.BASIC_PARAMETERS, 'settings');
        } else if (route === 'chestCircumference') {
          core.switchToStage(STAGES.YOUR_PARAMETERS, 'settings');
        } else if (route === 'bodyShape') {
          core.switchToStage(STAGES.BELLY_SHAPE, 'settings');
        } else if (route === 'figureType') {
          core.switchToStage(STAGES.FIGURE_TYPE, 'settings');
        } else if (route === 'privacyPolicy') {
          core.switchToStage(STAGES.PRIVACY_POLICY_SETTINGS);
        } else if (route === 'uploadModel') {
          core.switchToStage(STAGES.UPLOAD_MODEL_PHOTO, 'settings');
        } else if (route === 'favorites') {
          core.switchToStage(STAGES.FAVORITES);
        } else if (route === 'account') {
          core.switchToStage(STAGES.MY_ACCOUNT);
        }
      };

      Array.from(outer.querySelectorAll('[data-route]')).forEach((node) =>
        node.addEventListener('click', routeHandler)
      );
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.SETTINGS, outer);
      outer
        .querySelector('[data-route="favorites"]')
        .classList[store.data.favorites.length > 0 ? 'remove' : 'add']('mmltov1--disabled');
    };
  }

  function FavoritesController() {
    let outer = null;
    let slides = null;

    this.init = function () {
      outer = nodes.favoritesModal.node;
      slides = outer.querySelector('.mmltov1-favorites-modal__slides');

      outer.querySelector('.mmltov1-favorites-modal__back').addEventListener('click', () => {
        core.switchToStage(STAGES.SETTINGS);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.FAVORITES, outer);
      slides.innerHTML = store.data.favorites.reduce(
        (acc, url) =>
          `${acc}<div class="mmltov1-favorites-modal__slide"><img src="${url}" /></div>`,
        ''
      );
    };
  }

  function MyAccountController() {
    let outer = null;

    this.init = function () {
      outer = nodes.myAccount.node;

      outer.querySelector('.mmltov1-modal__heading-back').addEventListener('click', () => {
        core.switchToStage(STAGES.SETTINGS);
      });

      const routeHandler = function () {
        const route = this.getAttribute('data-route');

        if (route === 'email') {
          core.switchToStage(STAGES.MY_ACCOUNT_EMAIL);
        } else if (route === 'fittingHistory') {
          core.switchToStage(STAGES.FITTING_HISTORY);
        } else if (route === 'myPurchases') {
          core.switchToStage(STAGES.MY_PURCHASES);
        } else if (route === 'delete') {
          core.switchToStage(STAGES.DELETE_ACCOUNT);
        }
      };

      Array.from(outer.querySelectorAll('[data-route]')).forEach((node) =>
        node.addEventListener('click', routeHandler)
      );
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.MY_ACCOUNT, outer);
      outer.querySelector('[data-route="email"]').innerHTML = store.data.email || 'Email';
      outer
        .querySelector('[data-route="fittingHistory"]')
        .classList[
          Object.keys(store.data.tryOnHistory).length ? 'remove' : 'add'
        ]('mmltov1--disabled');
      outer
        .querySelector('[data-route="myPurchases"]')
        .classList[Object.keys(store.data.cart).length ? 'remove' : 'add']('mmltov1--disabled');
    };
  }

  function MyAccountEmailController() {
    let outer = null;
    let btn = null;
    let input = null;

    const updateBtnState = () =>
      btn.classList[(input.value || '').trim() ? 'remove' : 'add']('mmltov1--disabled');

    this.init = function () {
      outer = nodes.myAccountEmail.node;
      btn = outer.querySelector('.mmltov1-btn-primary');
      input = outer.querySelector('.mmltov1-account-email__field');

      outer.querySelector('.mmltov1-modal__heading-back').addEventListener('click', () => {
        core.switchToStage(STAGES.MY_ACCOUNT);
      });

      btn.addEventListener('click', () => {
        store.set('email', input.value);
      });

      input.addEventListener('input', updateBtnState);
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.MY_ACCOUNT_EMAIL, outer);
      input.value = store.data.email;
      updateBtnState();
    };
  }

  function PrivacyPolicySettingsController() {
    let outer = null;

    this.init = function () {
      outer = nodes.privacyPolicySettingsModal.node;

      outer.querySelector('.mmltov1-modal__heading-back').addEventListener('click', () => {
        core.switchToStage(STAGES.SETTINGS);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.PRIVACY_POLICY_SETTINGS, outer);
    };
  }

  function MyPurchasesController() {
    let outer = null;
    let items = null;

    const renderItems = () => {
      items.innerHTML = store.data.cart.reduce(
        (acc, item) => `
          ${acc}
          <div class="mmltov1-my-purchases__item">
            <div class="mmltov1-my-purchases__item-img">
              <img src="${item.t}" />
            </div>
            <div>
              <div class="mmltov1-my-purchases__item-title">Balmain</div>
              <div class="mmltov1-my-purchases__item-desc">Black leather jacket</div>
              <div class="mmltov1-my-purchases__item-params">
                <div class="mmltov1-my-purchases__item-param">Size: <span>M</span></div>
                <div class="mmltov1-my-purchases__item-param">Price: <span>1499€</span></div>
              </div>
            </div>
          </div>
        `,
        ''
      );
    };

    this.init = function () {
      outer = nodes.myPurchases.node;
      items = outer.querySelector('.mmltov1-my-purchases__items');

      outer.querySelector('.mmltov1-modal__heading-back').addEventListener('click', () => {
        core.switchToStage(STAGES.MY_ACCOUNT);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.MY_PURCHASES, outer);
      renderItems();
    };
  }

  function FittingHistoryController() {
    let outer = null;
    let slides = null;

    const months = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ];
    const ordinal = (t) => {
      const e = ['th', 'st', 'nd', 'rd'];
      const n = t % 100;
      return e[(n - 20) % 10] || e[n] || e[0];
    };
    const getDateLabel = (time) => {
      const d = new Date(parseInt(time));
      const day = d.getDate();

      return `${(day <= 9 ? '0' : '') + day}${ordinal(day)} ${months[d.getMonth()]}`;
    };

    const renderList = () => {
      const groups = Object.entries(store.data.tryOnHistory).reduce((acc, [time, url]) => {
        const label = getDateLabel(time);
        acc[label] = acc[label] || [];
        acc[label].push(url);
        return acc;
      }, {});

      slides.innerHTML = Object.entries(groups).reduce(
        (acc, [date, urls]) => `
          ${acc}
          <div class="mmltov1-fitting-history__slides-group-heading"><span>${date}</span></div>
          ${urls.reduce((acc, url) => `${acc}<div class="mmltov1-fitting-history__slide"><img src="${url}" /></div>`, '')}
        `,
        ''
      );
    };

    this.init = function () {
      outer = nodes.fittingHistory.node;
      slides = outer.querySelector('.mmltov1-fitting-history__slides');

      outer.querySelector('.mmltov1-fitting-history__back').addEventListener('click', () => {
        core.switchToStage(STAGES.MY_ACCOUNT);
      });
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.FITTING_HISTORY, outer);
      renderList();
    };
  }

  function DeleteAccountController() {
    let outer = null;

    this.init = function () {
      outer = nodes.deleteAccount.node;

      const back = () => core.switchToStage(STAGES.MY_ACCOUNT);

      outer.querySelector('.mmltov1-modal__heading-back').addEventListener('click', back);

      const buttons = outer.querySelector('.mmltov1-delete-account__buttons');

      buttons.querySelector('.mmltov1-btn-secondary').addEventListener('click', () => {
        store.reset();
        core.initSession().then(() => core.switchToStage(STAGES.INTRO));
      });

      buttons.querySelector('.mmltov1-btn-primary').addEventListener('click', back);
    };

    this.render = function () {
      core.replaceContentInModal(STAGES.DELETE_ACCOUNT, outer);
    };
  }

  const RangeSlider = (() => {
    const RangeSlider = function (conf) {
      this.input = null;
      this.inputDisplay = null;
      this.slider = null;
      this.pointers = null;
      this.valueNode = null;
      this.sliderWidth = 0;
      this.sliderLeft = 0;
      this.pointerWidth = 0;
      this.pointerR = null;
      this.pointerL = null;
      this.activePointer = null;
      this.selected = null;
      this.scale = null;
      this.step = 0;
      this.tipL = null;
      this.tipR = null;
      this.timeout = null;
      this.valRange = false;

      this.values = {
        start: null,
        end: null
      };
      this.conf = {
        target: null,
        values: null,
        set: null,
        scaleItems: null,
        step: null,
        label: null,
        unitLabel: null,
        onChange: null
      };

      for (const i in this.conf) {
        if (conf.hasOwnProperty(i)) {
          this.conf[i] = conf[i];
        }
      }

      this.init();
    };

    RangeSlider.prototype.init = function () {
      this.input = this.conf.target;
      this.inputDisplay = getComputedStyle(this.input, null).display;
      this.input.style.display = 'none';
      this.valRange = !(this.conf.values instanceof Array);

      if (this.valRange) {
        if (!this.conf.values.hasOwnProperty('min') || !this.conf.values.hasOwnProperty('max')) {
          return console.log('Missing min or max value...');
        }
      }

      return this.createSlider();
    };

    RangeSlider.prototype.createSlider = function () {
      const container = document.createElement('div');

      container.innerHTML = `
        <div class="mmltov1-range-slider">
          <div class="mmltov1-range-slider__labels">
            <div class="mmltov1-range-slider__labels-label">${this.conf.label}</div>
            <div class="mmltov1-range-slider__labels-value">
            <span>0</span> ${this.conf.unitLabel}
            </div>
          </div>
          <div class="mmltov1-range-slider__scale"></div>
          <div class="mmltov1-range-slider__stripe">
            <div class="mmltov1-range-slider__stripe-default"></div>
            <div class="mmltov1-range-slider__stripe-selected"></div>
            <div class="mmltov1-range-slider__stripe-pointer" data-dir="left"></div>
          </div>
        </div>
      `;

      this.slider = container.children[0];
      this.selected = this.slider.querySelector('.mmltov1-range-slider__stripe-selected');
      this.pointerL = this.slider.querySelector('.mmltov1-range-slider__stripe-pointer');
      this.scale = this.slider.querySelector('.mmltov1-range-slider__scale');
      this.pointers = this.slider.querySelectorAll('.mmltov1-range-slider__stripe-pointer');
      this.valueNode = this.slider.querySelector('.mmltov1-range-slider__labels-value span');

      this.input.parentNode.insertBefore(this.slider, this.input.nextSibling);

      this.sliderLeft = this.slider.getBoundingClientRect().left;
      this.sliderWidth = this.slider.clientWidth;
      this.pointerWidth = this.pointerL.clientWidth;

      return this.setInitialValues();
    };

    RangeSlider.prototype.setInitialValues = function () {
      if (this.valRange) {
        this.conf.values = this.prepareArrayValues(this.conf);
      }

      this.values.start = 0;
      this.values.end = 0;

      if (this.conf.set && this.conf.set.length && this.checkInitial(this.conf)) {
        this.values.end = this.conf.values.indexOf(this.conf.set[0]);
      }

      return this.createScale();
    };

    RangeSlider.prototype.createScale = function () {
      this.step = this.sliderWidth / (this.conf.values.length - 1);
      const iLen = this.conf.scaleItems !== null ? this.conf.scaleItems : this.conf.values.length;

      for (let i = 0; i < iLen; ++i) {
        this.scale.appendChild(document.createElement('span'));
      }

      return this.addEvents();
    };

    RangeSlider.prototype.addEvents = function () {
      const pieces = this.scale.querySelectorAll('span');

      this.createEvents(document, 'mousemove touchmove', this.move.bind(this));
      this.createEvents(document, 'mouseup touchend touchcancel', this.drop.bind(this));

      for (var i = 0, iLen = this.pointers.length; i < iLen; i++) {
        this.createEvents(this.pointers[i], 'mousedown touchstart', this.drag.bind(this));
      }

      for (var i = 0, iLen = pieces.length; i < iLen; i++) {
        this.createEvents(pieces[i], 'click', this.onClickPiece.bind(this));
      }

      window.addEventListener('resize', this.onResize.bind(this));

      return this.setValues();
    };

    RangeSlider.prototype.drag = function (e) {
      e.preventDefault();

      this.activePointer = this.pointerL;

      return this.slider.classList.add('sliding');
    };

    RangeSlider.prototype.move = function (e) {
      if (this.activePointer) {
        const coordX = e.type === 'touchmove' ? e.touches[0].clientX : e.pageX;
        let index = coordX - this.sliderLeft - this.pointerWidth / 2;

        index = Math.round(index / this.step);

        if (index <= 0) {
          index = 0;
        }

        if (index > this.conf.values.length - 1) {
          index = this.conf.values.length - 1;
        }

        this.values.end = index;

        return this.setValues();
      }
    };

    RangeSlider.prototype.drop = function () {
      this.activePointer = null;
    };

    RangeSlider.prototype.setValues = function (start, end) {
      const activePointer = 'end';

      if (start && this.conf.values.indexOf(start) > -1) {
        this.values[activePointer] = this.conf.values.indexOf(start);
      }

      if (end && this.conf.values.indexOf(end) > -1) {
        this.values.end = this.conf.values.indexOf(end);
      }

      this.pointerL.style.left =
        this.values[activePointer] * this.step - this.pointerWidth / 2 + 'px';

      this.input.value = this.conf.values[this.values.end];

      if (this.values.end > this.conf.values.length - 1) {
        this.values.end = this.conf.values.length - 1;
      }

      if (this.values.start < 0) {
        this.values.start = 0;
      }

      this.selected.style.width = (this.values.end - this.values.start) * this.step + 'px';
      this.selected.style.left = this.values.start * this.step + 'px';

      return this.onChange();
    };

    RangeSlider.prototype.onClickPiece = function (e) {
      let idx = Math.round((e.clientX - this.sliderLeft) / this.step);

      if (idx > this.conf.values.length - 1) {
        idx = this.conf.values.length - 1;
      }

      if (idx < 0) {
        idx = 0;
      }

      this.values.end = idx;

      this.slider.classList.remove('sliding');

      return this.setValues();
    };

    RangeSlider.prototype.onChange = function () {
      this.valueNode.innerHTML = this.input.value;

      if (this.conf.onChange) {
        this.conf.onChange(parseInt(this.input.value));
      }
    };

    RangeSlider.prototype.onResize = function () {
      this.sliderLeft = this.slider.getBoundingClientRect().left;
      this.sliderWidth = this.slider.clientWidth;
      return this.setValues();
    };

    RangeSlider.prototype.getValue = function () {
      return this.input.value;
    };

    RangeSlider.prototype.destroy = function () {
      this.input.style.display = this.inputDisplay;
      this.slider.remove();
    };

    RangeSlider.prototype.createEvents = function (el, ev, callback) {
      var events = ev.split(' ');

      for (var i = 0, iLen = events.length; i < iLen; i++) {
        el.addEventListener(events[i], callback);
      }
    };

    RangeSlider.prototype.prepareArrayValues = function (conf) {
      const values = [];
      const range = conf.values.max - conf.values.min;

      if (!conf.step) {
        return [conf.values.min, conf.values.max];
      }

      for (var i = 0, iLen = range / conf.step; i < iLen; i++) {
        values.push(conf.values.min + i * conf.step);
      }

      if (values.indexOf(conf.values.max) < 0) {
        values.push(conf.values.max);
      }

      return values;
    };

    RangeSlider.prototype.checkInitial = function (conf) {
      if (!conf.set || conf.set.length < 1) {
        return null;
      }

      if (conf.values.indexOf(conf.set[0]) < 0) {
        return null;
      }

      return true;
    };

    return RangeSlider;
  })();

  function Store() {
    const LOCALSTORAGE_KEY = 'mmltov1';
    const getDefaultData = () => ({
      token: null,
      stage: STAGES.INTRO,
      gender: GENDERS.FEMALE,
      height: 150,
      weight: 50,
      chestCircumference: 120,
      waistCircumference: 64,
      hipCircumference: 96,
      size: '42',
      bellyShape: 'flat',
      figureType: 'pear',
      modelUrl: null,
      tryOnlUrl: null,
      clothType: null,
      favorites: [],
      cart: [],
      selectedOuterwear: null,
      selectedTops: null,
      selectedBottoms: null,
      backTo: null,
      email: null,
      tryOnHistory: {}
    });

    this.data = getDefaultData();

    this.load = function () {
      try {
        const stored = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));

        Object.keys(stored).forEach((key) => {
          this.data[key] = stored[key];
        });
      } catch (e) {}
    };

    this.save = function () {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(this.data));
    };

    this.set = function (key, value) {
      this.data[key] = value;
      this.save();
    };

    this.reset = function () {
      this.data = getDefaultData();
      this.save();
    };

    this.load();
  }

  console.log('Try to init status: ', document.readyState);

  if (document.readyState === 'complete') {
    core.init();
  } else {
    const checkInterval = setInterval(() => {
      if (document.readyState === 'complete') {
        clearInterval(checkInterval);
        core.init();
      }
    }, 100);
    // setTimeout(core.init, 2000);
    // document.addEventListener('DOMContentLoaded', core.init);
  }
})();
