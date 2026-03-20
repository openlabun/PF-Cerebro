## Frontend React

`Diseno/IyR/Frontend` ahora está migrado a React con Vite.

### Desarrollo

```bash
npm install
npm run dev
```

### Producción

```bash
npm run build
npm run preview
```

### Estructura principal

```text
Frontend/
|- assets/css/styles.css
|- src/
|  |- App.jsx
|  |- api.js
|  |- main.jsx
|  |- sudoku-lib.js
|  `- sudoku.js
|- Dockerfile
|- index.html
|- nginx.conf
|- package.json
`- vite.config.js
```

### Nota

- `assets/js/` quedó como referencia del frontend anterior.
- La nueva entrada de la app es `src/main.jsx`.
