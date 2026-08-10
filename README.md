# THE B JAPAN — fan archive

Statyczna strona przygotowana do publikacji przez GitHub Pages. Zdjęcia, filmy i dokumenty są pobierane z publicznego folderu Google Drive i nie są kopiowane do repozytorium.

## Pierwsze uruchomienie

1. Wgraj całą zawartość folderu do nowego repozytorium GitHub.
2. Dodaj w `Settings → Secrets and variables → Actions` sekret `GOOGLE_DRIVE_API_KEY`.
3. W Google Cloud ogranicz klucz wyłącznie do `Google Drive API`; nie ustawiaj ograniczenia aplikacji typu `Websites`, ponieważ zapytania wykonuje GitHub Actions.
4. Ustaw `Settings → Actions → General → Workflow permissions → Read and write permissions`.
5. Ustaw `Settings → Pages → Source → GitHub Actions`.
6. Uruchom `Actions → Update THE B JAPAN archive → Run workflow`.

## Automatyczna synchronizacja

Workflow `.github/workflows/update-the-b-japan.yml` uruchamia się codziennie o `03:41 UTC` i `15:41 UTC`, czyli co 12 godzin. Odczytuje całe drzewo publicznego folderu Drive, aktualizuje `data.js`, dodaje podstrony nowych folderów głównych i publikuje stronę.

## Struktura

- Pierwszy poziom folderów Drive tworzy podstrony.
- Drugi poziom tworzy galerie.
- Dalsze podfoldery tworzą sekcje w galerii.
- Zdjęcia można otwierać i pobierać.
- Filmy można odtwarzać bezpośrednio na stronie, otwierać w Drive i pobierać.
- Dokumenty Q&A są udostępniane jako klikalne karty.
- Dwa dokumenty Google Docs w kolekcji Q&A mają osobne kafelki `Q&A Counseling Corner` i `Q&A`. Po otwarciu ich aktualna treść jest wczytywana bezpośrednio z Google Docs, dlatego edycje dokumentów nie wymagają ponownego generowania strony. Dokumenty muszą zachować publiczny dostęp `Każdy, kto ma link → Wyświetlający`.

Nie edytuj ręcznie `data.js` ani wygenerowanych podstron. Wygląd zmieniaj w `styles.css`, a działanie w `landing.js` i `gallery.js`.
