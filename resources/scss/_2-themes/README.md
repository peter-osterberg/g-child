# Bakgrunder och teman

Varje tema äger en obligatorisk canvasfärg och sitt färgschema:

```scss
$themes: (
  'light': (
    'bg-canvas': var(--neutral-50),
    'color-scheme': light,
  ),
  'dark': (
    'bg-canvas': var(--neutral-950),
    'color-scheme': dark,
  ),
  'pink': (
    'bg-canvas': var(--red-100),
    'color-scheme': light,
    'text-1': var(--red-950),
  ),
);
```

Exemplet visar strukturen. Projektets faktiska färgval finns i `_2-themes/_tokens.scss`.

- `$colors` innehåller paletten.
- `$theme-colors` innehåller gemensamma semantiska färger. Light/Dark-par använder `light-dark()`.
- `$themes` innehåller canvas, färgschema och endast färgavvikelser från valt basmode. Ingen separat `$canvases` behövs.

SCSS genererar färgprover, canvas-klasser och `data-theme`-regler från `$themes`. Light behåller `.bg-canvas`; övriga teman får exempelvis `.bg-canvas-dark` och `.bg-canvas-pink`. `data-theme="pink"` sätter temat utan att måla bakgrunden. Canvas-klassen applicerar även bakgrundsfärgen.

Gemensamma färgdefinitioner skrivs i en enda regel för root och temagränser. De återställer nästlade färgavvikelser och binder alias till det lokala temat. Varje temas egen regel innehåller canvas, `color-scheme`, färgavvikelser och eventuella ändrade SVG-bilder. Formulärens Light/Dark-bilder delas mellan teman med samma färgschema.

## Figma-export

Light och Dark är basmodes. För varje extra mode jämför exporten dess färgvärden med båda baserna och väljer den med flest matchningar; Light väljs vid lika resultat. Temat får alltid sin `bg-canvas` och basens `color-scheme`. Övriga värden exporteras bara när de skiljer sig från basen. Ett mode utan `bg/canvas` ger exportfel.

Komponentimportören importerar komponentmaps och gemensamma skalor till `_shared-tokens.scss`. Globala färgmaps förs över till `_2-themes/_tokens.scss` separat.

## Lägga till ett tema

1. Lägg till temat med `bg-canvas`, `color-scheme` och eventuella färgavvikelser i `$themes`.
2. Registrera bakgrundsval och översatt etikett i `Style_Options::color_picker_options()`.

`Child_Functions::css_classes_relationship()` applicerar canvas-klassen på sidbyggarens komponenter. `css_variables_relationship()` tar bort G-Themes egna färgregler för canvas-val.

Kör `node console/check-theme-colors.mjs` för kontroller av temaregler, canvas, färgavvikelser, alias, SVG-bilder och nästlade teman. Kontrollera kontrast och nästlade teman i webbläsaren när färger ändras.
