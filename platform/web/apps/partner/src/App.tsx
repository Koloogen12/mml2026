import { useEffect } from "react";
import { usePartner } from "./store";
import { Marketing } from "./surfaces/Marketing";
import { Apply } from "./surfaces/Apply";
import { Cabinet } from "./surfaces/Cabinet";

// Три поверхности партнёра (в оригинальном хендоффе — три страницы, связанные
// ссылками): маркетинг «For Partners» → вход «Partner Apply» → «Partner Cabinet».
// Простое переключение по surface-стейту (без роутера, как в buyer).
export default function App() {
  const surface = usePartner((s) => s.surface);
  const authChecked = usePartner((s) => s.authChecked);

  // Пытаемся поднять сессию из refresh-cookie до первого рендера поверхности,
  // иначе вошедший партнёр на миг видит лендинг, а при отказе — навсегда.
  useEffect(() => {
    void usePartner.getState().init();
  }, []);

  if (!authChecked) return null;
  if (surface === "auth") return <Apply />;
  if (surface === "cabinet") return <Cabinet />;
  return <Marketing />;
}
