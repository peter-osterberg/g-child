# Bakgrunder och teman

Redaktören väljer en bakgrund i sidbyggaren. PHP lägger på motsvarande canvas-klass och SCSS väljer tema och färger.

| Bakgrund | Klass | Tema |
| --- | --- | --- |
| Standard | `bg-canvas` | `light` |
| Mörk | `bg-canvas-dark` | `dark` |
| Rosa | `bg-canvas-pink` | `pink` |

```html
<section class="bg-canvas-dark">
  <!-- Mörk bakgrund och dark-temats färger för text och komponenter. -->
  <div class="bg-canvas">
    <!-- Ljus bakgrund och återställda light-färger. -->
  </div>
</section>
```

## Ansvar

- `$colors` i `_1-lib/_tokens.scss` innehåller paletten.
- `$theme-colors` innehåller semantiska färger. Nycklar som börjar med `bg-canvas` genererar bakgrundsklasser.
- `$themes` anger varje temas `color-scheme` och färgavvikelser. Alla färgnycklar måste finnas i `$theme-colors`.
- `$theme-by-background` kopplar canvas-nycklar till teman. Varje canvas ska ha en koppling till ett registrerat tema; annars avbryts kompileringen.
- `Style_Options::color_picker_options()` registrerar bakgrundsval med samma nycklar som i `$theme-colors`.
- `Child_Functions::css_classes_relationship()` lägger till canvas-klassen på sektioner, rader, kolumner och moduler.
- `Child_Functions::css_variables_relationship()` tar bort G-Themes egna färgregler för canvas-val. Klassen styr `--bg-color`, `background-color` och `color: var(--text-1)`.

Temavärden återställs vid varje ny canvas-gräns. Det gör att nästlade sektioner får rätt färger även när ett yttre tema har egna avvikelser. Övriga färgval behåller G-Themes vanliga rendering.

`data-theme="dark"` kan fortfarande användas manuellt för att välja tema. Sidbyggarens canvas-val behöver inget extra attribut.

## Lägga till en bakgrund

1. Lägg till en `bg-canvas…`-nyckel i `$theme-colors`.
2. Koppla samma nyckel till ett tema i `$theme-by-background`.
3. Lägg till samma nyckel och en översatt etikett i `color_picker_options()`.

Kontrollera kontrast och nästlade ljusa/mörka sektioner i webbläsaren när färger ändras. Äldre sparade `background-1`–`background-4`-val behöver väljas om; ingen innehållsmigrering görs automatiskt.
