import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

/*
 * Линтер здесь ради одного правила — rules-of-hooks.
 *
 * Хук, объявленный после раннего return, не регистрируется на тех рендерах,
 * которые до него не доходят. Как только условие меняется, число хуков между
 * рендерами скачет, и React роняет ВСЁ приложение в белый экран — без единого
 * слова в интерфейсе. Ровно так у нас сломался вход: после возврата от Яндекса
 * сессия подтверждалась, ранний выход исчезал, и появлялся «лишний» хук.
 *
 * TypeScript этого не видит: типы там корректные. Ловится только линтером,
 * поэтому он и появился.
 */
export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/*.config.*"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Порядок хуков — не стилистика, а падение прода. Только ошибка.
      "react-hooks/rules-of-hooks": "error",
      // Зависимости — предупреждение: местами они осознанно урезаны.
      "react-hooks/exhaustive-deps": "warn",
      // Лишние перерисовки, а не падение: 8 таких мест написаны до линтера,
      // разгребаются отдельно. Держим видимыми, но не блокируем ими сборку.
      "react-hooks/set-state-in-effect": "warn",
      // Подчёркивание — принятый способ сказать «эта переменная выброшена
      // намеренно» (например, при удалении ключа через деструктуризацию).
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      // Шум, не связанный с задачей линтера здесь.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
